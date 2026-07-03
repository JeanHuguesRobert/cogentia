import fs from "node:fs";
import path from "node:path";
import { timingSafeEqual } from "node:crypto";

const ARTIFACT_TYPE = "cop/packet-attractor";
const MAX_EVENTS = 200;

export const BLACKBOARD_EVENTS = {
  ADVERTISED: "cop/attractor.advertised",
  WITHDRAWN: "cop/attractor.withdrawn",
};

export function resolveBlackboardStorePath(env = process.env) {
  const configured = String(env.COGENTIA_BLACKBOARD_STORE || "").trim();
  if (configured) return path.resolve(configured);
  const stateDir = String(env.COGENTIA_OPS_STATE_DIR || "").trim();
  if (stateDir) return path.join(path.resolve(stateDir), "blackboard.json");
  return path.resolve(".cogentia", "ops", "blackboard.json");
}

export function blackboardUpsertToken(env = process.env) {
  return String(
    env.COGENTIA_BLACKBOARD_UPSERT_TOKEN
    || env.COGENTIA_ADMIN_TOKEN
    || "",
  ).trim();
}

export function hasBlackboardUpsertAuth(req, env = process.env) {
  const expected = blackboardUpsertToken(env);
  if (!expected) return false;
  const authorization = String(req.headers?.authorization || "");
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const supplied = bearer || String(req.headers?.["x-cogentia-blackboard-token"] || "");
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

export function createBlackboardStore(options = {}) {
  const env = options.env || process.env;
  const storePath = options.storePath || resolveBlackboardStorePath(env);
  const maxEvents = Number(options.maxEvents || MAX_EVENTS);

  function readState() {
    if (!fs.existsSync(storePath)) {
      return emptyState();
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(storePath, "utf8"));
      return normalizeState(parsed);
    } catch (error) {
      throw new Error(`blackboard_store_read_failed: ${error.message}`);
    }
  }

  function writeState(state) {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const tmpPath = `${storePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    fs.renameSync(tmpPath, storePath);
  }

  function upsertAdvertised(attractor, meta = {}) {
    const validated = validateAttractor(attractor);
    if (!validated.ok) {
      return { ok: false, error: "invalid_attractor", details: validated.errors };
    }
    const normalized = validated.attractor;
    const state = readState();
    const now = new Date().toISOString();
    state.version = 1;
    state.updated_at = now;
    state.attractors[normalized.id] = {
      ...normalized,
      _stored_at: now,
      _advertised_by: String(meta.advertised_by || "").trim() || undefined,
    };
    appendEvent(state, {
      kind: BLACKBOARD_EVENTS.ADVERTISED,
      at: now,
      attractor_id: normalized.id,
      node: normalized.node?.resource_id || "",
      capabilities: normalized.matches?.capabilities || [],
    }, maxEvents);
    writeState(state);
    return {
      ok: true,
      event: BLACKBOARD_EVENTS.ADVERTISED,
      attractor_id: normalized.id,
      snapshot_at: now,
    };
  }

  function withdrawAttractor(attractorId, meta = {}) {
    const id = String(attractorId || "").trim();
    if (!id) return { ok: false, error: "missing_attractor_id" };
    const state = readState();
    if (!state.attractors[id]) {
      return { ok: false, error: "attractor_not_found", attractor_id: id };
    }
    delete state.attractors[id];
    const now = new Date().toISOString();
    state.updated_at = now;
    appendEvent(state, {
      kind: BLACKBOARD_EVENTS.WITHDRAWN,
      at: now,
      attractor_id: id,
      reason: String(meta.reason || "withdrawn").trim(),
    }, maxEvents);
    writeState(state);
    return {
      ok: true,
      event: BLACKBOARD_EVENTS.WITHDRAWN,
      attractor_id: id,
      snapshot_at: now,
    };
  }

  function snapshot(query = {}) {
    const state = readState();
    const now = query.now instanceof Date ? query.now : new Date();
    const freshOnly = query.fresh !== false;
    const capability = String(query.capability || "").trim().toLowerCase();
    let attractors = Object.values(state.attractors).map(stripInternalFields);

    if (capability) {
      attractors = attractors.filter(item => attractorHasCapability(item, capability));
    }
    if (freshOnly) {
      attractors = attractors.filter(item => isAttractorFresh(item, now));
    }

    return {
      ok: true,
      store_path: storePath,
      snapshot_at: state.updated_at || null,
      count: attractors.length,
      attractors,
      recent_events: state.events.slice(-Math.min(20, state.events.length)),
    };
  }

  return {
    storePath,
    readState,
    upsertAdvertised,
    withdrawAttractor,
    snapshot,
  };
}

export function parseBlackboardUpsertBody(body = {}) {
  const event = String(body.event || BLACKBOARD_EVENTS.ADVERTISED).trim();
  if (event === BLACKBOARD_EVENTS.WITHDRAWN) {
    return {
      ok: true,
      event,
      attractor_id: String(body.attractor_id || body.id || "").trim(),
      reason: String(body.reason || "withdrawn").trim(),
    };
  }
  if (event !== BLACKBOARD_EVENTS.ADVERTISED) {
    return { ok: false, error: "unsupported_event", event };
  }
  const attractor = body.attractor && typeof body.attractor === "object"
    ? body.attractor
    : body;
  return { ok: true, event, attractor };
}

export function validateAttractor(attractor = {}) {
  const errors = [];
  const artifactType = String(attractor.artifactType || "").trim();
  if (artifactType !== ARTIFACT_TYPE) {
    errors.push(`artifactType must be ${ARTIFACT_TYPE}`);
  }

  const id = String(attractor.id || "").trim();
  if (!id) errors.push("id is required");

  const capabilities = Array.isArray(attractor.matches?.capabilities)
    ? attractor.matches.capabilities.map(value => String(value || "").trim()).filter(Boolean)
    : [];
  if (!capabilities.length) errors.push("matches.capabilities must be a non-empty array");

  const ttlSeconds = Number(attractor.availability?.ttl_seconds);
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    errors.push("availability.ttl_seconds must be a positive number");
  }

  const lastSeen = String(attractor.availability?.last_seen || "").trim();
  if (!lastSeen || Number.isNaN(Date.parse(lastSeen))) {
    errors.push("availability.last_seen must be an ISO timestamp");
  }

  const endpointRef = String(attractor.transport?.endpoint_ref || "").trim();
  if (!endpointRef) errors.push("transport.endpoint_ref is required");

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    attractor: {
      ...attractor,
      artifactType: ARTIFACT_TYPE,
      id,
      matches: {
        ...attractor.matches,
        capabilities,
      },
      availability: {
        ...attractor.availability,
        ttl_seconds: ttlSeconds,
        last_seen: lastSeen,
        status: String(attractor.availability?.status || "online").trim() || "online",
      },
      transport: {
        ...attractor.transport,
        endpoint_ref: endpointRef,
        profile: String(attractor.transport?.profile || "inox.session.v1").trim() || "inox.session.v1",
      },
    },
  };
}

export function isAttractorFresh(attractor = {}, now = new Date()) {
  const lastSeen = Date.parse(String(attractor.availability?.last_seen || ""));
  const ttlSeconds = Number(attractor.availability?.ttl_seconds);
  if (!Number.isFinite(lastSeen) || !Number.isFinite(ttlSeconds) || ttlSeconds <= 0) return false;
  const ageMs = now.getTime() - lastSeen;
  return ageMs >= 0 && ageMs <= ttlSeconds * 1000;
}

export function attractorHasCapability(attractor = {}, capability = "") {
  const needle = String(capability || "").trim().toLowerCase();
  if (!needle) return true;
  const capabilities = Array.isArray(attractor.matches?.capabilities)
    ? attractor.matches.capabilities
    : [];
  return capabilities.some(value => String(value || "").trim().toLowerCase() === needle);
}

export function buildRetrievalInlineAttractor(options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const id = String(options.id || "attractor:jhr-laptop:retrieval-inline").trim();
  const resourceId = String(options.resourceId || "resource://jhr-laptop").trim();
  const endpointRef = String(options.endpointRef || "secret://inox-serve-jhr-laptop").trim();
  const ttlSeconds = Number(options.ttlSeconds || 300);
  const corpusKey = String(options.corpusKey || "cogentia-public").trim();

  return {
    artifactType: ARTIFACT_TYPE,
    id,
    node: {
      resource_id: resourceId,
      trust_perimeter: String(options.trustPerimeter || "owner-operated").trim() || "owner-operated",
    },
    matches: {
      packetKind: ["continuation", "cognitive-packet", "mandate"],
      capabilities: [
        "retrieval.inline",
        ...(Array.isArray(options.extraCapabilities) ? options.extraCapabilities : ["openai.embeddings", "supabase.rpc"]),
      ],
      query: [{ corpus_key: corpusKey, mode: String(options.mode || "hybrid").trim() || "hybrid" }],
      verbs: ["retrieval.batch@v1"],
    },
    legitimacy: {
      mandate_surfaces: ["web-guide", "owner-cli"],
      forbidden: ["private-view", "unbounded-provider-spend"],
    },
    pressure: {
      accepted: ["best-effort", "ttl", "bounded"],
      default: "ttl",
    },
    regime: {
      current: "normal",
      accepts: ["normal", "degraded"],
    },
    availability: {
      status: "online",
      last_seen: now.toISOString(),
      ttl_seconds: ttlSeconds,
    },
    transport: {
      profile: "inox.session.v1",
      endpoint_ref: endpointRef,
    },
    trace: {
      advertised_event_required: true,
      matched_event_required: true,
    },
  };
}

function emptyState() {
  return {
    version: 1,
    updated_at: null,
    attractors: {},
    events: [],
  };
}

function normalizeState(raw = {}) {
  const state = emptyState();
  state.version = Number(raw.version || 1);
  state.updated_at = raw.updated_at || null;
  state.events = Array.isArray(raw.events) ? raw.events.slice(-MAX_EVENTS) : [];
  const attractors = raw.attractors && typeof raw.attractors === "object" ? raw.attractors : {};
  for (const [key, value] of Object.entries(attractors)) {
    if (!value || typeof value !== "object") continue;
    state.attractors[String(key)] = value;
  }
  return state;
}

function appendEvent(state, event, maxEvents) {
  state.events.push(event);
  if (state.events.length > maxEvents) {
    state.events = state.events.slice(-maxEvents);
  }
}

function stripInternalFields(attractor = {}) {
  const { _stored_at, _advertised_by, ...rest } = attractor;
  return rest;
}