import assert from "node:assert/strict";
import {
  grantSideEffectAuthorization,
  validateSideEffectAuthorization,
  consumeSideEffectAuthorization,
  resetAuthorizationStore,
  isEffectfulCapability,
  canonicalPayloadHash,
} from "./lib/side-effect-authorization.js";

resetAuthorizationStore();

assert.equal(isEffectfulCapability("host.fs.read"), false);
assert.equal(isEffectfulCapability("host.fs.write"), true);
assert.equal(isEffectfulCapability("host.process.run"), true);

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

console.log(JSON.stringify({ ok: true, test: "side_effect_authorization" }));
