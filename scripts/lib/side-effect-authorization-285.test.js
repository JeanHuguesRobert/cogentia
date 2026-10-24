import test from "node:test";
import assert from "node:assert/strict";
import { assessPresumedEffect, mintMandateDerivedGrant, grantSideEffectAuthorization, attachExposePacket, canonicalPayloadHash, resetAuthorizationStore, executeAuthorizedEffect, validateSideEffectAuthorization } from "./side-effect-authorization.js";
import { resolveCallerAuth } from "./cogentia-mcp-auth.js";

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

test("caller-supplied mandate and recovery evidence cannot mint a grant", () => {
  resetAuthorizationStore();
  for (const action_class of ["git.commit", "host.fs.write"]) {
    assert.throws(() => mintMandateDerivedGrant({
      action_class, target: { path: "/tmp/packet-285-test" }, payload: { value: "test" },
      mandate_ref: "https://github.com/JeanHuguesRobert/cogentia/issues/285",
      recovery_ref: "snapshot:isolated-test", policy_evidence: { ...safe },
    }), (e) => e.error_class === "mandate_derived_verifier_unavailable");
  }
});
test("resolved JHN authority can mint only the attributed workspace write grant", () => {
  resetAuthorizationStore();
  const auth = resolveCallerAuth({
    COGENTIA_MCP_JHN_MUTATE: "1",
    COGENTIA_MCP_JHN_TOKEN: "test-token",
  }, {
    meta: { "cogentia.actor": "agent:jhn", "cogentia.mandate_ref": "mandate:test" },
    headers: { authorization: "Bearer test-token" },
  });
  const target = { node: "node:agent-jhn-workspace", path: "/tmp/assigned/notes.txt" };
  const payload = { capability: "host.fs.write", path: target.path, content_sha256: "sha256:content" };
  const exposed = attachExposePacket({
    action_class: "host.fs.write", target, payload, action_request_id: "workspace-write:test",
  }, { actor: auth.actor });
  const grant = mintMandateDerivedGrant({
    auth_context: auth,
    action_class: "host.fs.write",
    target,
    payload,
    mandate_ref: auth.mandate_ref,
    budget_reservation_id: "budget:test",
    recovery_ref: "git-worktree:agent-jhn:test.txt:sha256:old",
    expose_packet_id: exposed.packet.envelope.id,
    expose_packet: exposed.packet,
  });
  assert.equal(grant.authority_origin, "mandate_derived");
  assert.equal(grant.material_parameters.expose_packet.envelope.id, exposed.packet.envelope.id);
  assert.equal(validateSideEffectAuthorization(grant, { action_class: "host.fs.write", target, payload }).ok, true);
  assert.throws(() => mintMandateDerivedGrant({
    auth_context: { ...auth }, action_class: "host.fs.write", target, payload,
    mandate_ref: auth.mandate_ref, budget_reservation_id: "budget:test",
    recovery_ref: "git-worktree:agent-jhn:test.txt:old", expose_packet_id: exposed.packet.envelope.id,
    expose_packet: exposed.packet,
  }), (error) => error.error_class === "mandate_derived_verifier_unavailable");
  assert.throws(() => mintMandateDerivedGrant({
    auth_context: auth, action_class: "git.push", target, payload,
    mandate_ref: auth.mandate_ref, budget_reservation_id: "budget:test",
    recovery_ref: "git-worktree:agent-jhn:test.txt:old", expose_packet_id: exposed.packet.envelope.id,
    expose_packet: exposed.packet,
  }), (error) => error.error_class === "mandate_derived_scope_invalid");
});
test("mandate-derived grant minting fails closed for every action until trusted verification exists", () => {
  resetAuthorizationStore();
  for (const action_class of ["gmail.send", "communication.send", "github.write", "git.push", "whatsapp.send"]) {
    assert.throws(() => mintMandateDerivedGrant({
      action_class, target: { id: "test" }, payload: { value: "test" },
      mandate_ref: "issue:285", recovery_ref: "snapshot:test", policy_evidence: safe,
    }), (e) => e.error_class === "mandate_derived_verifier_unavailable");
  }
  assert.throws(() => mintMandateDerivedGrant({
    action_class: "git.commit", target: { branch: "test" }, payload: { hash: "a" },
    mandate_ref: "issue:285", policy_evidence: safe,
  }), (e) => e.error_class === "mandate_derived_verifier_unavailable");
});

test("caller-manufactured mandate grant is rejected before executing", async () => {
  resetAuthorizationStore();
  const target = { path: "/tmp/packet-285" };
  const payload = { content: "test" };
  let calls = 0;
  const forged = {
    kind: "cogentia.side_effect_authorization/v1", authorization_id: "sea_forged",
    principal: null, authority_origin: "mandate_derived", status: "granted",
    action_class: "host.fs.write", target, payload_hash: canonicalPayloadHash(payload),
    mandate_ref: "issue:285", recovery_ref: "snapshot:test",
    material_parameters: { policy_evidence: safe }, single_use: true,
  };
  await assert.rejects(() => executeAuthorizedEffect({
      action_class: "host.fs.write", target, payload,
      authorization: forged, run: async () => ++calls,
  }), /must match its stored minted record/);
  assert.equal(calls, 0);
});

test("email cannot mint a grant from caller-authored approval claims", () => {
  resetAuthorizationStore();
  const payload = { to: ["ext@example.invalid"], subject: "Test", body: "draft only" };
  const target = { recipient: "ext@example.invalid" };
  const request = { principal: "principal:test", action_class: "gmail.send", target, payload };
  assert.throws(() => grantSideEffectAuthorization(request),
    (e) => e.error_class === "explicit_send_exception_required");
  assert.throws(() => grantSideEffectAuthorization({
    ...request,
    direct_send_exception: {
      approved_by_principal: true, payload_hash: canonicalPayloadHash({ ...payload, body: "changed" }),
      justification: "synthetic specific exception", approval_reference: "test:explicit",
    },
  }), (e) => e.error_class === "explicit_send_exception_required");
  assert.throws(() => grantSideEffectAuthorization({
    ...request,
    direct_send_exception: {
      approved_by_principal: true, payload_hash: canonicalPayloadHash(payload),
      justification: "synthetic explicit exception only", approval_reference: "test:explicit",
    },
  }), (e) => e.error_class === "explicit_send_exception_required");
});
