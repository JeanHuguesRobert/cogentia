import test from "node:test";
import assert from "node:assert/strict";
import { assessPresumedEffect } from "./side-effect-authorization.js";

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
