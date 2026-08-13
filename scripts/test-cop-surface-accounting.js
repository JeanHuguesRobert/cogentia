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
  model: "gpt-4o-mini",
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

console.log("test-cop-surface-accounting: ok");
console.log(JSON.stringify({
  packet_id: projection.packet_id,
  own: projection.own_spend,
  consolidated: projection.consolidated_spend,
  downstream: projection.downstream_packet_ids || projection.lineage.downstream_packet_ids,
}, null, 2));
