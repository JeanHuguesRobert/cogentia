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
import {
  getAuthorizationStore,
  setAuthorizationStore,
  createMemoryStore,
} from "./side-effect-store.js";

export const AUTHORIZATION_KIND = "cogentia.side_effect_authorization/v1";
export { getAuthorizationStore, setAuthorizationStore, createMemoryStore };

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
  const grant = {
    kind: AUTHORIZATION_KIND,
    authorization_id: `sea_${randomUUID()}`,
    principal: principal || null,
    status: "granted",
    action_class,
    target: target || {},
    payload_hash: canonicalPayloadHash(payload),
    material_parameters,
    granted_at: new Date(now).toISOString(),
    expires_at: new Date(now + expires_in_ms).toISOString(),
    single_use,
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
    const got = JSON.stringify(authorization.target || {});
    const want = JSON.stringify(expected.target);
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

export function consumeSideEffectAuthorization(authorization) {
  if (!authorization?.authorization_id) return;
  if (authorization.single_use === false) return;
  getAuthorizationStore().markConsumed(authorization.authorization_id);
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
  return {
    ok: true,
    authorization_id: authorization.authorization_id,
    verification: { ok: true, executed_at: new Date().toISOString() },
    result,
  };
}
