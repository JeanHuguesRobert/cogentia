import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { createMcpCore } from "./cogentia-mcp-core.js";
import { resolveCallerAuth } from "./cogentia-mcp-auth.js";
import { createCanonicalMcpJudgmentResultHost, RESULT_RETURN_CAPABILITY } from "./cogentia-mcp-judgment-result-host.js";
import { createOfflineJohnIssuerVerifier } from "./john-offline-issuer-verifier.js";
import { issueVerifiedJohnRoot } from "./john-root-issuance.js";
import { amendVerifiedJohnRoot } from "./john-mandate-amendment.js";
import { resolveMandate, recordMandateControl } from "../../../inseme/packages/cop-core/src/governed-act.js";
import { ROOT_MANDATE_KIND, RESERVED_ACTIONS, canonicalProposalBytes, proposalHash, publicKeyFingerprint } from "./john-root-mandate.js";
import { createSqliteCopEventStore } from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import { createEventSourcedExecutionBudgetLedger } from "../../../inseme/packages/cop-core/src/execution-budget.js";
import { declaredContinuationRecord, observeContinuationResult } from "../../../inseme/packages/cop-core/src/continuation-result.js";
import { EventStorePacketClaimCoordinator } from "../../../inseme/packages/cop-kernel/src/packetCoordination.js";
import { hashPayload } from "../../../inseme/packages/cop-core/src/cop-event-envelope.js";

const TOOL = "cogentia_continuation_result_submit";
const MANDATE = "mandate:jhn:john-root";
const BUDGET = "budget:" + MANDATE;
const NOW = new Date("2026-11-13T12:00:00Z");
const submission = (id = "ctn_test") => {
  const step_result = { protocol: "cogentia.step_result/v1",
    continuation_id: id, challenge: "c-1",
    status: "answered", result: { answer: "ok" } };
  return { protocol: "cop.continuation-result-submit/v0",
    continuation_id: id, attempt_id: "a1",
    execution_binding_ref: "b1", continuation_version: "1",
    idempotency_key: "a1:result", result_digest: hashPayload(step_result),
    step_result };
};

