import test from "node:test";
import assert from "node:assert/strict";
import { createSqliteCopEventStore } from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import { recordMandateDeclaration } from "../../../inseme/packages/cop-core/src/governed-act.js";
import { prepareJohnResultMandateAmendment, RESULT_MANDATE_REF } from "./john-result-mandate-plan.js";
import { proposalHash, RESERVED_ACTIONS, publicKeyFingerprint } from "./john-root-mandate.js";
import { amendVerifiedJohnRoot } from "./john-mandate-amendment.js";
import { generateKeyPairSync, sign } from "node:crypto";

function fixture(){
  const s=createSqliteCopEventStore(":memory:");
  recordMandateDeclaration(s,{
    mandate_id:RESULT_MANDATE_REF,version:"v1",principal_ref:"principal:jhn",
    logical_agent_ref:"agent:jhn",valid_from:"2026-11-06T00:00:00Z",
    valid_until:"2027-11-06T00:00:00Z",scope:{
      allowed_actions:["browser.navigation.instances","browser.hosted.inspect"],
      forbidden_actions:[...RESERVED_ACTIONS],budget_ceiling:{max_steps:2048},
    }
  });
  return s;
}
test("prepare exact v2 result-only scope without writes",()=>{
  const s=fixture();
  try {
    const n=s.replay().length;
    const p=prepareJohnResultMandateAmendment(s);
    assert.equal(p.ok,true,JSON.stringify(p));
    assert.equal(p.proposal.previous_version,"v1");
    assert.equal(p.proposal.new_version,"v2");
    assert.equal(p.proposal_hash,proposalHash(p.proposal));
    assert.equal(p.summary.budget_ceiling_unchanged,true);
    assert.equal(p.summary.forbidden_actions_unchanged,true);
    assert.equal(p.proposal.scope.allowed_actions.length,3);
    assert.equal(s.replay().length,n);
  }finally{s.close()}
});
test("independent signed apply refuses second version when scope already includes capability",()=>{
 const s=fixture(),key=generateKeyPairSync("ed25519");
 const pem=key.publicKey.export({type:"spki",format:"pem"});
 try{
   const p=prepareJohnResultMandateAmendment(s);
   const proof={
     kind:"cogentia.john-mandate-amendment-proof/v1",
     signature_scheme:"ed25519",issuer_fingerprint:publicKeyFingerprint(pem),
     proposal_hash:p.proposal_hash,
     signature_base64:sign(null,p.canonical_bytes,key.privateKey).toString("base64"),
   };
   const a=amendVerifiedJohnRoot({
     store:s,input:{...p.input,approval:proof},
     trustedPublicKeyPem:pem,now:()=>new Date("2026-11-13T20:00:00Z"),
   });
   assert.equal(a.ok,true,JSON.stringify(a));
   assert.equal(prepareJohnResultMandateAmendment(s).reason,"capability_already_authorized");
 }finally{s.close()}
});
