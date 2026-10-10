/**
 * In-memory and file-backed collision-safe atomic registry for Living Book Press copies.
 * Conforms to the Packet-Backed Projection pattern.
 */

import fs from 'node:fs';
import path from 'node:path';

export class LivingBookRegistry {
  constructor(options = {}) {
    this.storageDir = options.storageDir || null;
    this.records = new Map(); // copy_id -> record
    this.counters = new Map(); // book_id:edition_id -> number
    this._load();
  }

  _getStoragePath(bookId) {
    if (!this.storageDir) return null;
    return path.join(this.storageDir, `press-registry-${bookId}.json`);
  }

  _load() {
    if (!this.storageDir || !fs.existsSync(this.storageDir)) return;
    try {
      const files = fs.readdirSync(this.storageDir).filter(f => f.startsWith('press-registry-') && f.endsWith('.json'));
      for (const f of files) {
        const fullPath = path.join(this.storageDir, f);
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (Array.isArray(data.records)) {
          for (const rec of data.records) {
            this.records.set(rec.copy_id, rec);
            const key = `${rec.book_id}:${rec.edition_id}`;
            const parts = rec.copy_id.split('-C');
            if (parts.length === 2) {
              const num = parseInt(parts[1], 10);
              const cur = this.counters.get(key) || 0;
              if (num > cur) this.counters.set(key, num);
            }
          }
        }
      }
    } catch (e) {
      throw new Error(`Living Book registry load failed: ${e.message}`, { cause: e });
    }
  }

  _persist(bookId) {
    if (!this.storageDir) return;
    fs.mkdirSync(this.storageDir, { recursive: true });
    const outPath = this._getStoragePath(bookId);
    const bookRecords = Array.from(this.records.values()).filter(r => r.book_id === bookId);
    const temp = outPath + '.' + process.pid + '.' + Date.now() + '.tmp';
    try {
      const fd = fs.openSync(temp, 'wx', 0o600);
      try {
        fs.writeFileSync(fd, JSON.stringify({ book_id: bookId, updated_at: new Date().toISOString(), records: bookRecords }, null, 2));
        fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
      fs.renameSync(temp, outPath);
      const dir = fs.openSync(this.storageDir, 'r');
      try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
    } finally {
      try { fs.unlinkSync(temp); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
  }

  _withLock(action) {
    if (!this.storageDir) return action();
    fs.mkdirSync(this.storageDir, { recursive: true });
    const lock = path.join(this.storageDir, '.living-book-registry.lock');
    // Fail closed on contention: callers may retry, never allocate speculatively.
    fs.mkdirSync(lock);
    try {
      this.records.clear();
      this.counters.clear();
      this._load();
      return action();
    } finally {
      fs.rmdirSync(lock);
    }
  }

  reserveCopy(buildRecord) {
    return this._withLock(() => {
      // Reserve identity and persist the RESERVED record within one exclusive section.
      const metadata = buildRecord((bookId, editionId, prefix) => this.allocateCopyId(bookId, editionId, prefix));
      if (!metadata || !metadata.copy_id) throw new Error('Invalid reservation');
      if (this.records.has(metadata.copy_id)) throw new Error('Duplicate copy_id');
      this.saveRecord(metadata);
      return metadata;
    });
  }

  /**
   * Atomically allocates a new collision-safe copy_id for a given book and edition.
   */
  allocateCopyId(bookId, editionId, prefix = 'BK') {
    const key = `${bookId}:${editionId}`;
    const nextNum = (this.counters.get(key) || 0) + 1;
    this.counters.set(key, nextNum);

    // Extract clean date from editionId (e.g. "2026-09-17-anniversaire" -> "20260917")
    const dateMatch = editionId.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
    const dateStr = dateMatch ? `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}` : 'GENERIC';
    const numStr = String(nextNum).padStart(4, '0');

    return `${prefix.toUpperCase()}-${dateStr}-C${numStr}`;
  }

  /**
   * Saves or updates a copy record atomically.
   */
  saveRecord(record) {
    if (!record || !record.copy_id) {
      throw new Error('Invalid record: missing copy_id');
    }
    if (this.storageDir && !fs.existsSync(path.join(this.storageDir, '.living-book-registry.lock'))) {
      return this._withLock(() => this.saveRecord(record));
    }
    this.records.set(record.copy_id, { ...record });
    this._persist(record.book_id);
    return this.records.get(record.copy_id);
  }

  /**
   * Retrieves a copy record by copy_id.
   */
  getRecord(copyId) {
    return this.records.get(copyId) || null;
  }

  /**
   * Lists records with optional filtering.
   */
  listRecords(filter = {}) {
    let list = Array.from(this.records.values());
    if (filter.bookId) list = list.filter(r => r.book_id === filter.bookId);
    if (filter.editionId) list = list.filter(r => r.edition_id === filter.editionId);
    if (filter.status) list = list.filter(r => r.status === filter.status);
    if (filter.singularization) list = list.filter(r => r.singularization === filter.singularization);
    return list;
  }

  /**
   * Updates status of an existing copy record.
   */
  updateStatus(copyId, newStatus, extra = {}) {
    const rec = this.getRecord(copyId);
    if (!rec) throw new Error(`Copy not found: ${copyId}`);
    rec.status = newStatus;
    Object.assign(rec, extra);
    this.records.set(copyId, rec);
    this._persist(rec.book_id);
    return rec;
  }

  /**
   * Appends an event to the biography of a copy.
   */
  addBiographyEvent(copyId, event) {
    const rec = this.getRecord(copyId);
    if (!rec) throw new Error(`Copy not found: ${copyId}`);
    if (!rec.biography) rec.biography = {};
    if (!Array.isArray(rec.biography.events)) rec.biography.events = [];
    rec.biography.events.push({
      ...event,
      timestamp: event.timestamp || new Date().toISOString()
    });
    this.records.set(copyId, rec);
    this._persist(rec.book_id);
    return rec;
  }

  /**
   * Exports an audit summary for a given book or all books.
   */
  exportAudit(bookId = null) {
    const list = this.listRecords(bookId ? { bookId } : {});
    return {
      exported_at: new Date().toISOString(),
      total_copies: list.length,
      by_status: list.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {}),
      by_singularization: list.reduce((acc, r) => {
        acc[r.singularization] = (acc[r.singularization] || 0) + 1;
        return acc;
      }, {}),
      records: list
    };
  }
}
