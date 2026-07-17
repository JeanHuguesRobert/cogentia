import path from "node:path";
import { randomBytes } from "node:crypto";
import { applySessionSignal } from "./session-signals.js";

const DEFAULT_TTL_MS = 30 * 60 * 1000;

export function newSessionId() {
  return `agw-sess-${randomBytes(8).toString("hex")}`;
}

export class ReplSessionRegistry {
  constructor(options = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxSessions = options.maxSessions ?? 4;
    this.maxPendingPerSession = options.maxPendingPerSession ?? 16;
    /** @type {Map<string, object>} */
    this.sessions = new Map();
  }

  size() {
    this.pruneExpired();
    return this.sessions.size;
  }

  pruneExpired(now = Date.now()) {
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > this.ttlMs) {
        this.destroySession(id);
      }
    }
  }

  get(sessionId) {
    this.pruneExpired();
    return this.sessions.get(sessionId) || null;
  }

  /** Reuse idle REPL for same adapter+cwd — avoids respawning TUI. */
  findIdleSession({ adapterId, cwd }) {
    this.pruneExpired();
    const resolvedCwd = path.resolve(cwd);
    for (const session of this.sessions.values()) {
      if (session.busy) continue;
      if (session.adapterId !== adapterId) continue;
      if (path.resolve(session.cwd) !== resolvedCwd) continue;
      if (!session.handle && !session.pty) continue;
      return session;
    }
    return null;
  }

  /**
   * Acquire mutex and return session. Creates session when id is unknown.
   * @throws {{ code: string, message: string, status: number }}
   */
  async acquireSession({ sessionId, adapter, model, turn, ctx, spawnRepl, spawnPty }) {
    const spawn = spawnRepl || spawnPty;
    this.pruneExpired();
    const requestedId = String(sessionId || "").trim();
    let session = requestedId ? this.sessions.get(requestedId) : null;
    let sessionSpawned = false;
    let sessionReused = false;

    if (requestedId && !session) {
      throw {
        code: "session_not_found",
        message: `Unknown session_id: ${requestedId}`,
        status: 404,
      };
    }

    if (!session) {
      session = this.findIdleSession({ adapterId: adapter.id, cwd: turn.cwd });
      if (session) {
        sessionReused = true;
      }
    } else {
      sessionReused = true;
    }

    if (!session) {
      if (this.sessions.size >= this.maxSessions) {
        throw {
          code: "session_limit",
          message: "Too many active REPL sessions",
          status: 409,
        };
      }
      const id = newSessionId();
      session = {
        id,
        adapterId: adapter.id,
        model,
        cwd: path.resolve(turn.cwd),
        pty: null,
        handle: null,
        stderrBuffer: "",
        busy: false,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        needsBootstrap: true,
        buffer: "",
        pendingWaiters: [],
        pendingQueue: [],
        dataDisposable: null,
      };
      session.handle = await spawn(session);
      session.pty = session.handle;
      this.sessions.set(id, session);
      sessionSpawned = true;
      sessionReused = false;
    }

    if (session.busy) {
      if (!requestedId) {
        throw {
          code: "session_busy",
          message: `REPL session busy: ${session.id}`,
          status: 409,
        };
      }
      if (session.pendingQueue.length >= this.maxPendingPerSession) {
        throw {
          code: "session_queue_full",
          message: `REPL session queue full: ${session.id}`,
          status: 429,
        };
      }
      await new Promise((resolve, reject) => {
        session.pendingQueue.push({ resolve, reject });
      });
      return this.acquireSession({ sessionId, adapter, model, turn, ctx, spawnRepl, spawnPty });
    }

    if (session.adapterId !== adapter.id) {
      throw {
        code: "session_adapter_mismatch",
        message: `Session ${session.id} uses adapter ${session.adapterId}, not ${adapter.id}`,
        status: 400,
      };
    }

    session.busy = true;
    session.lastActivity = Date.now();
    return { session, sessionSpawned, sessionReused };
  }

  /**
   * Send an out-of-band signal to a live session (works while busy).
   * @param {string} sessionId
   * @param {{ signal?: string, bytes?: string, kill?: string }} payload
   * @param {object|null} adapter
   */
  sendSignal(sessionId, payload, adapter = null) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw {
        code: "session_not_found",
        message: `Unknown session_id: ${sessionId}`,
        status: 404,
      };
    }
    const handle = session.handle || session.pty;
    return applySessionSignal(handle, payload, adapter);
  }

  releaseSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.busy = false;
    session.lastActivity = Date.now();
    const next = session.pendingQueue.shift();
    if (next) next.resolve();
  }

  touch(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) session.lastActivity = Date.now();
  }

  destroySession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.dataDisposable?.dispose?.();
    try {
      const handle = session.handle || session.pty;
      handle?.kill?.("SIGTERM");
    } catch {}
    this.sessions.delete(sessionId);
  }

  destroyAll() {
    for (const id of [...this.sessions.keys()]) {
      this.destroySession(id);
    }
  }
}
