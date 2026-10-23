import test from "node:test";
import assert from "node:assert/strict";
import { assessPresumedEffect, mintMandateDerivedGrant, validateSideEffectAuthorization, resetAuthorizationStore, executeAuthorizedEffect } from "./side-effect-authorization.js";

const safe = {
  action_class: "git.commit",
  within_mandate: true,
  within_budget: true,
  recovery_verified: true,
  negligible_residue: true,
  low_exposure: true,
  privacy_cleared: true,
};

test("in-mandate recoverable internal effect is only a candidate", () => {
  assert.equal(assessPresumedEffect(safe).decision, "mandate_derived_candidate");
});
test("email and third party effects never inherit presumed authority", () => {
  for (const action_class of ["gmail.send", "gmail.forward", "communication.send", "whatsapp.send", "publication.publish", "legal.submit"]) {
    assert.equal(assessPresumedEffect({ ...safe, action_class }).decision, "explicit_principal_authorization");
  }
  assert.equal(assessPresumedEffect({ ...safe, externally_engaging: true }).decision, "explicit_principal_authorization");
});
test("missing mandate, budget, privacy, recovery and platform gates fail closed", () => {
  for (const key of ["within_mandate", "within_budget", "privacy_cleared", "recovery_verified", "negligible_residue", "low_exposure"]) {
    assert.equal(assessPresumedEffect({ ...safe, [key]: false }).decision, "escalate");
  }
  assert.equal(assessPresumedEffect({ ...safe, mandatory_confirmation: true }).decision, "platform_confirmation");
});

test("a generic assent or continuation never authorizes an external send", () => {
  for (const utterance of ["continuons", "oui j'autorise", "continue", "faisons cela"]) {
    assert.equal(assessPresumedEffect({ ...safe, action_class: "gmail.send" }).decision, "explicit_principal_authorization", utterance);
  }
});

test("mandate derived grant is traceable and executes a bound internal effect once", async () => {
  resetAuthorizationStore();
  const target = { path: "/tmp/packet-285-test" };
  const payload = { content_sha256: "sha256:demo", path: target.path };
  const authorization = mintMandateDerivedGrant({
    action_class: "host.fs.write", target, payload,
    mandate_ref: "https://github.com/JeanHuguesRobert/cogentia/issues/285",
    recovery_ref: "snapshot:isolated-test",
    policy_evidence: { ...safe },
  });
  assert.equal(authorization.authority_origin, "mandate_derived");
  assert.equal(authorization.principal, null);
  assert.equal(validateSideEffectAuthorization(authorization, { action_class: "host.fs.write", target, payload }).ok, true);
  let runs = 0;
  await executeAuthorizedEffect({ action_class: "host.fs.write", target, payload, authorization, run: async () => ++runs });
  assert.equal(runs, 1);
  await assert.rejects(() => executeAuthorizedEffect({
    action_class: "host.fs.write", target, payload, authorization, run: async () => ++runs
  }), /already consumed/);
  assert.equal(runs, 1);
});
test("mandate-derived grants refuse outbound effects and absent recovery", () => {
  resetAuthorizationStore();
  for (const action_class of ["gmail.send", "communication.send", "github.write", "git.push", "whatsapp.send"]) {
    assert.throws(() => mintMandateDerivedGrant({
      action_class, target: { id: "test" }, payload: { value: "test" },
      mandate_ref: "issue:285", recovery_ref: "snapshot:test", policy_evidence: safe,
    }), /only audited internal/);
  }
  assert.throws(() => mintMandateDerivedGrant({
    action_class: "git.commit", target: { branch: "test" }, payload: { hash: "a" },
    mandate_ref: "issue:285", policy_evidence: safe,
  }), /recovery/);
});

test("caller-manufactured or tampered authorization is rejected before executing", async () => {
  resetAuthorizationStore();
  const target = { path: "/tmp/packet-285" };
  const payload = { content: "test" };
  const valid = mintMandateDerivedGrant({
    action_class: "host.fs.write", target, payload,
    mandate_ref: "issue:285", recovery_ref: "snapshot:test",
    policy_evidence: { ...safe },
  });
  let calls = 0;
  for (const forged of [
    { ...valid, authorization_id: "sea_forged" },
    { ...valid, mandate_ref: "issue:other" },
    { ...valid, authority_origin: undefined },
  ]) {
    await assert.rejects(() => executeAuthorizedEffect({
      action_class: "host.fs.write", target, payload,
      authorization: forged, run: async () => ++calls,
    }), /must match its stored minted record/);
  }
  assert.equal(calls, 0);
});
