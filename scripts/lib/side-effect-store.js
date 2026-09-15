/**
 * Durable #171 grant store. Cross-process mint / check / consume.
 * Default file: ~/.cogentia/side-effect-authorization.json
 * Tests: resetAuthorizationStore() switches to memory.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function createMemoryStore() {
  const grants = new Map();
  return {
    kind: "memory",
    putGrant(grant) {
      grants.set(grant.authorization_id, { ...grant, consumed_at: grant.consumed_at || null });
    },
    getGrant(id) {
      const row = grants.get(id);
      return row ? { ...row } : null;
    },
    isConsumed(id) {
      const row = grants.get(id);
      return Boolean(row?.consumed_at);
    },
    markConsumed(id) {
      const row = grants.get(id) || { authorization_id: id };
      row.consumed_at = new Date().toISOString();
      grants.set(id, row);
    },
    reset() {
      grants.clear();
    },
  };
}

export function resolveAuthorizationStorePath(env = process.env) {
  const explicit = String(env.COGENTIA_SEA_STORE_PATH || "").trim();
  if (explicit) return explicit;
  const base = String(env.COGENTIA_OPS_STATE_DIR || env.COGENTIA_STATE_DIR || "").trim()
    || path.join(os.homedir(), ".cogentia");
  return path.join(base, "side-effect-authorization.json");
}

export function createFileStore(filePath) {
  function load() {
    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : { grants: {} };
    } catch {
      return { grants: {} };
    }
  }
  function save(data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    try {
      fs.renameSync(tmp, filePath);
    } catch {
      fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
      try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    }
  }
  return {
    kind: "file",
    path: filePath,
    putGrant(grant) {
      const data = load();
      data.grants = data.grants || {};
      const prev = data.grants[grant.authorization_id] || {};
      data.grants[grant.authorization_id] = {
        ...prev,
        ...grant,
        consumed_at: prev.consumed_at || grant.consumed_at || null,
      };
      save(data);
    },
    getGrant(id) {
      const row = load().grants?.[id];
      return row ? { ...row } : null;
    },
    isConsumed(id) {
      return Boolean(load().grants?.[id]?.consumed_at);
    },
    markConsumed(id) {
      const data = load();
      data.grants = data.grants || {};
      const prev = data.grants[id] || { authorization_id: id };
      prev.consumed_at = new Date().toISOString();
      data.grants[id] = prev;
      save(data);
    },
    reset() {
      save({ grants: {} });
    },
  };
}

export function createDefaultStore(env = process.env) {
  if (String(env.COGENTIA_SEA_STORE || "").trim().toLowerCase() === "memory") {
    return createMemoryStore();
  }
  return createFileStore(resolveAuthorizationStorePath(env));
}

let activeStore = null;

export function setAuthorizationStore(store) {
  activeStore = store;
  return store;
}

export function getAuthorizationStore(env = process.env) {
  if (!activeStore) activeStore = createDefaultStore(env);
  return activeStore;
}