test("real signed COP mandate and active budget reservation gate MCP receipt", async () => {
  const store = createSqliteCopEventStore(":memory:");
  try {
    const key = generateKeyPairSync("ed25519");
    const pem = key.publicKey.export({ type:"spki", format:"pem" });
    const proposal = {
      kind:ROOT_MANDATE_KIND, mandate_id:MANDATE, version:"v1",
      principal_ref:"principal:jhn", logical_agent_ref:"agent:jhn",
      valid_from:"2026-01-01T00:00:00Z",valid_until:"2027-01-01T00:00:00Z",
      scope:{allowed_actions:[RESULT_RETURN_CAPABILITY],
        forbidden_actions:[...RESERVED_ACTIONS]},
      max_delegation_depth:1, budget_limits:{max_steps:8},
    };
    const approval = {
      kind:"cogentia.principal-signature/v1",principal_ref:"principal:jhn",
      payload_hash:proposalHash(proposal),
      key_fingerprint:publicKeyFingerprint(pem),
      signature_base64:sign(null,canonicalProposalBytes(proposal),
        key.privateKey).toString("base64"),
    };
    const issued = issueVerifiedJohnRoot({
      store, proposal, approval, trustedPublicKeyPem:pem, now:NOW,
    });
    assert.equal(issued.ok,true,JSON.stringify(issued));
    const ledger = createEventSourcedExecutionBudgetLedger({
      store,budget_id:BUDGET,limits:{max_steps:8},require_authority_grant:true,
    });
    const reserved = ledger.reserve({
      idempotency_key:"packet:ctn_test:a1",expected_version:ledger.snapshot().version,
      demand:{max_steps:1},
    });
    assert.equal(reserved.ok,true,JSON.stringify(reserved));
    const claimCoordinator = new EventStorePacketClaimCoordinator({ store });
    const auth = resolveCallerAuth({
      COGENTIA_MCP_JHN_MUTATE:"1",COGENTIA_MCP_JHN_TOKEN:"test-token",
    }, {
      headers:{authorization:"Bearer test-token"},
      meta:{"cogentia.actor":"agent:jhn",
        "cogentia.mandate_ref":"mandate:chatgpt-corpus-coding"},
    });
    const claim = await claimCoordinator.tryClaim({
      packetRef:"packet:ctn_test",handlerRef:auth.actor,ttlMs:600000,
    });
    assert.equal(claim.ok,true);
    assert.equal(store.append(declaredContinuationRecord({
      continuation_id:"ctn_test",packet_ref:"packet:ctn_test",
      version:1,attempt_id:"a1",execution_binding_ref:"b1",
      lifecycle:"suspended",correlation:{challenge:"c-1"},
      budget_reservation_id:reserved.reservation.reservation_id,
      claim:{claim_id:claim.claim.claim_id,epoch:claim.claim.epoch,
        expected_generation:claimCoordinator.inspect("packet:ctn_test").generation},
      expected_result:{schema:"cogentia.step_result/v1"},
      provider:"local-fixture",channel:"mcp",
    })).ok,true);
    const verifyIssuer = createOfflineJohnIssuerVerifier({
      trustedPublicKeyPem:pem,now:()=>NOW,
    });
    let permit = true;
    const factory = createCanonicalMcpJudgmentResultHost({
      store,mandate_ref:MANDATE,budget_id:BUDGET,
      transport_mandate_label:"mandate:chatgpt-corpus-coding",verifyIssuer,
      channelPermission:()=>permit,
    });
    const core = createMcpCore({}, { mcpContinuationResultHost:factory });
    permit=false;
    const refused = await core.callTool(TOOL,submission(),{auth});
    assert.equal(refused.reason,"channel_not_permitted");
    assert.equal(store.listTopic("continuation:ctn_test").length,1);
    permit=true;
    const received = await core.callTool(TOOL,submission(),{auth});
    assert.equal(received.ok,true,JSON.stringify(received));
    assert.equal(received.duplicate,false);
    assert.equal(received.continuation_status,"not_yet_resolved");
    assert.equal(store.listTopic("continuation:ctn_test").length,2);
    const replay = await core.callTool(TOOL,submission(),{auth});
    assert.equal(replay.ok,true);
    assert.equal(replay.duplicate,true);
    assert.equal(replay.receipt_ref,received.receipt_ref);
    assert.equal(store.listTopic("continuation:ctn_test").length,2);

    // Minimal local three-continuation COP pipeline, no external vendor or
    // hidden browser execution. The existing recognizer owns acceptance.
    for (let i = 1; i <= 3; i++) {
      const id = i === 1 ? "ctn_test" : `ctn_test_${i}`;
      if (i > 1) {
        const packetRef = "packet:" + id;
        const reserve = ledger.reserve({
          idempotency_key: "packet:" + id + ":a1",
          expected_version: ledger.snapshot().version,
          demand: { max_steps:1 },
        });
        assert.equal(reserve.ok, true);
        const newClaim = await claimCoordinator.tryClaim({
          packetRef, handlerRef: auth.actor, ttlMs: 600000,
        });
        assert.equal(newClaim.ok, true);
        const declaration = declaredContinuationRecord({
          continuation_id: id, packet_ref: packetRef,
          version: 1, attempt_id: "a1", execution_binding_ref: "b1",
          lifecycle:"suspended", correlation:{challenge:"c-1"},
          budget_reservation_id: reserve.reservation.reservation_id,
          claim: { claim_id: newClaim.claim.claim_id,
            epoch: newClaim.claim.epoch,
            expected_generation: claimCoordinator.inspect(packetRef).generation },
          expected_result:{schema:"cogentia.step_result/v1"},
          provider:"local-fixture", channel:"mcp",
        });
        assert.equal(store.append(declaration).ok, true);
        const next = await core.callTool(TOOL, submission(id), { auth });
        assert.equal(next.ok, true, JSON.stringify(next));
        assert.equal(next.duplicate, false);
      }
      const persisted = store.listTopic("continuation:" + id);
      const observed = persisted.find(e => e.payload?.surface === "mcp");
      assert.ok(observed, "durable observation required for " + id);
      const rec = observeContinuationResult(observed, {
        continuations: {
          [id]: { continuation_id:id,
            correlation:{challenge:"c-1"},
            expected_result:{schema:"cogentia.step_result/v1"},
            lifecycle:"suspended" },
        },
      });
      assert.equal(rec.progression, "returned");
      assert.deepEqual(rec.proposed_events.map(e => e.payload.phase),
        ["observed","correlated","accepted","returned"]);
      const events = store.appendBatch(rec.proposed_events);
      assert.equal(events.ok, true, JSON.stringify(events));
      assert.equal(store.listTopic("continuation:" + id).filter(
        e => e.payload?.profile === "cop.continuation-result/v1" &&
          e.payload.phase === "returned").length, 1);
    }
    assert.equal(ledger.snapshot().reserved.max_steps, 3);
    assert.equal(store.replay().filter(e => e.payload?.surface === "mcp").length,3);

    // The same already-created MCP host must react to a separately signed
    // amendment and revocation without reconstructing its tool catalog.
    const original=resolveMandate(store, MANDATE);
    const last=store.replay().filter(e=>e.payload?.kind==="MandateDeclaration").at(-1);
    const scope={...original.scope,allowed_actions:[
      ...original.scope.allowed_actions,"browser.hosted.inspect"]};
    const proposalV2={kind:"cop.mandate-amendment.proposal/v1",
      mandate_ref:MANDATE,previous_version:"v1",new_version:"v2",
      previous_event_id:last.event_id,principal_ref:"principal:jhn",
      logical_agent_ref:"agent:jhn",scope,
      valid_from:original.valid_from,valid_until:original.valid_until,
      reason:"Maintain result receipts while extending a read-only capability"};
    const approvalV2={kind:"cogentia.john-mandate-amendment-proof/v1",
      signature_scheme:"ed25519",issuer_fingerprint:publicKeyFingerprint(pem),
      proposal_hash:proposalHash(proposalV2),
      signature_base64:sign(null,canonicalProposalBytes(proposalV2),
        key.privateKey).toString("base64")};
    const amend=amendVerifiedJohnRoot({store,input:{
      mandate_ref:MANDATE,expected_version:"v1",principal_ref:"principal:jhn",
      scope,reason:proposalV2.reason,approval:approvalV2},
      trustedPublicKeyPem:pem,now:()=>NOW});
    assert.equal(amend.ok,true,JSON.stringify(amend));
    const sameHost=await factory({auth});
    const liveV2=await sameHost.admit(submission("ctn_test_3"));
    assert.equal(liveV2.mandate_valid,true,"signed amendment must work without MCP restart");
    assert.equal(liveV2.budget_admitted,true);
    assert.equal(recordMandateControl(store,{principal_ref:"principal:jhn",
      mandate_ref:MANDATE,action:"revoke",reason:"test revocation"}).ok,true);
    const afterRevoke=await sameHost.admit(submission("ctn_test_3"));
    assert.equal(afterRevoke.mandate_valid,false,"revocation must apply without MCP restart");
    assert.equal(afterRevoke.budget_admitted,false);
  } finally {store.close();}
});
