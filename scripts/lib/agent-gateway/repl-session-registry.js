import { randomBytes } from "node:crypto";

const DEFAULT_TTL_MS = 30 * 60 * 1000;

export function newSessionId() {
  return `agw-sess-${randomBytes(8).toString("hex")}`;
}

export class ReplSessionRegistry {
  constructor(options = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxSessions = options.maxSessions ?? 4;
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

  /**
   * Acquire mutex and return session. Creates session when id is unknown.
   * @throws {{ code: string, message: string, status: number }}
   */
  async acquireSession({ sessionId, adapter, model, turn, ctx, spawnPty }) {
    this.pruneExpired();
    const requestedId = String(sessionId || "").trim();
    let session = requestedId ? this.sessions.get(requestedId) : null;

    if (requestedId && !session) {
      throw {
        code: "session_not_found",
        message: `Unknown session_id: ${requestedId}`,
        status: 404,
      };
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
        cwd: turn.cwd,
        pty: null,
        busy: false,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        needsBootstrap: true,
        buffer: "",
        pendingWaiters: [],
        dataDisposable: null,
      };
      session.pty = await spawnPty(session);
      this.sessions.set(id, session);
    }

    if (session.busy) {
      throw {
        code: "session_busy",
        message: `REPL session busy: ${session.id}`,
        status: 409,
      };
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
    return session;
  }

  releaseSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.busy = false;
    session.lastActivity = Date.now();
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
      session.pty?.kill?.();
    } catch {}
    this.sessions.delete(sessionId);
  }

  destroyAll() {
    for (const id of [...this.sessions.keys()]) {
      this.destroySession(id);
    }
  }
}