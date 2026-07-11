import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const MAX_ATTEMPTS = 10;
const DEFAULT_BACKOFF_MS = 60_000;

export function resolveOutboxDir(stateDir) {
  return path.join(path.resolve(stateDir), "outbox", "pending");
}

export function resolveFailedDir(stateDir) {
  return path.join(path.resolve(stateDir), "outbox", "failed");
}

export function ensureOutboxDirs(stateDir) {
  const pending = resolveOutboxDir(stateDir);
  const failed = resolveFailedDir(stateDir);
  fs.mkdirSync(pending, { recursive: true });
  fs.mkdirSync(failed, { recursive: true });
  return { pending, failed };
}

export function enqueueOutbox(stateDir, entry = {}) {
  const { pending } = ensureOutboxDirs(stateDir);
  const now = new Date().toISOString();
  const id = String(entry.id || `edge:${randomUUID()}`).trim();
  const record = {
    id,
    kind: String(entry.kind || "http.post").trim(),
    target: String(entry.target || "unknown").trim(),
    payload: entry.payload && typeof entry.payload === "object" ? entry.payload : {},
    state: "pending",
    attempts: 0,
    next_attempt_at: now,
    created_at: now,
    last_error: null,
  };
  const filePath = path.join(pending, `${id.replace(/[/\\:]/g, "_")}.json`);
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
  return record;
}

function readRecord(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function writeRecord(filePath, record) {
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  fs.renameSync(tmpPath, filePath);
}

export function listPendingOutbox(stateDir, options = {}) {
  const { pending } = ensureOutboxDirs(stateDir);
  const now = new Date().toISOString();
  const limit = Number(options.limit || 20);
  const files = fs.readdirSync(pending).filter(name => name.endsWith(".json"));
  const rows = [];
  for (const name of files) {
    const filePath = path.join(pending, name);
    let record;
    try {
      record = readRecord(filePath);
    } catch {
      continue;
    }
    if (record.state !== "pending") continue;
    if (record.next_attempt_at && record.next_attempt_at > now) continue;
    if (Number(record.attempts || 0) >= MAX_ATTEMPTS) continue;
    rows.push({ ...record, _filePath: filePath });
  }
  rows.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  return rows.slice(0, limit);
}

export function markOutboxInFlight(record) {
  if (!record?._filePath) return { ok: false, error: "missing_file_path" };
  const updated = { ...record, state: "in_flight" };
  delete updated._filePath;
  writeRecord(record._filePath, updated);
  return { ok: true, id: record.id };
}

export function markOutboxDelivered(record) {
  if (!record?._filePath) return { ok: false, error: "missing_file_path" };
  fs.unlinkSync(record._filePath);
  return { ok: true, id: record.id };
}

export function markOutboxFailed(record, error, options = {}) {
  if (!record?._filePath) return { ok: false, error: "missing_file_path" };
  const attempts = Number(record.attempts || 0) + 1;
  const maxAttempts = Number(options.maxAttempts || MAX_ATTEMPTS);
  const state = attempts >= maxAttempts ? "failed" : "pending";
  const backoffMs = Math.min(
    Number(options.backoffMs || DEFAULT_BACKOFF_MS) * (2 ** (attempts - 1)),
    3_600_000,
  );
  const nextAttemptAt = state === "pending"
    ? new Date(Date.now() + backoffMs).toISOString()
    : null;
  const updated = {
    ...record,
    state,
    attempts,
    next_attempt_at: nextAttemptAt,
    last_error: String(error || "delivery_failed").slice(0, 500),
  };
  delete updated._filePath;
  if (state === "failed") {
    const stateRoot = path.dirname(path.dirname(path.dirname(record._filePath)));
    const failedDir = resolveFailedDir(stateRoot);
    const dest = path.join(failedDir, path.basename(record._filePath));
    writeRecord(dest, updated);
    fs.unlinkSync(record._filePath);
  } else {
    writeRecord(record._filePath, updated);
  }
  return { ok: true, id: record.id, attempts, state, next_attempt_at: nextAttemptAt };
}

export function outboxStats(stateDir) {
  const { pending, failed } = ensureOutboxDirs(stateDir);
  const countJson = (dir) => fs.readdirSync(dir).filter(name => name.endsWith(".json")).length;
  return {
    pending: countJson(pending),
    failed: countJson(failed),
  };
}