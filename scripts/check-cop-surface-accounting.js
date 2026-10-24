/**
 * Offline tests: COP surface accounting uses real cop-kernel packet accounting.
 */
import assert from "node:assert/strict";
import {
  openSurfaceTurnPacket,
  spawnSurfaceDownstream,
  recordPacketProviderSpend,
  projectTurnAccounting,
  clearPacketStoreForTests,
  resolvePacketById,
  isCopAccountingEnabled,
  maybeRecordCopEffectSpend,
} from "./lib/cop-surface-accounting.js";

clearPacketStoreForTests();
assert.equal(isCopAccountingEnabled(), true);

const opened = await openSurfaceTurnPacket({
  surface: "guide",
  question: "What is Possibilism?",
  locale: "en",
});
assert.equal(opened.ok, true, opened.error || opened.reason);
assert.ok(opened.packet.packet_id.startsWith("urn:cop:packet:"));
assert.equal(opened.packet.mandate_id.includes("guide") || opened.packet.mandate_id.length > 0, true);
assert.equal(opened.packet.monetary_unit_default, "USD");

const { packet: synth } = await spawnSurfaceDownstream(opened.packet, opened.cop, {
  spawn_reason: "synthesis",
  step: "synthesis",
});
assert.equal(synth.lineage.upstream_packet_id, opened.packet.packet_id);
assert.ok(opened.packet.lineage.downstream_packet_ids.includes(synth.packet_id));

const spent = recordPacketProviderSpend(synth, opened.cop, {
  provider: "openai",
  model: "gpt-5.6-sol",
  prompt_tokens: 1000,
  completion_tokens: 200,
  surface: "guide",
  hop: { route_reason: "synthesis" },
});
assert.equal(spent.ok, true, spent.error);
assert.equal(synth.spending.length, 1);

// Anti double-count: spend is only on downstream, not copied to root
assert.equal(opened.packet.spending.length, 0);

const projection = projectTurnAccounting(opened.packet, opened.cop);
assert.equal(projection.kind, "cop_surface_turn_accounting/v1");
assert.equal(projection.protocol, "cop-cognitive-packet");
assert.equal(projection.own_spend, "0.00000000");
assert.ok(Number(projection.consolidated_spend) > 0);
assert.equal(projection.downstream.length, 1);
assert.equal(resolvePacketById(synth.packet_id)?.packet_id, synth.packet_id);

const effectSpend = await maybeRecordCopEffectSpend({
  action_class: "gmail.send",
  authorization_id: "auth-test-1",
  authority_origin: "mcp_jhn_authenticated",
  principal: "principal:test",
  recovery_ref: "recovery:test-effect",
  payload_hash: "sha256:testpayload",
  mandate_id: "mandate:test-effect",
  treatment_id: "treatment:test-effect",
  account_id: "account:test-effect",
  budget_reservation_id: "budget:test-effect",
  actor: "agent:test",
  expose_packet_id: "urn:cop:packet:expose:test",
  grant_packet_id: "urn:cop:packet:sea:test",
  receipt: { transport: "test", message_id: "message-1", ok: true },
  surface: "effect",
});
assert.equal(effectSpend.ok, true);
assert.equal(effectSpend.reason, "recorded");
assert.equal(effectSpend.spendingEntry.spend_id, "effect:auth-test-1");
assert.equal(effectSpend.spendingEntry.capability, "effect/gmail.send");
assert.equal(effectSpend.spendingEntry.evidence_hash, "sha256:testpayload");
const effectPacket = resolvePacketById(effectSpend.packet_id);
assert.equal(effectPacket.mandate_id, "mandate:test-effect");
assert.equal(effectPacket.treatment_id, "treatment:test-effect");
assert.equal(effectPacket.account_id, "account:test-effect");
assert.equal(effectPacket.budget_reservation_id, "budget:test-effect");
assert.equal(effectPacket.payload.authorization_id, "auth-test-1");
assert.equal(effectPacket.payload.authority_origin, "mcp_jhn_authenticated");
assert.equal(effectPacket.payload.principal_ref, "principal:test");
assert.equal(effectPacket.payload.recovery_ref, "recovery:test-effect");
assert.equal(effectPacket.payload.grant_packet_id, "urn:cop:packet:sea:test");
assert.equal(effectPacket.payload.expose_packet_id, "urn:cop:packet:expose:test");
assert.deepEqual(effectPacket.payload.receipt, { transport: "test", message_id: "message-1", ok: true });
assert.equal(effectSpend.spool.ok, true);

const missingMandate = await maybeRecordCopEffectSpend({
  action_class: "git.commit",
  authorization_id: "auth-without-mandate",
});
assert.deepEqual(missingMandate, { ok: false, reason: "mandate_id_required" });

console.log("test-cop-surface-accounting: ok");
console.log(JSON.stringify({
  packet_id: projection.packet_id,
  own: projection.own_spend,
  consolidated: projection.consolidated_spend,
  downstream: projection.downstream_packet_ids || projection.lineage.downstream_packet_ids,
}, null, 2));
