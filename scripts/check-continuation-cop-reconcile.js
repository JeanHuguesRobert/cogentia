#!/usr/bin/env node
/** Reconciliation test: real event-sourced SQLite COP, signed test mandate. */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {generateKeyPairSync,sign} from "node:crypto";
import {createSqliteCopEventStore} from "../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import {createEventSourcedExecutionBudgetLedger} from "../../inseme/packages/cop-core/src/execution-budget.js";
import {recordMandateControl} from "../../inseme/packages/cop-core/src/governed-act.js";
import {issueVerifiedJohnRoot} from "./lib/john-root-issuance.js";
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,proposalHash,publicKeyFingerprint} from "./lib/john-root-mandate.js";
import {createOfflineJohnIssuerVerifier} from "./lib/john-offline-issuer-verifier.js";
import {resolveCallerAuth} from "./lib/cogentia-mcp-auth.js";
import {acquirePacketClaim} from "./lib/continuation-packet-claim.js";
import {continuationRevision} from "./lib/continuation-terminal-settlement.js";
import {resolveJohnCopContinuation} from "./lib/continuation-cop-governed.js";
import {reconcileJohnCopSettlement,reconcileOrphanJohnCopReservation} from "./lib/continuation-cop-reconcile.js";
const root=fs.mkdtempSync(path.join(os.tmpdir(),"cop-reconcile-111-"));
const db=path.join(root,"events.sqlite");
const config=path.join(root,".cogentia.json");
fs.writeFileSync(config,JSON.stringify({repos:[]}));
const cli=(...args)=>JSON.parse(execFileSync(process.execPath,
  [path.join(import.meta.dirname,"cogentia.js"),"continuation",...args,"--json"],
  {cwd:root,env:{...process.env,COGENTIA_REGISTRY:config},encoding:"utf8",timeout:15000}));
