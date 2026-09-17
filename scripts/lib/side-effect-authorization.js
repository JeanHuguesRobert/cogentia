/**
 * Two-phase authorization for external side effects (Cogentia #171).
 *
 * PREPARE → EXPOSE → AUTHORIZE → EXECUTE → VERIFY
 * Never: PREPARE → EXECUTE
 *
 * Shared validator for host routing, Cogentia action routes, and adapters.
 * Tool availability is never treated as authority. Utterances never mint a grant.
 */
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import {
  getAuthorizationStore,
  setAuthorizationStore,
  createMemoryStore,
} from "./side-effect-store.js";
import { asDecisionGrant, asExposeContinuation } from "./side-effect-packets.js";
import { maybeRecordCopEffectSpend } from "./cop-surface-accounting.js";

export const AUTHORIZATION_KIND = "cogentia.side_effect_authorization/v1";
export { getAuthorizationStore, setAuthorizationStore, createMemoryStore };

/**
 * Canonical payload builder for host.fs.write side effects (Cogentia #192 Finding A).
 * Binds:
 * - capability ("host.fs.write")
 * - target node identifier
 * - normalized canonical path
 * - write mode (e.g. "write" / "append")
 * - content_sha256 (cryptographic digest of file content)
 * - content_bytes (exact byte count)
 * - material write options
 */
export function buildHostFsWritePayload({
  path: filePath,
  content,
  mode = "write",
  target = "node:local",
  options = {},
} = {}) {
  const contentStr = typeof content === "string" ? content : String(content ?? "");
  const content_sha256 = `sha256:${createHash("sha256").update(contentStr).digest("hex")}`;
  const content_bytes = Buffer.byteLength(contentStr, "utf8");
  const normalizedPath = filePath ? path.resolve(filePath).replace(/\\/g, "/") : "";
  const targetNode = typeof target === "string" ? target : target?.node || "node:local";
  const payload = {
    capability: "host.fs.write",
    target: targetNode,
    path: normalizedPath,
    mode: mode || "write",
    content_sha256,
    content_bytes,
  };
  if (options && typeof options === "object" && Object.keys(options).length > 0) {
    payload.options = options;
  }
  return payload;
}

/**
 * Generic canonical effect payload builder.
 */
export function buildEffectPayload(capability, args = {}, { target = "node:local" } = {}) {
  if (capability === "host.fs.write") {
    return buildHostFsWritePayload({
      path: args.path,
      content: args.content,
      mode: args.mode,
      target,
      options: args.options,
    });
  }
  if (capability === "host.process.run") {
    return {
      capability: "host.process.run",
      target: typeof target === "string" ? target : target?.node || "node:local",
      command: args.command || "",
      args: args.args || [],
    };
  }
  return {
    capability,
    target: typeof target === "string" ? target : target?.node || "node:local",
    path: args.path ? path.resolve(args.path).replace(/\\/g, "/") : undefined,
    command: args.command || undefined,
  };
}

/** @typedef {"read_only"|"effectful"} ActionKind */

export const ACTION_CLASSES = {
  "host.fs.list": { kind: "read_only" },
  "host.fs.read": { kind: "read_only" },
  "host.fs.search": { kind: "read_only" },
  "host.fs.write": { kind: "effectful" },
  "host.process.run": { kind: "effectful" },
  "gmail.send": { kind: "effectful" },
  "communication.send": { kind: "effectful" },
  "github.write": { kind: "effectful" },
  "github.commit": { kind: "effectful" },
  "github.push": { kind: "effectful" },
  "git.commit": { kind: "effectful" },
  "git.push": { kind: "effectful" },
  "whatsapp.send": { kind: "effectful" },
};

export const EFFECTFUL_CAPABILITIES = new Set(
  Object.entries(ACTION_CLASSES)
    .filter(([, v]) => v.kind === "effectful")
    .map(([k]) => k)
);

export function classifyAction(actionClass) {
  const row = ACTION_CLASSES[String(actionClass || "")];
  if (row) return row.kind;
  if (String(actionClass || "").includes(".send")
    || String(actionClass || "").includes(".write")
    || String(actionClass || "").includes(".publish")
    || String(actionClass || "").includes(".commit")
    || String(actionClass || "").includes(".push")
    || String(actionClass || "").includes(".delete")) {
    return "effectful";
  }
  return "read_only";
}

export function isEffectfulCapability(capability) {
  return classifyAction(capability) === "effectful";
}

