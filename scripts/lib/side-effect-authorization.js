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
import { asDecisionGrant, asExposeContinuation, isSuccessfulEffectReceipt } from "./side-effect-packets.js";
import { maybeRecordCopEffectSpend } from "./cop-surface-accounting.js";

/**
 * #285: Conservative effect-boundary classification. This is advisory only:
 * it never mints a Principal grant and never bypasses existing effect gates.
 * Recoverability must be proven by the caller rather than inferred from git.
 */
export function assessPresumedEffect({
  action_class,
  within_mandate = false,
  within_budget = false,
  recovery_verified = false,
  negligible_residue = false,
  low_exposure = false,
  privacy_cleared = false,
  externally_engaging = false,
  mandatory_confirmation = false,
} = {}) {
  const action = String(action_class || "").toLowerCase();
  const reserved = externally_engaging
    || /(^|\.)(send|publish|post|forward|reply|submit|disclose|contract|payment|transfer)(\.|$)/.test(action)
    || action.startsWith("gmail.")
    || action.startsWith("whatsapp.")
    || action.startsWith("communication.");
  if (reserved) return { decision: "explicit_principal_authorization", reason: "third_party_commitment" };
  if (mandatory_confirmation) return { decision: "platform_confirmation", reason: "mandatory_external_control" };
  if (!within_mandate) return { decision: "escalate", reason: "outside_mandate" };
  if (!within_budget) return { decision: "escalate", reason: "budget" };
  if (!privacy_cleared) return { decision: "escalate", reason: "privacy" };
  if (!(recovery_verified && negligible_residue && low_exposure)) {
    return { decision: "escalate", reason: "recovery_or_exposure_unproven" };
  }
  return { decision: "mandate_derived_candidate", reason: "bounded_recoverable_internal_effect" };
}

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
export function mintSideEffectGrantFromPrepared(prepared, {
  principal,
  confirm,
  actor,
  authority_origin = "principal",
  mandate_ref = null,
  budget_reservation_id = null,
  account_id = null,
  treatment_id = null,
  recovery_ref = null,
} = {}) {
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
    authority_origin,
    actor: actor || null,
    mandate_ref,
    budget_reservation_id,
    account_id,
    treatment_id,
    recovery_ref,
    expose_packet_id: prepared.packet?.packet_id || prepared.packet?.envelope?.packet_id || null,
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
  direct_send_exception = null,
  authority_origin = "principal",
  actor = null,
  mandate_ref = null,
  budget_reservation_id = null,
  account_id = null,
  treatment_id = null,
  recovery_ref = null,
  expose_packet_id = null,
} = {}) {
  if (new Set(["gmail.send", "communication.send"]).has(action_class)) {
    throw fail("explicit_send_exception_required",
      "email sending is disabled until an independently verified, act-specific Principal approval path exists; create a draft for manual sending");
  }
  const now = Date.now();
  const authorization_id = `sea_${randomUUID()}`;
  const granted_at = new Date(now).toISOString();
  const payload_hash = canonicalPayloadHash(payload);
  const grant = {
    kind: AUTHORIZATION_KIND,
    authorization_id,
    principal: principal || null,
    authority_origin,
    actor: actor || null,
    mandate_ref: mandate_ref || null,
    budget_reservation_id: budget_reservation_id || null,
    account_id: account_id || null,
    treatment_id: treatment_id || null,
    recovery_ref: recovery_ref || null,
    expose_packet_id: expose_packet_id || null,
    status: "granted",
    action_class,
    target: target || {},
    payload_hash,
    material_parameters: {
      ...material_parameters,
      ...(direct_send_exception ? { direct_send_exception } : {}),
    },
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
      authority_origin,
      actor,
      mandate_ref,
      budget_reservation_id,
      account_id,
      treatment_id,
      recovery_ref,
      expose_packet_id,
    }),
  };
  getAuthorizationStore().putGrant(grant);
  return grant;
}

/**
 * Restricted COP mandate-derived grant. Never claims Principal approval.
 * This authorizes only already attested internal local effects and is stored
 * in the same #171 grant store as human-issued grants.
 */
