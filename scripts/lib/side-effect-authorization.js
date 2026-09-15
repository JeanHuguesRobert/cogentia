/**
 * Two-phase authorization for external side effects (Cogentia #171).
 *
 * PREPARE → EXPOSE → AUTHORIZE → EXECUTE → VERIFY
 * Never: PREPARE → EXECUTE
 *
 * This is the shared validator used by host capability routing. It is not
 * Desktop-Commander-specific.
 */
import { createHash, randomUUID } from "node:crypto";

export const AUTHORIZATION_KIND = "cogentia.side_effect_authorization/v1";

const consumedIds = new Set();

export const EFFECTFUL_CAPABILITIES = new Set([
  "host.fs.write",
  "host.process.run",
]);

export function isEffectfulCapability(capability) {
  return EFFECTFUL_CAPABILITIES.has(String(capability || ""));
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
  return {
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
}

export function resetAuthorizationStore() {
  consumedIds.clear();
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
  if (authorization.single_use !== false && consumedIds.has(authorization.authorization_id)) {
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
  consumedIds.add(authorization.authorization_id);
}