const NON_AUTHORIZING_NARRATION = [
  "on va lui envoyer ce document.",
  "on va lui envoyer ce document",
  "nous allons faire cela.",
  "nous allons faire cela",
  "oui, le plan est bon.",
  "oui, le plan est bon",
  "prépare le mail.",
  "prepare le mail.",
  "prépare le mail",
  "c'est la prochaine action logique.",
  "c’est la prochaine action logique.",
  "c'est la prochaine action logique",
  "faisons ça ensuite.",
  "faisons ca ensuite.",
  "we will send this document.",
  "we are going to do that.",
  "yes, the plan is good.",
  "prepare the mail.",
  "that is the next logical action.",
  "let us do that next.",
];

export function isNonAuthorizingNarration(text) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return true;
  return NON_AUTHORIZING_NARRATION.includes(t);
}

/** Utterances never create a grant. Only grantSideEffectAuthorization does. */
export function authorizationFromUtterance(text) {
  return {
    granted: false,
    reason: isNonAuthorizingNarration(text) ? "workflow_narration" : "utterance_is_not_a_grant",
  };
}

export function stableSerialize(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(value[k])}`).join(",")}}`;
}

export function canonicalPayloadHash(payload) {
  return `sha256:${createHash("sha256").update(stableSerialize(payload ?? {})).digest("hex")}`;
}

export function confirmMatchesPayloadHash(confirm, payload_hash) {
  const want = String(payload_hash || "").trim();
  const got = String(confirm || "").trim();
  if (!want || !got) return false;
  if (got === want) return true;
  const wantHex = want.replace(/^sha256:/i, "");
  const gotHex = got.replace(/^sha256:/i, "");
  if (gotHex.length < 12) return false;
  return wantHex === gotHex || wantHex.startsWith(gotHex);
}

/**
 * Principal mint: EXPOSE envelope + confirm of payload_hash → decision grant.
 * Utterances cannot mint. Confirm is the human/mandate "I saw this hash".
 */
export function mintSideEffectGrantFromPrepared(prepared, { principal, confirm, actor } = {}) {
  if (!prepared || typeof prepared !== "object" || !prepared.payload || !prepared.action_class) {
    throw fail("invalid_prepare", "prepared EXPOSE envelope with action_class and payload required");
  }
  if (classifyAction(prepared.action_class) !== "effectful") {
    throw fail("not_effectful", `action_class ${prepared.action_class} is not write-class`);
  }
  const payload_hash = canonicalPayloadHash(prepared.payload);
  if (!confirmMatchesPayloadHash(confirm, payload_hash)) {
    const err = fail(
      confirm ? "confirm_mismatch" : "confirm_required",
      confirm
        ? "confirm does not match payload_hash"
        : `review EXPOSE then pass confirm=${payload_hash} to mint`
    );
    err.payload_hash = payload_hash;
    err.exposed = prepared.exposed_message || prepared.exposed_mutation || prepared.target;
    throw err;
  }
  return grantSideEffectAuthorization({
    principal: principal || actor || null,
    action_class: prepared.action_class,
    target: prepared.target || {},
    payload: prepared.payload,
  });
}

export function grantSideEffectAuthorization({
  principal,
  action_class,
  target,
  payload,
  expires_in_ms = 10 * 60 * 1000,
  single_use = true,
  material_parameters = {},
} = {}) {
  const now = Date.now();
  const authorization_id = `sea_${randomUUID()}`;
  const granted_at = new Date(now).toISOString();
  const payload_hash = canonicalPayloadHash(payload);
  const grant = {
    kind: AUTHORIZATION_KIND,
    authorization_id,
    principal: principal || null,
    status: "granted",
    action_class,
    target: target || {},
    payload_hash,
    material_parameters,
    granted_at,
    expires_at: new Date(now + expires_in_ms).toISOString(),
    single_use,
    packet: asDecisionGrant({
      authorization_id,
      principal,
      action_class,
      target: target || {},
      payload_hash,
      single_use,
      granted_at,
    }),
  };
  getAuthorizationStore().putGrant(grant);
  return grant;
}

export function resetAuthorizationStore() {
  setAuthorizationStore(createMemoryStore());
}

function fail(code, message) {
  const err = new Error(message);
  err.error_class = code;
  return err;
}

