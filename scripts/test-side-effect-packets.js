import assert from "node:assert/strict";
import {
  grantSideEffectAuthorization,
  resetAuthorizationStore,
  executeAuthorizedEffect,
  getAuthorizationStore,
  attachExposePacket,
} from "./lib/side-effect-authorization.js";
import { prepareCommunicationSend, createDryRunTransport } from "./lib/communication-send.js";

resetAuthorizationStore();

const prepared = prepareCommunicationSend({
  to: ["ext@example.com"],
  subject: "COP",
  body: "exact",
});
assert.equal(prepared.packet.envelope.packet_kind, "continuation");
assert.equal(prepared.packet.envelope.hops[0].route_reason, "effect-exposed");
assert.ok(prepared.packet.envelope.traces.some((t) => t.type === "payload_hash"));
assert.equal(JSON.stringify(prepared.packet).includes("exact"), false);

const auth = grantSideEffectAuthorization({
  principal: "principal:test",
  action_class: "gmail.send",
  target: prepared.target,
  payload: prepared.payload,
});
assert.equal(auth.status, "granted");
assert.equal(auth.packet.envelope.packet_kind, "decision");
assert.equal(auth.packet.envelope.status, "active");
assert.equal(auth.packet.payload.decision, "grant");
assert.equal(auth.packet.envelope.hops[0].route_reason, "effect-authorized");

const tx = createDryRunTransport();
const executed = await executeAuthorizedEffect({
  action_class: "gmail.send",
  target: prepared.target,
  payload: prepared.payload,
  authorization: auth,
  run: () => tx.send(prepared.payload),
});
assert.equal(executed.ok, true);
assert.equal(executed.verification.packet.envelope.status, "completed");
assert.ok(executed.verification.packet.envelope.hops.some((h) => h.route_reason === "effect-verified"));
const stored = getAuthorizationStore().getGrant(auth.authorization_id);
assert.ok(stored.consumed_at);
assert.equal(stored.packet.envelope.status, "completed");

const wrapped = attachExposePacket({ action_class: "git.commit", payload: { message: "x" }, target: {} });
assert.equal(wrapped.packet.envelope.packet_kind, "continuation");

console.log(JSON.stringify({ ok: true, test: "side_effect_packets" }));
