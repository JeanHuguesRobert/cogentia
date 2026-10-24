/**
 * Cognitive Packet shape for #171 EXPOSE / AUTHORIZE / VERIFY.
 * Kinds already in research/cognitive_packets.md — no third trace protocol.
 */
import { randomUUID } from "node:crypto";

export const COP_PACKET_TYPE = "cognitive_packet";
export const COP_PACKET_VERSION = "0.3";
export const COP_ENVELOPE_PROTOCOL = "cognitive_packet.v0";

function nowIso() {
  return new Date().toISOString();
}

export function copHop(route_reason, extra = {}) {
  return { at: nowIso(), route_reason, ...extra };
}

export function asExposeContinuation(prepared, { actor } = {}) {
  if (!prepared?.ok && prepared?.ok === false) return prepared;
  if (!prepared?.payload || !prepared?.action_class) return prepared;
  const payloadHash = prepared.payload_hash || null;
  const packetId = prepared.action_request_id
    ? `urn:cop:packet:expose:${String(prepared.action_request_id).replace(/[^A-Za-z0-9._:-]/g, "_")}`
    : `urn:cop:packet:expose:${randomUUID()}`;
  const packet = {
    type: COP_PACKET_TYPE,
    version: COP_PACKET_VERSION,
    envelope: {
      protocol: COP_ENVELOPE_PROTOCOL,
      id: packetId,
      packet_id: packetId,
      packet_kind: "continuation",
      transmission_mode: "copy",
      status: "active",
      provenance: { actor: actor || null, ts: nowIso() },
      traces: [
        { type: "action_class", value: prepared.action_class },
        { type: "payload_hash", value: payloadHash },
      ],
      hops: [copHop("effect-exposed")],
    },
    payload: {
      object: `Authorize or refuse ${prepared.action_class}`,
      next_action: "mint side_effect_authorization bound to this payload, or refuse",
      constraints: ["mandate", "budget", "single-use grant", "no secret or body in traces"],
      state: [
        { action_class: prepared.action_class, target: prepared.target || null, payload_hash: payloadHash },
      ],
    },
  };
  return { ...prepared, packet };
}

export function asDecisionGrant({
  authorization_id,
  principal,
  action_class,
  target,
  payload_hash,
  single_use,
  granted_at,
  authority_origin = "principal",
  actor = null,
  mandate_ref = null,
  budget_reservation_id = null,
  account_id = null,
  treatment_id = null,
  recovery_ref = null,
  expose_packet_id = null,
} = {}) {
  return {
    type: COP_PACKET_TYPE,
    version: COP_PACKET_VERSION,
    envelope: {
      protocol: COP_ENVELOPE_PROTOCOL,
      packet_kind: "decision",
      id: `urn:cop:packet:sea:${authorization_id}`,
      transmission_mode: "reference",
      status: "active",
      provenance: {
        actor: actor || null,
        principal: principal || null,
        ts: granted_at || nowIso(),
      },
      traces: [
        { type: "authorization_id", value: authorization_id },
        { type: "payload_hash", value: payload_hash },
        { type: "action_class", value: action_class },
        ...(expose_packet_id ? [{ type: "expose_packet_id", value: expose_packet_id }] : []),
      ],
      hops: [copHop("effect-authorized")],
    },
    payload: {
      decision: "grant",
      action_class,
      target: target || {},
      payload_hash,
      authority: {
        origin: authority_origin,
        principal: principal || null,
        actor: actor || null,
        mandate_ref: mandate_ref || null,
        budget_reservation_id: budget_reservation_id || null,
      },
      accounting_scope: {
        account_id: account_id || null,
        treatment_id: treatment_id || null,
      },
      recovery_ref: recovery_ref || null,
      expose_packet_id: expose_packet_id || null,
      reversibility: single_use === false ? "reusable" : "single_use",
      rationale: authority_origin === "mandate_derived"
        ? "bounded internal effect under the recorded mandate and recovery path"
        : "explicit execution authorization",
    },
  };
}

export function redactReceipt(receipt) {
  if (!receipt || typeof receipt !== "object") return null;
  const out = {};
  for (const k of ["transport", "id", "message_id", "sha", "commit_sha", "html_url", "operation", "ok", "status"]) {
    const value = receipt[k];
    if (value != null && value !== "" && ["string", "number", "boolean"].includes(typeof value)) {
      out[k] = value;
    }
  }
  return Object.keys(out).length ? out : null;
}

export function isSuccessfulEffectReceipt(receipt) {
  const safe = redactReceipt(receipt);
  if (!safe || safe.ok === false) return false;
  const status = String(safe.status || "").toLowerCase();
  if (["failed", "error", "unknown", "pending"].includes(status)) return false;
  if (safe.ok === true || ["success", "succeeded", "completed", "verified", "applied"].includes(status)) {
    return true;
  }
  return ["id", "message_id", "sha", "commit_sha", "html_url"]
    .some((key) => safe[key] != null && safe[key] !== "");
}

function redactAccounting(accounting) {
  if (!accounting || typeof accounting !== "object") return null;
  const out = {};
  for (const key of ["ok", "reason", "packet_id", "spend_id", "durable"]) {
    const value = accounting[key];
    if (value != null && ["string", "number", "boolean"].includes(typeof value)) out[key] = value;
  }
  return Object.keys(out).length ? out : null;
}

export function withVerifiedHop(row, at = nowIso(), extra = {}) {
  if (!row || typeof row !== "object") return row;
  const packet = row.packet && typeof row.packet === "object"
    ? structuredClone(row.packet)
    : asDecisionGrant(row);
  packet.envelope = packet.envelope || {};
  packet.envelope.status = "completed";
  packet.envelope.hops = Array.isArray(packet.envelope.hops) ? packet.envelope.hops : [];
  const receipt = redactReceipt(extra.receipt);
  const executionHopIndex = packet.envelope.hops.length;
  const actor = row.actor || packet.payload?.authority?.actor || null;
  const executionHop = { at: extra.executed_at || at };
  if (actor) executionHop.actor = actor;
  if (receipt) executionHop.receipt = receipt;
  packet.envelope.hops.push(copHop("effect-executed", executionHop));

  const status = String(receipt?.status || "").toLowerCase();
  const routeReason = isSuccessfulEffectReceipt(receipt)
    ? "effect-verified"
    : receipt?.ok === false || ["failed", "error"].includes(status)
      ? "effect-failed"
      : "effect-verification-incomplete";
  const hopExtra = { at };
  if (actor) hopExtra.actor = actor;
  hopExtra.execution_hop_index = executionHopIndex;
  const accounting = redactAccounting(extra.accounting);
  if (accounting) hopExtra.accounting = accounting;
  packet.envelope.hops.push(copHop(routeReason, hopExtra));
  return { ...row, packet, consumed_at: row.consumed_at || at };
}