export function validateSideEffectAuthorization(authorization, expected = {}) {
  if (!authorization || typeof authorization !== "object") {
    throw fail("authorization_missing", "effectful capability requires side_effect_authorization");
  }
  if (authorization.status !== "granted") {
    throw fail("authorization_not_granted", `authorization status is ${authorization.status || "missing"}`);
  }
  if (!authorization.authorization_id) {
    throw fail("authorization_invalid", "authorization_id required");
  }
  if (authorization.single_use !== false && getAuthorizationStore().isConsumed(authorization.authorization_id)) {
    throw fail("authorization_replay", "single-use authorization already consumed");
  }
  if (authorization.expires_at && Date.parse(authorization.expires_at) < Date.now()) {
    throw fail("authorization_expired", "authorization expired");
  }
  if (expected.action_class && authorization.action_class !== expected.action_class) {
    throw fail(
      "authorization_action_mismatch",
      `authorization action_class ${authorization.action_class} != ${expected.action_class}`
    );
  }
  if (expected.target) {
    const normTarget = (t) => {
      if (!t || typeof t !== "object") return {};
      const res = { ...t };
      if (typeof res.path === "string") {
        res.path = path.resolve(res.path).replace(/\\/g, "/");
      }
      return res;
    };
    const got = JSON.stringify(normTarget(authorization.target || {}));
    const want = JSON.stringify(normTarget(expected.target));
    if (got !== want) {
      throw fail("authorization_target_mismatch", "authorization target does not match request");
    }
  }
  if (expected.payload !== undefined) {
    const want = canonicalPayloadHash(expected.payload);
    if (authorization.payload_hash !== want) {
      throw fail("authorization_payload_mismatch", "authorization payload_hash does not match request");
    }
  }
  return { ok: true, authorization_id: authorization.authorization_id };
}

export function attachExposePacket(prepared, opts = {}) {
  if (!prepared?.payload) return prepared;
  return asExposeContinuation(
    { ...prepared, payload_hash: prepared.payload_hash || canonicalPayloadHash(prepared.payload) },
    opts
  );
}

export function consumeSideEffectAuthorization(authorization, extra = {}) {
  if (!authorization?.authorization_id) return;
  if (authorization.single_use === false) return;
  getAuthorizationStore().markConsumed(authorization.authorization_id, extra);
}

/**
 * VERIFY after a native execute. Capacities stay; this consumes the grant
 * and hops the decision packet. Does not call Gmail/GitHub/git.
 */
export async function recordSideEffectExecution({
  authorization,
  action_class,
  target,
  payload,
  receipt,
} = {}) {
  validateSideEffectAuthorization(authorization, { action_class, target, payload });
  consumeSideEffectAuthorization(authorization, { receipt });
  const stored = getAuthorizationStore().getGrant(authorization.authorization_id);
  const cop_spend = await maybeRecordCopEffectSpend({
    action_class,
    authorization_id: authorization.authorization_id,
    payload_hash: authorization.payload_hash || canonicalPayloadHash(payload),
    surface: "effect",
  });
  return {
    ok: true,
    authorization_id: authorization.authorization_id,
    verification: {
      ok: true,
      executed_at: stored?.consumed_at || new Date().toISOString(),
      packet: stored?.packet || null,
      cop_spend,
    },
  };
}

/**
 * Choke point: validate, run, consume only on success, return verification.
 * Fail closed before `run` when authorization is missing or mismatched.
 */
export async function executeAuthorizedEffect({
  action_class,
  target,
  payload,
  authorization,
  run,
} = {}) {
  if (typeof run !== "function") {
    const err = new Error("executeAuthorizedEffect requires run()");
    err.error_class = "authorization_invalid";
    throw err;
  }
  if (classifyAction(action_class) !== "effectful") {
    return { ok: true, authorization_id: null, skipped: "not_effectful", result: await run() };
  }
  validateSideEffectAuthorization(authorization, { action_class, target, payload });
  const result = await run();
  consumeSideEffectAuthorization(authorization);
  const stored = getAuthorizationStore().getGrant(authorization.authorization_id);
  const cop_spend = await maybeRecordCopEffectSpend({
    action_class,
    authorization_id: authorization.authorization_id,
    payload_hash: authorization.payload_hash || canonicalPayloadHash(payload),
    surface: "effect",
  });
  return {
    ok: true,
    authorization_id: authorization.authorization_id,
    verification: {
      ok: true,
      executed_at: new Date().toISOString(),
      packet: stored?.packet || authorization.packet || null,
      cop_spend,
    },
    result,
  };
}
