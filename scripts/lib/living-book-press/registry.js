/**
 * Transactional Living Book registry (Node 24 node:sqlite).
 * Single-host local filesystem only; remote/shared filesystem is unsupported.
 * The SQLite transaction owns allocation, lifecycle and biography changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export class LivingBookRegistry {
  constructor(options = {}) {
    this.storageDir = options.storageDir || null;
    if (this.storageDir) {
      fs.mkdirSync(this.storageDir, { recursive: true });
      // Existing JSON registries need a reviewed one-time migration. Never reset counters silently.
      if (fs.readdirSync(this.storageDir).some(name => /^press-registry-.*\.json$/.test(name))) {
        throw new Error('Legacy JSON registry detected: migration required before transactional issuance');
      }
    }
    this.db = new DatabaseSync(this.storageDir ? path.join(this.storageDir, 'living-book-press.sqlite') : ':memory:');
    this.db.exec('PRAGMA busy_timeout = 5000');
    this.db.exec('PRAGMA synchronous = FULL');
    if (this.storageDir) this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS copies (
        copy_id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        edition_id TEXT NOT NULL,
        record_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS copies_by_edition ON copies(book_id, edition_id);
      CREATE TABLE IF NOT EXISTS counters (
        book_id TEXT NOT NULL,
        edition_id TEXT NOT NULL,
        serial INTEGER NOT NULL,
        PRIMARY KEY (book_id, edition_id)
      );
    `);
    this._transactionDepth = 0;
  }

  _transaction(fn) {
    if (this._transactionDepth) return fn();
    this.db.exec('BEGIN IMMEDIATE');
    this._transactionDepth++;
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      try { this.db.exec('ROLLBACK'); } catch { /* preserve primary failure */ }
      throw error;
    } finally { this._transactionDepth--; }
  }

  _allocateCopyId(bookId, editionId, prefix = 'BK') {
    if (!this._transactionDepth) throw new Error('Copy allocation requires a transaction');
    const key = { bookId, editionId };
    this.db.prepare(`INSERT INTO counters(book_id, edition_id, serial)
      VALUES (?, ?, 1) ON CONFLICT(book_id, edition_id)
      DO UPDATE SET serial = serial + 1`).run(key.bookId, key.editionId);
    const serial = this.db.prepare('SELECT serial FROM counters WHERE book_id=? AND edition_id=?')
      .get(bookId, editionId).serial;
    const match = editionId.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
    const dateStr = match ? `${match[1]}${match[2]}${match[3]}` : 'GENERIC';
    return `${prefix.toUpperCase()}-${dateStr}-C${String(serial).padStart(4, '0')}`;
  }

  allocateCopyId() {
    throw new Error('Use reserveCopy: allocation must be committed with a RESERVED record');
  }

  _saveRecord(record, existing = false) {
    if (!record?.copy_id || !record?.book_id || !record?.edition_id) throw new Error('Incomplete registry record');
    const serialized = JSON.stringify(record);
    if (existing) {
      const current = this.getRecord(record.copy_id);
      if (!current) throw new Error('Cannot update unknown copy');
      if (current.book_id !== record.book_id || current.edition_id !== record.edition_id)
        throw new Error('Cannot change copy identity');
      this.db.prepare('UPDATE copies SET record_json=? WHERE copy_id=?')
        .run(serialized, record.copy_id);
    } else {
      this.db.prepare('INSERT INTO copies(copy_id, book_id, edition_id, record_json) VALUES (?, ?, ?, ?)')
        .run(record.copy_id, record.book_id, record.edition_id, serialized);
    }
    return record;
  }

  reserveCopy(buildRecord) {
    return this._transaction(() => {
      let called = false;
      const record = buildRecord((bookId, editionId, prefix) => {
        if (called) throw new Error('Only one copy allocation per reservation');
        called = true;
        return this._allocateCopyId(bookId, editionId, prefix);
      });
      if (!called || !record?.copy_id || record.status !== 'RESERVED')
        throw new Error('Invalid reservation');
      return this._saveRecord(record);
    });
  }

  saveRecord(record) {
    return this._transaction(() => this._saveRecord(record, Boolean(this.getRecord(record.copy_id))));
  }

  updateRecord(copyId, updater) {
    return this._transaction(() => {
      const old = this.getRecord(copyId);
      if (!old) throw new Error(`Copy not found: ${copyId}`);
      const next = updater(structuredClone(old));
      if (!next || next.copy_id !== copyId || next.book_id !== old.book_id || next.edition_id !== old.edition_id)
        throw new Error('Cannot change copy identity');
      return this._saveRecord(next, true);
    });
  }

  getRecord(copyId) {
    const row = this.db.prepare('SELECT record_json FROM copies WHERE copy_id=?').get(copyId);
    return row ? JSON.parse(row.record_json) : null;
  }

  listRecords(filter = {}) {
    const where = [], args = [];
    for (const [field, value] of [['bookId', filter.bookId], ['editionId', filter.editionId]]) {
      if (value !== undefined) { where.push((field === 'bookId' ? 'book_id' : 'edition_id') + '=?'); args.push(value); }
    }
    const sql = 'SELECT record_json FROM copies' + (where.length ? ' WHERE ' + where.join(' AND ') : '');
    let records = this.db.prepare(sql).all(...args).map(row => JSON.parse(row.record_json));
    if (filter.status) records = records.filter(r => r.status === filter.status);
    if (filter.singularization) records = records.filter(r => r.singularization === filter.singularization);
    return records;
  }

  updateStatus(copyId, newStatus, extra = {}) {
    return this.updateRecord(copyId, record => ({...record, ...extra, status: newStatus}));
  }

  addBiographyEvent(copyId, event) {
    return this.updateRecord(copyId, record => ({
      ...record,
      biography: {
        ...(record.biography || {}),
        events: [...(record.biography?.events || []),
          { ...event, timestamp: event.timestamp || new Date().toISOString() }]
      }
    }));
  }

  exportAudit(bookId = null) {
    const list = this.listRecords(bookId ? {bookId} : {});
    return {
      exported_at: new Date().toISOString(),
      total_copies: list.length,
      by_status: list.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {}),
      by_singularization: list.reduce((a, r) => (a[r.singularization] = (a[r.singularization] || 0) + 1, a), {}),
      records: list
    };
  }

  close() { this.db.close(); }
}
