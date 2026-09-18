import assert from "node:assert/strict";
import {
  grantSideEffectAuthorization,
  validateSideEffectAuthorization,
  consumeSideEffectAuthorization,
  resetAuthorizationStore,
  isEffectfulCapability,
  canonicalPayloadHash,
  classifyAction,
  isNonAuthorizingNarration,
  authorizationFromUtterance,
  executeAuthorizedEffect,
} from "./lib/side-effect-authorization.js";

resetAuthorizationStore();

assert.equal(isEffectfulCapability("host.fs.read"), false);
assert.equal(isEffectfulCapability("host.fs.write"), true);
assert.equal(isEffectfulCapability("host.process.run"), true);
assert.equal(classifyAction("gmail.send"), "effectful");
assert.equal(classifyAction("agent_gateway.invoke"), "read_only");
assert.equal(classifyAction("host.fs.read"), "read_only");
assert.equal(classifyAction("calendar.publish"), "effectful");

const payload = { capability: "host.fs.write", path: "C:/tmp/x", command: undefined };
const auth = grantSideEffectAuthorization({
  principal: "principal:jhn",
  action_class: "host.fs.write",
  target: { node: "node:local", path: "C:/tmp/x" },
  payload,
});
assert.equal(auth.kind, "cogentia.side_effect_authorization/v1");
assert.equal(auth.payload_hash, canonicalPayloadHash(payload));

assert.throws(
  () => validateSideEffectAuthorization(null, { action_class: "host.fs.write" }),
  (e) => e.error_class === "authorization_missing"
);

assert.throws(
  () => validateSideEffectAuthorization(auth, { action_class: "host.process.run" }),
  (e) => e.error_class === "authorization_action_mismatch"
);

assert.throws(
  () => validateSideEffectAuthorization(auth, {
    action_class: "host.fs.write",
    target: { node: "node:other", path: "C:/tmp/x" },
  }),
  (e) => e.error_class === "authorization_target_mismatch"
);

assert.throws(
  () => validateSideEffectAuthorization(auth, {
    action_class: "host.fs.write",
    target: auth.target,
    payload: { capability: "host.fs.write", path: "C:/tmp/changed" },
  }),
  (e) => e.error_class === "authorization_payload_mismatch"
);

validateSideEffectAuthorization(auth, {
  action_class: "host.fs.write",
  target: auth.target,
  payload,
});
consumeSideEffectAuthorization(auth);
assert.throws(
  () => validateSideEffectAuthorization(auth, {
    action_class: "host.fs.write",
    target: auth.target,
    payload,
  }),
  (e) => e.error_class === "authorization_replay"
);

assert.equal(isNonAuthorizingNarration("On va lui envoyer ce document."), true);
assert.equal(isNonAuthorizingNarration("Prépare le mail."), true);
assert.equal(isNonAuthorizingNarration("C’est la prochaine action logique."), true);
assert.equal(authorizationFromUtterance("Envoie-le.").granted, false);
assert.equal(authorizationFromUtterance("send it").granted, false);

const sent = [];
async function fakeSend(message) {
  sent.push(message);
  return { message_id: "m1" };
}

await assert.rejects(
  () => executeAuthorizedEffect({
    action_class: "gmail.send",
    target: { recipient: "ext@example.com" },
    payload: { subject: "Hello", body: "exact body" },
    authorization: null,
    run: () => fakeSend({ to: "ext@example.com" }),
  }),
  (e) => e.error_class === "authorization_missing"
);
assert.equal(sent.length, 0);

const mailPayload = { subject: "Hello", body: "exact body" };
const mailAuth = grantSideEffectAuthorization({
  principal: "principal:jhn",
  action_class: "gmail.send",
  target: { recipient: "ext@example.com" },
  payload: mailPayload,
});
const executed = await executeAuthorizedEffect({
  action_class: "gmail.send",
  target: { recipient: "ext@example.com" },
  payload: mailPayload,
  authorization: mailAuth,
  run: () => fakeSend({ to: "ext@example.com", ...mailPayload }),
});
assert.equal(executed.ok, true);
assert.equal(sent.length, 1);
await assert.rejects(
  () => executeAuthorizedEffect({
    action_class: "gmail.send",
    target: { recipient: "ext@example.com" },
    payload: mailPayload,
    authorization: mailAuth,
    run: () => fakeSend({ to: "ext@example.com" }),
  }),
  (e) => e.error_class === "authorization_replay"
);
assert.equal(sent.length, 1);

console.log(JSON.stringify({ ok: true, test: "side_effect_authorization" }));