let store=createSqliteCopEventStore(db);
try {
  const pair=generateKeyPairSync("ed25519");
  const trustedPublicKeyPem=pair.publicKey.export({type:"spki",format:"pem"});
  const mandate_ref="mandate:jhn:john-root";
  const now=new Date("2026-11-10T14:00:00Z");
  const proposal={kind:ROOT_MANDATE_KIND,mandate_id:mandate_ref,version:"v1",
    principal_ref:"principal:jhn",logical_agent_ref:"agent:jhn",
    valid_from:"2026-01-01T00:00:00Z",valid_until:"2027-01-01T00:00:00Z",
    scope:{allowed_actions:["continuation.resolve"],
      forbidden_actions:[...RESERVED_ACTIONS]},
    max_delegation_depth:2,budget_limits:{max_steps:2}};
  const approval={kind:"cogentia.principal-signature/v1",
    principal_ref:"principal:jhn",payload_hash:proposalHash(proposal),
    key_fingerprint:publicKeyFingerprint(trustedPublicKeyPem),
    signature_base64:sign(null,canonicalProposalBytes(proposal),pair.privateKey).toString("base64")};
  assert.equal(issueVerifiedJohnRoot({store,proposal,approval,trustedPublicKeyPem,now}).ok,true);
  const ledger=()=>createEventSourcedExecutionBudgetLedger({store,
    budget_id:"budget:"+mandate_ref,limits:{max_steps:2},require_authority_grant:true});
  const auth=resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:"1",COGENTIA_MCP_JHN_TOKEN:"test-token"},
    {headers:{authorization:"Bearer test-token"},meta:{"cogentia.actor":"agent:jhn","cogentia.mandate_ref":mandate_ref}});
  const verifyIssuer=createOfflineJohnIssuerVerifier({trustedPublicKeyPem,now:()=>now});
  const work=cli("emit","--kind","judgment","--question","Signed COP reconciliation crash fixture").continuation;
  const witness=acquirePacketClaim(root,work.id,"judge-b",{leaseMs:90000}).claim;
  const revision=continuationRevision(root,work.id);
  const args={store,ledger:ledger(),auth,mandate_ref,version_pin:"v1",verifyIssuer,at_time:now,
    witness,expectedSha256:revision,decision:"bounded_answer",reason:"synthetic"};
  const stopped=resolveJohnCopContinuation(root,work.id,{...args,
    beforeCanonicalWrite:()=>{throw Error("simulated_crash");}});
  assert.equal(stopped.code,"TERMINAL_EXECUTION_INTERRUPTED");
  assert.equal(stopped.settlement_pending,true);
  assert.equal(ledger().snapshot().reserved.max_steps,1);
  // Restart the COP event store and rehydrate a different ledger instance.
  store.close();
  store=createSqliteCopEventStore(db);
  const postRestartLedger=ledger();
  assert.equal(postRestartLedger.snapshot().reserved.max_steps,1);
  // Independent orphaned reservation: acquired while the mandate was valid,
  // then lost its handler before any terminal intent was published.
  const orphan=cli("emit","--kind","judgment","--question","Orphaned budget fixture").continuation;
  const oldTime=new Date("2026-01-02T00:00:00Z");
  const orphanClaim=acquirePacketClaim(root,orphan.id,"disconnected-handler",{
    leaseMs:100,now:oldTime,
  }).claim;
  const orphanKey="cop:continuation:terminal:"+orphan.id+":"+orphanClaim.claim_id;
  const orphanReservation=postRestartLedger.reserve({
    idempotency_key:orphanKey,
    expected_version:postRestartLedger.snapshot().version,
    demand:{max_steps:1},
  });
  assert.equal(orphanReservation.ok,true);
  assert.equal(postRestartLedger.snapshot().available.max_steps,0);
  recordMandateControl(store,{principal_ref:"principal:jhn",mandate_ref,action:"revoke"});
  // Starting a new effect with a now-revoked mandate is impossible.
  const denied=resolveJohnCopContinuation(root,work.id,{
    ...args,store,ledger:postRestartLedger});
  assert.equal(denied.code,"COP_PREFLIGHT_DENIED");
  assert.equal(cli("inspect",work.id).continuation.status,"active");
  assert.equal(reconcileJohnCopSettlement(root,work.id,{
    auth:{...auth},store,ledger:postRestartLedger}).code,"AUTHENTICATED_JHN_RECONCILER_REQUIRED");
  assert.equal(reconcileJohnCopSettlement(root,work.id,{
    auth,store,ledger:postRestartLedger}).code,"RECONCILED");
  assert.equal(cli("inspect",work.id).continuation.status,"resolved");
  assert.equal(postRestartLedger.snapshot().reserved.max_steps,0);
  assert.equal(postRestartLedger.snapshot().settled.max_steps,1);
  const orphanArgs={auth,store,ledger:postRestartLedger,witness:orphanClaim};
  assert.equal(reconcileOrphanJohnCopReservation(root,orphan.id,{
    ...orphanArgs,now:new Date(oldTime.getTime()+50)}).code,"CLAIM_STILL_ACTIVE");
  assert.equal(postRestartLedger.snapshot().reserved.max_steps,1);
  const released=reconcileOrphanJohnCopReservation(root,orphan.id,orphanArgs);
  assert.equal(released.code,"ORPHAN_RESERVATION_RELEASED");
  assert.equal(postRestartLedger.snapshot().reserved.max_steps,0);
  assert.equal(postRestartLedger.snapshot().settled.max_steps,1);
  assert.equal(reconcileOrphanJohnCopReservation(root,orphan.id,orphanArgs).code,
    "ALREADY_RELEASED");
  const repeated=reconcileJohnCopSettlement(root,work.id,{auth,store,ledger:ledger()});
  assert.equal(repeated.code,"ALREADY_RECONCILED");
  assert.equal(ledger().snapshot().settled.max_steps,1);
  // A foreign budget cannot be used to settle this continuation.
  const foreign=createEventSourcedExecutionBudgetLedger({store,
    budget_id:"budget:mandate:foreign",limits:{max_steps:2},require_authority_grant:true});
  assert.equal(reconcileJohnCopSettlement(root,work.id,{auth,store,ledger:foreign}).code,
    "COP_LEDGER_IDENTITY_MISMATCH");
  console.log("inseme#111 COP durable restart / revoked mandate accounting / idempotent reconciliation PASS");
}finally{
  store.close();fs.rmSync(root,{recursive:true,force:true});
}
