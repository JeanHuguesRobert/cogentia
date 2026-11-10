#!/usr/bin/env node
/* Real COP signed-authority + budget-event fixture, no external effects. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { generateKeyPairSync,sign } from "node:crypto";
import { createSqliteCopEventStore } from "../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import { createEventSourcedExecutionBudgetLedger } from "../../inseme/packages/cop-core/src/execution-budget.js";
import { recordMandateControl } from "../../inseme/packages/cop-core/src/governed-act.js";
import { issueVerifiedJohnRoot } from "./lib/john-root-issuance.js";
import { ROOT_MANDATE_KIND, RESERVED_ACTIONS,
  canonicalProposalBytes,proposalHash,publicKeyFingerprint } from "./lib/john-root-mandate.js";
import { createOfflineJohnIssuerVerifier } from "./lib/john-offline-issuer-verifier.js";
import { resolveCallerAuth } from "./lib/cogentia-mcp-auth.js";
import { acquirePacketClaim } from "./lib/continuation-packet-claim.js";
import { continuationRevision } from "./lib/continuation-terminal-settlement.js";
import { resolveJohnCopContinuation } from "./lib/continuation-cop-governed.js";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"cop-governed-111-"));
const registry=path.join(root,".cogentia.json");
fs.writeFileSync(registry,JSON.stringify({repos:[]}));
const cli=(...args)=>JSON.parse(execFileSync(process.execPath,
  [path.join(import.meta.dirname,"cogentia.js"),"continuation",...args,"--json"],
  {cwd:root,env:{...process.env,COGENTIA_REGISTRY:registry},
    encoding:"utf8",timeout:15000}));
const store=createSqliteCopEventStore(":memory:");
try {
  const pair=generateKeyPairSync("ed25519");
  const trustedPublicKeyPem=pair.publicKey.export({type:"spki",format:"pem"});
  const mandate_ref="mandate:jhn:john-root";
  const now=new Date("2026-11-10T14:00:00Z");
  const proposal={
    kind:ROOT_MANDATE_KIND,mandate_id:mandate_ref,version:"v1",
    principal_ref:"principal:jhn",logical_agent_ref:"agent:jhn",
    valid_from:"2026-01-01T00:00:00Z",valid_until:"2027-01-01T00:00:00Z",
    scope:{allowed_actions:["continuation.resolve"],
      forbidden_actions:[...RESERVED_ACTIONS]},
    max_delegation_depth:2,budget_limits:{max_steps:2},
  };
  const approval={kind:"cogentia.principal-signature/v1",
    principal_ref:"principal:jhn",payload_hash:proposalHash(proposal),
    key_fingerprint:publicKeyFingerprint(trustedPublicKeyPem),
    signature_base64:sign(null,canonicalProposalBytes(proposal),pair.privateKey).toString("base64"),
  };
  const issued=issueVerifiedJohnRoot({store,proposal,approval,trustedPublicKeyPem,now});
  assert.equal(issued.ok,true,JSON.stringify(issued));
  const ledger=createEventSourcedExecutionBudgetLedger({
    store,budget_id:"budget:"+mandate_ref,limits:{max_steps:2},
    require_authority_grant:true,
  });
  const auth=resolveCallerAuth({
    COGENTIA_MCP_JHN_MUTATE:"1",COGENTIA_MCP_JHN_TOKEN:"test-only-token",
  },{headers:{authorization:"Bearer test-only-token"},
    meta:{"cogentia.actor":"agent:jhn","cogentia.mandate_ref":mandate_ref}});
  const verifyIssuer=createOfflineJohnIssuerVerifier({
    trustedPublicKeyPem,now:()=>now,
  });
  const args={store,auth,mandate_ref,version_pin:"v1",ledger,
    verifyIssuer,at_time:now};
  const one=cli("emit","--kind","judgment","--question","Signed COP synthetic terminal").continuation;
  const witness=acquirePacketClaim(root,one.id,"judge-b",{leaseMs:90000}).claim;
  const rev=continuationRevision(root,one.id);
  const baseline=ledger.snapshot();
  assert.equal(baseline.available.max_steps,2);
  const missing=resolveJohnCopContinuation(root,one.id,{
    ...args,auth:{...auth},witness,expectedSha256:rev,decision:"invalid_auth"});
  assert.equal(missing.code,"COP_PREFLIGHT_DENIED");
  assert.equal(ledger.snapshot().available.max_steps,2);
  const forbidden=resolveJohnCopContinuation(root,one.id,{
    ...args,capability:"payment.execute",witness,
    expectedSha256:rev,decision:"forbidden"});
  assert.equal(forbidden.code,"COP_PREFLIGHT_DENIED");
  const mismatch=resolveJohnCopContinuation(root,one.id,{
    ...args,witness,expectedSha256:"a".repeat(64),decision:"stale"});
  assert.equal(mismatch.code,"BASELINE_CHANGED");
  assert.equal(ledger.snapshot().available.max_steps,2,
    "failed terminal must release reserved budget");
  const ok=resolveJohnCopContinuation(root,one.id,{
    ...args,witness,expectedSha256:rev,decision:"signed_synthetic",
    reason:"fixture only",payload:{synthetic:true},
  });
  assert.equal(ok.ok,true,JSON.stringify(ok));
  assert.equal(ok.code,"COP_TERMINAL_SETTLED");
  assert.equal(ok.cop_preflight_verified,true);
  assert.equal(ok.budget_settled,true);
  assert.equal(ok.receipt.budget_reservation.reservation_id,ok.reservation_id);
  assert.equal(ok.receipt.budget_reservation.mandate_ref,mandate_ref);
  assert.equal(ok.receipt.budget_reservation.capability,"continuation.resolve");
  assert.equal(ok.receipt.claim.claim_id,witness.claim_id);
  assert.equal(ledger.snapshot().settled.max_steps,1);
  assert.equal(cli("inspect",one.id).continuation.resolution.decision,"signed_synthetic");
  const replay=resolveJohnCopContinuation(root,one.id,{
    ...args,witness,expectedSha256:rev,decision:"signed_synthetic"});
  assert.equal(replay.ok,true,JSON.stringify(replay));
  assert.equal(replay.code,"ALREADY_COMPLETED");
  assert.equal(ledger.snapshot().settled.max_steps,1,"replay must not double bill");
  recordMandateControl(store,{principal_ref:"principal:jhn",mandate_ref,action:"revoke"});
  const two=cli("emit","--kind","judgment","--question","Revoked COP synthetic terminal").continuation;
  const witness2=acquirePacketClaim(root,two.id,"judge-b",{leaseMs:90000}).claim;
  const denied=resolveJohnCopContinuation(root,two.id,{
    ...args,witness:witness2,expectedSha256:continuationRevision(root,two.id),
    decision:"must_refuse"});
  assert.equal(denied.code,"COP_PREFLIGHT_DENIED");
  assert.equal(cli("inspect",two.id).continuation.status,"active");
  assert.equal(ledger.snapshot().settled.max_steps,1);
  console.log("inseme#111 signed COP root + budget reserve/settle/replay/revocation PASS");
} finally {
  store.close();
  fs.rmSync(root,{recursive:true,force:true});
}
