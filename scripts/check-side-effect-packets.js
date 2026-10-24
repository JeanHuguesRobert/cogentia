import assert from "node:assert/strict";
import {
  grantSideEffectAuthorization,
  resetAuthorizationStore,
  executeAuthorizedEffect,
  recordSideEffectExecution,
  getAuthorizationStore,
  attachExposePacket,
} from "./lib/side-effect-authorization.js";
import { createMcpCore } from "./lib/cogentia-mcp-core.js";
import { resolvePacketById } from "./lib/cop-surface-accounting.js";

resetAuthorizationStore();

const prepared = attachExposePacket({
  action_class: "git.commit",
  target: { branch: "main" },
  payload: { message: "COP trace test" },
});
assert.equal(prepared.packet.envelope.packet_kind, "continuation");
assert.equal(prepared.packet.envelope.hops[0].route_reason, "effect-exposed");
assert.ok(prepared.packet.envelope.traces.some((t) => t.type === "payload_hash"));
assert.equal(JSON.stringify(prepared.packet).includes("COP trace test"), false);

const auth = grantSideEffectAuthorization({
  principal: "principal:test",
  action_class: "git.commit",
  target: prepared.target,
  payload: prepared.payload,
  authority_origin: "principal",
  actor: "agent:test-handler",
  mandate_ref: "mandate:test-side-effect",
  budget_reservation_id: "budget:test-side-effect",
  account_id: "account:test-side-effect",
  treatment_id: "treatment:test-side-effect",
  recovery_ref: "recovery:test-side-effect",
  expose_packet_id: prepared.packet.envelope.packet_id,
});
assert.equal(auth.status, "granted");
assert.equal(auth.packet.envelope.packet_kind, "decision");
assert.equal(auth.packet.envelope.status, "active");
assert.equal(auth.packet.envelope.provenance.actor, "agent:test-handler");
assert.equal(auth.packet.envelope.provenance.principal, "principal:test");
assert.equal(auth.packet.payload.decision, "grant");
assert.equal(auth.packet.envelope.hops[0].route_reason, "effect-authorized");

const executed = await executeAuthorizedEffect({
  action_class: "git.commit",
  target: prepared.target,
  payload: prepared.payload,
  authorization: auth,
  run: async () => ({ ok: true, operation: "commit", sha: "sha-test-1", transport: "test" }),
});
assert.equal(executed.ok, true);
assert.ok(executed.verification.cop_spend);
assert.equal(executed.verification.cop_spend.ok, true);
assert.equal(executed.verification.packet.envelope.status, "completed");
assert.ok(executed.verification.packet.envelope.hops.some((h) => h.route_reason === "effect-verified"));
const stored = getAuthorizationStore().getGrant(auth.authorization_id);
assert.ok(stored.consumed_at);
assert.equal(stored.packet.envelope.status, "completed");
const executeHopIndex = stored.packet.envelope.hops.findIndex((h) => h.route_reason === "effect-executed");
assert.deepEqual(stored.packet.envelope.hops[executeHopIndex].receipt, {
  transport: "test",
  operation: "commit",
  sha: "sha-test-1",
  ok: true,
});
const verifiedHop = stored.packet.envelope.hops.find((h) => h.route_reason === "effect-verified");
assert.equal(verifiedHop.execution_hop_index, executeHopIndex);
assert.equal(verifiedHop.accounting.durable, true);
const effectPacket = resolvePacketById(executed.verification.cop_spend.packet_id);
assert.equal(effectPacket.mandate_id, auth.mandate_ref);
assert.equal(effectPacket.budget_reservation_id, auth.budget_reservation_id);
assert.equal(effectPacket.payload.authorization_id, auth.authorization_id);
assert.equal(effectPacket.payload.authority_origin, auth.authority_origin);
assert.equal(effectPacket.payload.principal_ref, auth.principal);
assert.equal(effectPacket.payload.recovery_ref, auth.recovery_ref);
assert.equal(effectPacket.payload.grant_packet_id, auth.packet.envelope.id);
assert.equal(effectPacket.payload.expose_packet_id, prepared.packet.envelope.packet_id);
assert.equal(effectPacket.payload.receipt.sha, "sha-test-1");

const wrapped = attachExposePacket({ action_class: "git.commit", payload: { message: "x" }, target: {} });
assert.equal(wrapped.packet.envelope.packet_kind, "continuation");

