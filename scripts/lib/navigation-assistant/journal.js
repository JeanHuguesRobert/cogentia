/** Local behavioural journal: RAM ring + JSONL on disk. Heartbeats stay off the ring. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SKIP_CODES = new Set(["bridge.ping"]);
export const DEFAULT_MEMORY_CAP = 5000;
export const DEFAULT_PERSIST_CAP = 50_000;
export const FSYNC_EVERY = 32;

export function defaultJournalPath(env = process.env) {
  const configured = String(env.NAV_ASSIST_JOURNAL_PATH || "").trim();
  if (configured.toLowerCase() === "off") return "";
  if (configured) return configured;
  const root = fileURLToPath(new URL("../../../", import.meta.url));
  return path.join(root, ".local", "navigation-assistant-journal.jsonl");
}

function parseLine(line, skip) {
  const text = String(line || "").trim();
  if (!text) return null;
  try {
    const entry = JSON.parse(text);
    if (!entry || typeof entry !== "object") return null;
    if (skip.has(entry.code)) return null;
    return entry;
  } catch {
    return null;
  }
}

export function createJournal(options = {}) {
  const memoryCap = Math.max(1, Number(options.memoryCap || DEFAULT_MEMORY_CAP));
  const persistCap = Math.max(memoryCap, Number(options.persistCap || DEFAULT_PERSIST_CAP));
  const skip = options.skipCodes || SKIP_CODES;
  const filePath = options.path === undefined ? defaultJournalPath(options.env || process.env) : options.path;
  const events = [];
  let sequence = 0;
  let fd = null;
  let writesSinceSync = 0;

  function closeFd() {
    if (fd == null) return;
    try { fs.fsyncSync(fd); } catch { /* ignore */ }
    try { fs.closeSync(fd); } catch { /* ignore */ }
    fd = null;
  }

  function openAppend() {
    if (!filePath) return;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fd = fs.openSync(filePath, "a");
  }

  function rewrite(rows) {
    if (!filePath) return;
    closeFd();
    const tmp = `${filePath}.tmp`;
    fs.writeFileSync(tmp, rows.map((entry) => `${JSON.stringify(entry)}\n`).join(""), "utf8");
    fs.renameSync(tmp, filePath);
    openAppend();
  }

  function load() {
    if (!filePath) return;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    let loaded = [];
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      for (const line of raw.split(/\n/)) {
        const entry = parseLine(line, skip);
        if (entry) loaded.push(entry);
      }
    }
    if (loaded.length > persistCap) loaded = loaded.slice(-persistCap);
    events.length = 0;
    events.push(...loaded.slice(-memoryCap));
    sequence = loaded.reduce((max, entry) => Math.max(max, Number(entry.sequence) || 0), 0);
    if (fs.existsSync(filePath)) {
      const lines = fs.readFileSync(filePath, "utf8").split(/\n/).filter((line) => line.trim());
      if (lines.length > persistCap) rewrite(loaded);
      else openAppend();
    } else {
      openAppend();
    }
  }

  load();

  return {
    events,
    get sequence() { return sequence; },
    path: filePath,
    memoryCap,
    persistCap,
    append(level, code, message, details) {
      if (skip.has(code)) return null;
      sequence += 1;
      const entry = {
        sequence,
        at: new Date().toISOString(),
        level,
        code,
        message: String(message),
        ...(details === undefined ? {} : { details }),
      };
      events.push(entry);
      if (events.length > memoryCap) events.shift();
      if (fd != null) {
        fs.writeSync(fd, `${JSON.stringify(entry)}\n`);
        writesSinceSync += 1;
        if (writesSinceSync >= FSYNC_EVERY) {
          fs.fsyncSync(fd);
          writesSinceSync = 0;
        }
      }
      return entry;
    },
    flush() {
      if (fd != null) {
        fs.fsyncSync(fd);
        writesSinceSync = 0;
      }
    },
    close() {
      this.flush();
      if (filePath && fs.existsSync(filePath)) {
        const loaded = [];
        for (const line of fs.readFileSync(filePath, "utf8").split(/\n/)) {
          const entry = parseLine(line, skip);
          if (entry) loaded.push(entry);
        }
        if (loaded.length > persistCap) rewrite(loaded.slice(-persistCap));
      }
      closeFd();
    },
  };
}
