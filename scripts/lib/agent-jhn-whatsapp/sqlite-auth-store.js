/**
 * Private Baileys authentication state backed by node:sqlite.
 * NOT wired to live transport until a verified migration/cutover.
 * One process/writer only. All crypto material remains local.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { BufferJSON, proto } from '@whiskeysockets/baileys';

const SCHEMA_VERSION = 1;
const KEY_TYPES = new Set([
  'pre-key', 'session', 'sender-key', 'sender-key-memory',
  'app-state-sync-key', 'app-state-sync-version', 'lid-mapping',
  'device-list', 'tctoken', 'identity-key',
]);
const serialize = value => JSON.stringify(value, BufferJSON.replacer);
const deserialize = text => JSON.parse(text, BufferJSON.reviver);
// Baileys' former multi-file store normalizes filenames with these exact rules.
// Retain them as the database key so that imported Signal sessions remain addressable.
export const normalizeLegacySignalId = id => String(id).replace(/\//g, '__').replace(/:/g, '-');

export function openSQLiteAuthStore(file, { create = false } = {}) {
  const resolved = path.resolve(file);
  if (!resolved.endsWith('.sqlite')) throw new Error('auth database must use .sqlite suffix');
  if (fs.existsSync(resolved) && !fs.statSync(resolved).isFile()) throw new Error('auth database is not a regular file');
  if (!create && !fs.existsSync(resolved)) throw new Error('auth database missing (fail closed)');
  const parent = path.dirname(resolved);
  if (!fs.existsSync(parent)) {
    if (!create) throw new Error('auth directory missing (fail closed)');
    fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  }
  fs.chmodSync(parent, 0o700);
  const db = new DatabaseSync(resolved, { timeout: 5000 });
  try {
    fs.chmodSync(resolved, 0o600);
    db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA trusted_schema=OFF;');
    if (create) {
      db.exec(`CREATE TABLE IF NOT EXISTS schema_info(version INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS credentials(id INTEGER PRIMARY KEY CHECK(id=1), value_json TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS signal_keys(type TEXT NOT NULL,id TEXT NOT NULL,value_json TEXT NOT NULL,
          PRIMARY KEY(type,id)) WITHOUT ROWID;`);
      if (!db.prepare('SELECT 1 FROM schema_info LIMIT 1').get()) {
        db.prepare('INSERT INTO schema_info(version) VALUES (?)').run(SCHEMA_VERSION);
      }
    }
    const integrity = db.prepare('PRAGMA quick_check').get();
    if (Object.values(integrity)[0] !== 'ok') throw new Error('auth database integrity check failed');
    const version = db.prepare('SELECT version FROM schema_info').all();
    if (version.length !== 1 || version[0].version !== SCHEMA_VERSION) throw new Error('unsupported auth schema version');
    // Existing DB must have credentials. Creating an empty candidate is allowed,
    // but cannot be used as a live auth state until credentials are imported.
    const selectCreds = db.prepare('SELECT value_json FROM credentials WHERE id=1');
    const writeCreds = db.prepare('INSERT INTO credentials(id,value_json) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value_json=excluded.value_json');
    const readKey = db.prepare('SELECT value_json FROM signal_keys WHERE type=? AND id=?');
    const writeKey = db.prepare('INSERT INTO signal_keys(type,id,value_json) VALUES(?,?,?) ON CONFLICT(type,id) DO UPDATE SET value_json=excluded.value_json');
    const deleteKey = db.prepare('DELETE FROM signal_keys WHERE type=? AND id=?');
    const countKeys = db.prepare('SELECT type,COUNT(*) AS count FROM signal_keys GROUP BY type');
    let closed = false;
    let credentials = selectCreds.get()?.value_json;
    let creds = credentials === undefined ? null : deserialize(credentials);
    function ensureOpen() { if (closed) throw new Error('auth database closed'); }
    function transact(op) {
      ensureOpen();
      db.exec('BEGIN IMMEDIATE');
      try { const result = op(); db.exec('COMMIT'); return result; }
      catch (err) { db.exec('ROLLBACK'); throw err; }
    }
    function validType(type) {
      if (!KEY_TYPES.has(type)) throw new Error('unknown Signal key category');
    }
    const api = {
      state: {
        get creds() { return creds; },
        keys: {
          async get(type, ids) {
            ensureOpen();validType(type);
            const result = {};
            for (const id of ids) {
              const row = readKey.get(type, normalizeLegacySignalId(id));
              let value = row ? deserialize(row.value_json) : null;
              if (type === 'app-state-sync-key' && value) value = proto.Message.AppStateSyncKeyData.fromObject(value);
              result[id] = value;
            }
            return result;
          },
          async set(dataset) {
            transact(() => {
              for (const [type, entries] of Object.entries(dataset)) {
                validType(type);
                for (const [id, value] of Object.entries(entries)) {
                  if (value === null) deleteKey.run(type, normalizeLegacySignalId(id));
                  else writeKey.run(type, normalizeLegacySignalId(id), serialize(value));
                }
              }
            });
          },
        },
      },
      async saveCreds() {
        if (!creds) throw new Error('auth credentials missing');
        transact(() => writeCreds.run(serialize(creds)));
      },
      /** Only for offline candidate import, never generate new credentials implicitly. */
      importCredentials(value) {
        if (!create || creds !== null) throw new Error('import credentials only into an empty candidate');
        transact(() => writeCreds.run(serialize(value)));
        creds = value;
      },
      hasCredentials() { ensureOpen(); return creds !== null; },
      counts() { ensureOpen(); return countKeys.all().map(({type,count})=>({type,count})); },
      integrityCheck() { ensureOpen(); return Object.values(db.prepare('PRAGMA quick_check').get())[0] === 'ok'; },
      checkpoint() { ensureOpen(); db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); },
      close() { if (!closed) { db.close(); closed = true; } },
    };
    return api;
  } catch(err) { db.close(); throw err; }
}