resetAuthorizationStore();
const provenanceAuth = grantSideEffectAuthorization({
  principal: "principal:test",
  action_class: "git.commit",
  target: { branch: "test" },
  payload: { message: "provenance binding" },
  mandate_ref: "mandate:test-provenance",
});
const alteredAuth = structuredClone(provenanceAuth);
alteredAuth.packet.payload.authority.mandate_ref = "mandate:substituted";
let alteredCalls = 0;
await assert.rejects(() => executeAuthorizedEffect({
  action_class: "git.commit",
  target: provenanceAuth.target,
  payload: provenanceAuth.payload,
  authorization: alteredAuth,
  run: async () => ++alteredCalls,
}), (e) => e.error_class === "authorization_untrusted");
assert.equal(alteredCalls, 0);
const reusableForgery = structuredClone(provenanceAuth);
reusableForgery.single_use = false;
await assert.rejects(() => executeAuthorizedEffect({
  action_class: "git.commit",
  target: provenanceAuth.target,
  payload: provenanceAuth.payload,
  authorization: reusableForgery,
  run: async () => ++alteredCalls,
}), (e) => e.error_class === "authorization_untrusted");
assert.equal(alteredCalls, 0);

resetAuthorizationStore();
const uncertainAuth = grantSideEffectAuthorization({
  principal: "principal:test",
  action_class: "git.commit",
  target: { branch: "test" },
  payload: { message: "ambiguous" },
  mandate_ref: "mandate:test-uncertain",
});
await assert.rejects(() => executeAuthorizedEffect({
  action_class: "git.commit",
  target: uncertainAuth.target,
  payload: { message: "ambiguous" },
  authorization: uncertainAuth,
  run: async () => { throw new Error("transport disconnected after dispatch"); },
}), /transport disconnected after dispatch/);
const uncertainStored = getAuthorizationStore().getGrant(uncertainAuth.authorization_id);
assert.ok(uncertainStored.consumed_at);
assert.equal(uncertainStored.packet.envelope.hops.at(-1).route_reason, "effect-verification-incomplete");
await assert.rejects(() => executeAuthorizedEffect({
  action_class: "git.commit",
  target: uncertainAuth.target,
  payload: { message: "ambiguous" },
  authorization: uncertainAuth,
  run: async () => ({ ok: true, sha: "should-not-replay" }),
}), (e) => e.error_class === "authorization_replay");

resetAuthorizationStore();
const nativePrep = attachExposePacket({
  action_class: "github.write",
  target: { repo: "test/repo" },
  payload: { update: "safe fixture", secret: "secret-body-must-not-trace" },
});
const nativeAuth = grantSideEffectAuthorization({
  principal: "principal:test",
  action_class: "github.write",
  target: nativePrep.target,
  payload: nativePrep.payload,
  mandate_ref: "mandate:test-native",
});
const recorded = await recordSideEffectExecution({
  authorization: nativeAuth,
  action_class: "github.write",
  target: nativePrep.target,
  payload: nativePrep.payload,
  receipt: { transport: "github", id: "commit-1", body: "secret-body-must-not-trace" },
});
assert.equal(recorded.ok, true);
assert.ok(recorded.verification.cop_spend);
assert.equal(recorded.verification.cop_spend.ok, true);
const hop = recorded.verification.packet.envelope.hops.find((h) => h.route_reason === "effect-verified");
assert.equal(hop.execution_hop_index, recorded.verification.packet.envelope.hops.findIndex((h) => h.route_reason === "effect-executed"));
assert.equal(recorded.verification.packet.envelope.hops.find((h) => h.route_reason === "effect-executed").receipt.id, "commit-1");
assert.equal(recorded.verification.packet.envelope.hops.find((h) => h.route_reason === "effect-executed").receipt.body, undefined);
assert.equal(JSON.stringify(recorded.verification.packet).includes("secret-body-must-not-trace"), false);
await assert.rejects(
  () => recordSideEffectExecution({
    authorization: nativeAuth,
    action_class: "github.write",
    target: nativePrep.target,
    payload: nativePrep.payload,
  }),
  (e) => e.error_class === "authorization_replay"
);

resetAuthorizationStore();
const core = createMcpCore({
  COGENTIA_MCP_VIEW: "full",
  COGENTIA_ADMIN_TOKEN: "admin-test",
  COGENTIA_MCP_ALLOW_MUTATE: "1",
});
const p2 = attachExposePacket({
  action_class: "github.write",
  target: { repo: "test/mcp" },
  payload: { update: "record" },
});
const a2 = grantSideEffectAuthorization({
  principal: "principal:test",
  action_class: "github.write",
  target: p2.target,
  payload: p2.payload,
  mandate_ref: "mandate:test-mcp-record",
});
const via = await core.callTool("cogentia_side_effect_record", {
  action_class: "github.write",
  target: p2.target,
  payload: p2.payload,
  side_effect_authorization: a2,
  receipt: { transport: "github", id: "m2" },
});
assert.equal(via.ok, true);
assert.ok(via.verification.cop_spend);
assert.equal(via.verification.cop_spend.ok, true);
assert.equal(via.verification.packet.envelope.status, "completed");

console.log(JSON.stringify({ ok: true, test: "side_effect_packets" }));
