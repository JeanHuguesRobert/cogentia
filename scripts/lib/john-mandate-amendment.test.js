import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync,readFileSync,rmSync,writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSqliteCopEventStore } from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import { issueVerifiedJohnRoot } from "./john-root-issuance.js";
import { amendVerifiedJohnRoot } from "./john-mandate-amendment.js";
import { createOfflineJohnIssuerVerifier } from "./john-offline-issuer-verifier.js";
import { sshFingerprint, SSHSIG_NAMESPACE } from "./john-sshsig-approval.js";
import { AMENDMENT_SSH_NAMESPACE } from "./john-mandate-amendment-proof.js";
import { createEventSourcedExecutionBudgetLedger } from "../../../inseme/packages/cop-core/src/execution-budget.js";
import { assessJohnCopAuthority } from "./john-cop-authority-preflight.js";
import { resolveMandate, evaluateMandate } from "../../../inseme/packages/cop-core/src/governed-act.js";
import { resolveCallerAuth } from "./cogentia-mcp-auth.js";
import { ROOT_MANDATE_KIND, RESERVED_ACTIONS, canonicalProposalBytes, proposalHash, publicKeyFingerprint } from "./john-root-mandate.js";

const REF = "mandate:jhn:john-root";
const CAP = "cogentia.continuation.result.submit";
const date = new Date("2026-11-13T20:00:00Z");
const keys = generateKeyPairSync("ed25519");
const pem = keys.publicKey.export({type:"spki",format:"pem"});
const fingerprint = publicKeyFingerprint(pem);
const signature = proposal => sign(null,canonicalProposalBytes(proposal),keys.privateKey).toString("base64");
const initialProposal = {
  kind:ROOT_MANDATE_KIND,mandate_id:REF,version:"v1",
  principal_ref:"principal:jhn",logical_agent_ref:"agent:jhn",
  valid_from:"2026-01-01T00:00:00Z",valid_until:"2027-01-01T00:00:00Z",
  scope:{allowed_actions:["browser.hosted.inspect"],forbidden_actions:[...RESERVED_ACTIONS]},
  max_delegation_depth:2,budget_limits:{max_steps:6},
};
function signedAmendment(store,version,extraCaps,patch={}) {
  const events=store.replay().filter(e=>e.payload?.kind==="MandateDeclaration");
  const previous=events.at(-1);
  const scope={
    ...previous.payload.scope,
    allowed_actions:[...previous.payload.scope.allowed_actions,...extraCaps],
  };
  const proposal={
    kind:"cop.mandate-amendment.proposal/v1",mandate_ref:REF,
    previous_version:version,new_version:"v"+(Number(version.slice(1))+1),
    previous_event_id:previous.event_id,
    principal_ref:"principal:jhn",logical_agent_ref:"agent:jhn",
    scope, valid_from:previous.payload.valid_from,
    valid_until:previous.payload.valid_until,
    reason:"Grant only explicit MCP result return",
  };
  const proof={
    kind:"cogentia.john-mandate-amendment-proof/v1",
    signature_scheme:"ed25519",issuer_fingerprint:fingerprint,
    proposal_hash:proposalHash(proposal),
    signature_base64:signature(proposal),
  };
  return { mandate_ref:REF,expected_version:version,
    principal_ref:"principal:jhn",scope,reason:proposal.reason,approval:{...proof,...patch} };
}
function fixture(){
  const store=createSqliteCopEventStore(":memory:");
  const issued=issueVerifiedJohnRoot({
    store,proposal:initialProposal,
    approval:{kind:"cogentia.principal-signature/v1",principal_ref:"principal:jhn",
      payload_hash:proposalHash(initialProposal),key_fingerprint:fingerprint,
      signature_base64:signature(initialProposal)},
    trustedPublicKeyPem:pem,now:date,
  });
  assert.equal(issued.ok,true,JSON.stringify(issued));
  return store;
}
test("signed v1 -> v2 -> v3 mandate lineage survives cold verifier reconstruction",()=>{
  const store=fixture();
  try{
    const issuer=()=>createOfflineJohnIssuerVerifier({
      trustedPublicKeyPem:pem,now:()=>date,
    });
    const verifiedV1=issuer()({mandate:resolveMandate(store,REF),mandate_ref:REF,store});
    assert.equal(verifiedV1.verified,true);
    const v2=amendVerifiedJohnRoot({
      store,input:signedAmendment(store,"v1",[CAP]),
      trustedPublicKeyPem:pem,now:()=>date,
    });
    assert.equal(v2.ok,true,JSON.stringify(v2));
    const declaration=resolveMandate(store,REF);
    assert.equal(declaration.version,"v2");
    assert.equal(issuer()({mandate:declaration,mandate_ref:REF,store}).verified,true);
    const ledger=createEventSourcedExecutionBudgetLedger({
      store,budget_id:"budget:"+REF,require_authority_grant:true,
    });
    const auth=resolveCallerAuth({
      COGENTIA_MCP_JHN_MUTATE:"1",COGENTIA_MCP_JHN_TOKEN:"test",
    }, {headers:{authorization:"Bearer test"},
      meta:{"cogentia.actor":"agent:jhn","cogentia.mandate_ref":"mandate:chatgpt-corpus-coding"}});
    const granted=assessJohnCopAuthority({
      store,auth,mandate_ref:REF,version_pin:"v2",
      transport_mandate_label:"mandate:chatgpt-corpus-coding",
      capability:CAP,ledger,verifyIssuer:issuer(),at_time:date,
    });
    assert.equal(granted.preflight_ok,true,JSON.stringify(granted));
    assert.equal(evaluateMandate(store,{mandate_ref:REF,version_pin:"v1",
      capability:"browser.hosted.inspect",at_time:date}).granted,false);
    const v3=amendVerifiedJohnRoot({
      store,input:signedAmendment(store,"v2",["browser.navigation.instances"]),
      trustedPublicKeyPem:pem,now:()=>date,
    });
    assert.equal(v3.ok,true,JSON.stringify(v3));
    assert.equal(issuer()({mandate:resolveMandate(store,REF),mandate_ref:REF,store}).verified,true);
  }finally{store.close()}
});
test("unsigned, tampered and opaque-only amendments fail cold verification",()=>{
  const store=fixture();
  try{
    const unsigned=signedAmendment(store,"v1",[CAP],{signature_base64:"AAAA"});
    assert.equal(amendVerifiedJohnRoot({
      store,input:unsigned,trustedPublicKeyPem:pem,now:()=>date,
    }).error,"principal_approval_unverified");
    const valid=signedAmendment(store,"v1",[CAP]);
    assert.equal(amendVerifiedJohnRoot({
      store,input:valid,trustedPublicKeyPem:pem,now:()=>date,
    }).ok,true);
    const issuer=createOfflineJohnIssuerVerifier({
      trustedPublicKeyPem:pem,now:()=>date,
    });
    const genuine=resolveMandate(store,REF);
    assert.equal(issuer({mandate:genuine,mandate_ref:REF,store}).verified,true);
    assert.equal(issuer({mandate:{
      ...genuine,scope:{...genuine.scope,allowed_actions:[...genuine.scope.allowed_actions,"payment.execute"]},
    },mandate_ref:REF,store}).verified,false);
    // Previously signed v1 never silently authorizes an opaque v2.
    const opaque={...genuine,metadata:{
      amendment:{...genuine.metadata.amendment,approval_proof:undefined},
    }};
    assert.equal(issuer({mandate:opaque,mandate_ref:REF,store}).verified,false);
  }finally{store.close()}
});