export function mintMandateDerivedGrant({
  action_class, target, payload, mandate_ref, recovery_ref,
  policy_evidence = {}, expires_in_ms = 10 * 60 * 1000,
} = {}) {
  // Fail closed until a trusted runtime verifier can attest the mandate,
  // recovery path, budget and privacy boundary independently of this caller.
  // Caller-provided references and policy_evidence are descriptive data only.
  void action_class; void target; void payload; void mandate_ref; void recovery_ref;
  void policy_evidence; void expires_in_ms;
  throw fail("mandate_derived_verifier_unavailable",
    "mandate-derived grants are disabled until trusted adapter-side evidence verification is wired");
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
  // A caller-supplied envelope is not authority. Look up the minted grant.
  const storedGrant = getAuthorizationStore().getGrant(authorization.authorization_id);
  if (!storedGrant) {
    throw fail("authorization_untrusted", "authorization must match its stored minted record");
  }
  if (storedGrant.single_use !== false && getAuthorizationStore().isConsumed(authorization.authorization_id)) {
    throw fail("authorization_replay", "single-use authorization already consumed");
  }
  if (storedGrant.status !== authorization.status
      || storedGrant.principal !== authorization.principal
      || storedGrant.expires_at !== authorization.expires_at
      || storedGrant.single_use !== authorization.single_use
      || stableSerialize(storedGrant.material_parameters || {}) !== stableSerialize(authorization.material_parameters || {})
      || stableSerialize(storedGrant.packet || {}) !== stableSerialize(authorization.packet || {})
      || storedGrant.payload_hash !== authorization.payload_hash
      || storedGrant.action_class !== authorization.action_class
      || stableSerialize(storedGrant.target || {}) !== stableSerialize(authorization.target || {})
      || storedGrant.authority_origin !== authorization.authority_origin
      || storedGrant.actor !== authorization.actor
      || storedGrant.mandate_ref !== authorization.mandate_ref
      || storedGrant.budget_reservation_id !== authorization.budget_reservation_id
      || storedGrant.account_id !== authorization.account_id
      || storedGrant.treatment_id !== authorization.treatment_id
      || storedGrant.recovery_ref !== authorization.recovery_ref
      || storedGrant.expose_packet_id !== authorization.expose_packet_id) {
    throw fail("authorization_untrusted", "authorization must match its stored minted record");
  }
  if (authorization.single_use !== false && getAuthorizationStore().isConsumed(authorization.authorization_id)) {
    throw fail("authorization_replay", "single-use authorization already consumed");
  }
  if (authorization.expires_at && Date.parse(authorization.expires_at) < Date.now()) {
    throw fail("authorization_expired", "authorization expired");
  }
  if (new Set(["gmail.send", "communication.send"]).has(authorization.action_class)) {
    throw fail("explicit_send_exception_required",
      "draft only: no independently verified, act-specific Principal approval path is available");
  }
  if (authorization.authority_origin === "mandate_derived") {
    throw fail("mandate_derived_verifier_unavailable",
      "mandate-derived grants cannot be validated without trusted adapter-side evidence");
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
 * Record a native execute outcome. Capacities stay; this consumes the grant
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
  const executedAt = new Date().toISOString();
  const safeReceipt = redactEffectReceipt(receipt);
  const effectVerified = isSuccessfulEffectReceipt(safeReceipt);
  const cop_spend = await maybeRecordCopEffectSpend({
    action_class,
    authorization_id: authorization.authorization_id,
    authority_origin: authorization.authority_origin,
    principal: authorization.principal,
    recovery_ref: authorization.recovery_ref,
    payload_hash: authorization.payload_hash || canonicalPayloadHash(payload),
    mandate_id: authorization.mandate_ref,
    budget_reservation_id: authorization.budget_reservation_id,
    account_id: authorization.account_id,
    treatment_id: authorization.treatment_id,
    instance_id: authorization.actor,
    grant_packet_id: authorization.packet?.envelope?.id || null,
    expose_packet_id: authorization.expose_packet_id || authorization.packet?.payload?.expose_packet_id || null,
    receipt: safeReceipt,
    surface: "effect",
  });
  consumeSideEffectAuthorization(authorization, {
    receipt: safeReceipt,
    executed_at: executedAt,
    accounting: { ...cop_spend, durable: cop_spend.ok === true },
  });
  const stored = getAuthorizationStore().getGrant(authorization.authorization_id);
  return {
    ok: effectVerified,
    authorization_id: authorization.authorization_id,
    verification: {
      ok: effectVerified,
      executed_at: stored?.consumed_at || new Date().toISOString(),
      packet: stored?.packet || null,
      cop_spend,
      accounting_complete: cop_spend.ok === true,
    },
  };
}

/**
 * Choke point: validate, run once, consume the grant, and return verification.
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
  let result;
  try {
    result = await run();
  } catch (error) {
    consumeSideEffectAuthorization(authorization, {
      receipt: { status: "unknown" },
      executed_at: new Date().toISOString(),
      accounting: { ok: false, reason: "effect_outcome_unknown", durable: false },
    });
    throw error;
  }
  const executedAt = new Date().toISOString();
  const safeReceipt = redactEffectReceipt(result);
  const effectVerified = isSuccessfulEffectReceipt(safeReceipt);
  const cop_spend = await maybeRecordCopEffectSpend({
    action_class,
    authorization_id: authorization.authorization_id,
    authority_origin: authorization.authority_origin,
    principal: authorization.principal,
    recovery_ref: authorization.recovery_ref,
    payload_hash: authorization.payload_hash || canonicalPayloadHash(payload),
    mandate_id: authorization.mandate_ref,
    budget_reservation_id: authorization.budget_reservation_id,
    account_id: authorization.account_id,
    treatment_id: authorization.treatment_id,
    instance_id: authorization.actor,
    grant_packet_id: authorization.packet?.envelope?.id || null,
    expose_packet_id: authorization.expose_packet_id || authorization.packet?.payload?.expose_packet_id || null,
    receipt: safeReceipt,
    surface: "effect",
  });
  consumeSideEffectAuthorization(authorization, {
    receipt: safeReceipt,
    executed_at: executedAt,
    accounting: { ...cop_spend, durable: cop_spend.ok === true },
  });
  const stored = getAuthorizationStore().getGrant(authorization.authorization_id);
  return {
    ok: effectVerified,
    authorization_id: authorization.authorization_id,
    effect_executed: true,
    effect_verified: effectVerified,
    accounting_complete: cop_spend.ok === true,
    verification: {
      ok: effectVerified,
      executed_at: new Date().toISOString(),
      packet: stored?.packet || authorization.packet || null,
      cop_spend,
    },
    result,
  };
}

function redactEffectReceipt(receipt) {
  if (!receipt || typeof receipt !== "object") return null;
  const allowed = ["transport", "id", "message_id", "sha", "commit_sha", "html_url", "operation", "ok", "status"];
  const safe = {};
  for (const key of allowed) {
    const value = receipt[key];
    if (value != null && value !== "" && ["string", "number", "boolean"].includes(typeof value)) {
      safe[key] = value;
    }
  }
  return Object.keys(safe).length ? safe : null;
}
