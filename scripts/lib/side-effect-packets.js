/**
 * Cognitive Packet shape for #171 EXPOSE / AUTHORIZE / VERIFY.
 * Kinds already in research/cognitive_packets.md — no third trace protocol.
 */
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
  const packet = {
    type: COP_PACKET_TYPE,
    version: COP_PACKET_VERSION,
    envelope: {
      protocol: COP_ENVELOPE_PROTOCOL,
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
      provenance: { actor: principal || null, ts: granted_at || nowIso() },
      traces: [
        { type: "authorization_id", value: authorization_id },
        { type: "payload_hash", value: payload_hash },
        { type: "action_class", value: action_class },
      ],
      hops: [copHop("effect-authorized")],
    },
    payload: {
      decision: "grant",
      action_class,
      target: target || {},
      payload_hash,
      authority: principal || null,
      reversibility: single_use === false ? "reusable" : "single_use",
      rationale: "explicit execution authorization",
    },
  };
}

export function redactReceipt(receipt) {
  if (!receipt || typeof receipt !== "object") return null;
  const out = {};
  for (const k of ["transport", "id", "message_id", "sha", "html_url", "operation", "ok"]) {
    if (receipt[k] != null && receipt[k] !== "") out[k] = receipt[k];
  }
  return Object.keys(out).length ? out : { recorded: true };
}

export function withVerifiedHop(row, at = nowIso(), extra = {}) {
  if (!row || typeof row !== "object") return row;
  const packet = row.packet && typeof row.packet === "object"
    ? structuredClone(row.packet)
    : asDecisionGrant(row);
  packet.envelope = packet.envelope || {};
  packet.envelope.status = "completed";
  packet.envelope.hops = Array.isArray(packet.envelope.hops) ? packet.envelope.hops : [];
  const hopExtra = { at };
  const receipt = redactReceipt(extra.receipt);
  if (receipt) hopExtra.receipt = receipt;
  packet.envelope.hops.push(copHop("effect-verified", hopExtra));
  return { ...row, packet, consumed_at: row.consumed_at || at };
}