test("real SSH-signed v1 and SSH-signed v2 remain verifiable after restart",()=>{
  const dir=mkdtempSync(join(tmpdir(),"cop-amendment-ssh-"));
  let store;
  try {
    const privateKey=join(dir,"issuer");
    const generated=spawnSync("ssh-keygen",["-q","-t","rsa","-b","2048",
      "-N","","-f",privateKey],{timeout:10000});
    assert.equal(generated.status,0,generated.stderr?.toString());
    const publicKey=readFileSync(privateKey+".pub","utf8").trim();
    const fingerprint=sshFingerprint(publicKey);
    const sshsign=(proposal,namespace,name)=>{
      const file=join(dir,name);
      writeFileSync(file,canonicalProposalBytes(proposal));
      const r=spawnSync("ssh-keygen",["-Y","sign","-q","-n",namespace,
        "-f",privateKey,file],{timeout:10000});
      assert.equal(r.status,0,r.stderr?.toString());
      return readFileSync(file+".sig","utf8");
    };
    store=createSqliteCopEventStore(join(dir,"cop.db"));
    const rootSignature=sshsign(initialProposal,SSHSIG_NAMESPACE,"root");
    const issued=issueVerifiedJohnRoot({
      store,proposal:initialProposal,
      approval:{kind:"cogentia.principal-sshsig/v1",
        principal_ref:"principal:jhn",
        payload_hash:proposalHash(initialProposal),
        key_fingerprint:fingerprint,signature:rootSignature},
      trustedSshPublicKey:publicKey,expectedSshFingerprint:fingerprint,now:date,
    });
    assert.equal(issued.ok,true,JSON.stringify(issued));
    const previous=store.replay().find(e=>e.payload?.kind==="MandateDeclaration");
    const scope={...previous.payload.scope,allowed_actions:[
      ...previous.payload.scope.allowed_actions,CAP]};
    const proposal={kind:"cop.mandate-amendment.proposal/v1",
      mandate_ref:REF,previous_version:"v1",new_version:"v2",
      previous_event_id:previous.event_id,principal_ref:"principal:jhn",
      logical_agent_ref:"agent:jhn",scope,
      valid_from:previous.payload.valid_from,valid_until:previous.payload.valid_until,
      reason:"Authorize direct result return"};
    const approval={kind:"cogentia.john-mandate-amendment-proof/v1",
      signature_scheme:"sshsig",issuer_fingerprint:fingerprint,
      proposal_hash:proposalHash(proposal),
      signature:sshsign(proposal,AMENDMENT_SSH_NAMESPACE,"amendment")};
    const amended=amendVerifiedJohnRoot({
      store,input:{mandate_ref:REF,expected_version:"v1",
        principal_ref:"principal:jhn",scope,reason:proposal.reason,approval},
      trustedSshPublicKey:publicKey,expectedSshFingerprint:fingerprint,
      now:()=>date,
    });
    assert.equal(amended.ok,true,JSON.stringify(amended));
    store.close();
    store=createSqliteCopEventStore(join(dir,"cop.db"));
    const cold=createOfflineJohnIssuerVerifier({
      trustedSshPublicKey:publicKey,expectedSshFingerprint:fingerprint,
      now:()=>date,
    });
    assert.equal(cold({mandate:resolveMandate(store,REF),mandate_ref:REF,store}).verified,true);
  }finally{store?.close();rmSync(dir,{recursive:true,force:true})}
});
