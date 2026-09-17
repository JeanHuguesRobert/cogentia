import assert from "node:assert/strict";
import {
  grantSideEffectAuthorization,
  resetAuthorizationStore,
  executeAuthorizedEffect,
  recordSideEffectExecution,
  getAuthorizationStore,
  attachExposePacket,
} from "./lib/side-effect-authorization.js";
import { prepareCommunicationSend, createDryRunTransport } from "./lib/communication-send.js";
import { createMcpCore } from "./lib/cogentia-mcp-core.js";

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

resetAuthorizationStore();
const nativePrep = prepareCommunicationSend({
  to: ["ext@example.com"],
  subject: "native",
  body: "secret-body-must-not-trace",
});
const nativeAuth = grantSideEffectAuthorization({
  principal: "principal:test",
  action_class: "gmail.send",
  target: nativePrep.target,
  payload: nativePrep.payload,
});
const recorded = recordSideEffectExecution({
  authorization: nativeAuth,
  action_class: "gmail.send",
  target: nativePrep.target,
  payload: nativePrep.payload,
  receipt: { transport: "gmail", message_id: "msg-1", body: "secret-body-must-not-trace" },
});
assert.equal(recorded.ok, true);
const hop = recorded.verification.packet.envelope.hops.find((h) => h.route_reason === "effect-verified");
assert.equal(hop.receipt.message_id, "msg-1");
assert.equal(hop.receipt.body, undefined);
assert.equal(JSON.stringify(recorded.verification.packet).includes("secret-body-must-not-trace"), false);
assert.throws(
  () => recordSideEffectExecution({
    authorization: nativeAuth,
    action_class: "gmail.send",
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
const p2 = prepareCommunicationSend({
  to: ["ext@example.com"],
  subject: "mcp-record",
  body: "x",
});
const a2 = grantSideEffectAuthorization({
  principal: "principal:test",
  action_class: "gmail.send",
  target: p2.target,
  payload: p2.payload,
});
const via = await core.callTool("cogentia_side_effect_record", {
  action_class: "gmail.send",
  target: p2.target,
  payload: p2.payload,
  side_effect_authorization: a2,
  receipt: { transport: "gmail", message_id: "m2" },
});
assert.equal(via.ok, true);
assert.equal(via.verification.packet.envelope.status, "completed");

console.log(JSON.stringify({ ok: true, test: "side_effect_packets" }));
