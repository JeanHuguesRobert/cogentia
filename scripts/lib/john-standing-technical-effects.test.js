import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {createSqliteCopEventStore} from
  "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import {createEventSourcedExecutionBudgetLedger} from
  "../../../inseme/packages/cop-core/src/execution-budget.js";
import {recordMandateControl} from "../../../inseme/packages/cop-core/src/governed-act.js";
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,proposalHash,publicKeyFingerprint}
  from "./john-root-mandate.js";
import {issueVerifiedJohnRoot} from "./john-root-issuance.js";
import {createOfflineJohnIssuerVerifier} from "./john-offline-issuer-verifier.js";
import {resolveCallerAuth} from "./cogentia-mcp-auth.js";
import {createCanonicalStandingMissionResolver} from "./john-standing-mission-authority.js";
import {createStandingTechnicalEffects,MUSEUM_DNS,MUSEUM_RELEASE}
  from "./john-standing-technical-effects.js";
import {createStandingTechnicalProviders} from "./john-standing-technical-providers.js";

const AT=new Date("2026-11-15T12:00:00Z");
const keys=generateKeyPairSync("ed25519");
const pem=keys.publicKey.export({type:"spki",format:"pem"});
const fingerprint=publicKeyFingerprint(pem);
const auth=()=>resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:"1",
  COGENTIA_MCP_JHN_TOKEN:"fixture"},{headers:{authorization:"Bearer fixture"},
  meta:{"cogentia.actor":"agent:jhn",
    "cogentia.mandate_ref":"mandate:chatgpt-corpus-coding"}});
function fixture({steps=7,scopeOverride={}}={}){
  const store=createSqliteCopEventStore(":memory:");
  const proposal={kind:ROOT_MANDATE_KIND,
    mandate_id:"mandate:jhn:john-root",version:"v1",
    principal_ref:"principal:jhn",logical_agent_ref:"agent:jhn",
    valid_from:"2026-01-01T00:00:00Z",valid_until:"2027-11-06T00:00:00Z",
    scope:{allowed_actions:["dns.record.ensure","site.static.release"],
      forbidden_actions:[...RESERVED_ACTIONS],
      standing_technical_policy:{version:1,
        dns:{capability:"dns.record.ensure",
          zones:["baronsmariani.org"],allowed_types:["CNAME"],
          write_mode:"create_only",require_nonconflicting_name:true},
        site:{capability:"site.static.release",
          source_visibility:"already_public",
          require_pinned_revision:true,require_rollback:true}},
      ...scopeOverride},
    max_delegation_depth:2,budget_limits:{max_steps:steps}};
  const issued=issueVerifiedJohnRoot({store,proposal,
    approval:{kind:"cogentia.principal-signature/v1",
      principal_ref:"principal:jhn",payload_hash:proposalHash(proposal),
      key_fingerprint:fingerprint,
      signature_base64:sign(null,canonicalProposalBytes(proposal),
        keys.privateKey).toString("base64")},
    trustedPublicKeyPem:pem,now:AT});
  assert.equal(issued.ok,true,JSON.stringify(issued));
  const verifyIssuer=createOfflineJohnIssuerVerifier({
    trustedPublicKeyPem:pem,now:()=>AT});
  const missionAuthorityResolver=createCanonicalStandingMissionResolver({
    store,verifyIssuer,now:()=>AT});
  const ledger=()=>createEventSourcedExecutionBudgetLedger({
    store,budget_id:"budget:mandate:jhn:john-root",
    require_authority_grant:true}).snapshot();
  return {store,ledger,missionAuthorityResolver};
}
test("DNS and site reuse one signed standing mandate with separate canonical effects",async()=>{
  const f=fixture(),calls=[];
  try{
    const technical=createStandingTechnicalEffects({
      missionAuthorityResolver:f.missionAuthorityResolver,
      dnsProvider:{async ensure(e){calls.push("dns");return {ok:true,verified:true,changed:false,receipt:{status:"success"}};}},
      siteProvider:{async release(e){calls.push("site");return {ok:true,verified:true,changed:false,receipt:{status:"success"}};}},
    });
    const user=auth();
    const one=await technical.ensureDns({auth:user,effect:MUSEUM_DNS});
    assert.equal(one.ok,true,JSON.stringify(one));
    assert.equal(one.mandate_version,"v1");
    const two=await technical.releaseSite({auth:user,effect:MUSEUM_RELEASE});
    assert.equal(two.ok,true,JSON.stringify(two));
    assert.deepEqual(calls,["dns","site"]);
    assert.equal(f.ledger().settled.max_steps,2);
    assert.equal(f.ledger().reserved.max_steps,0);
    const invalid=await technical.ensureDns({auth:user,effect:{...MUSEUM_DNS,proxied:true}});
    assert.equal(invalid.ok,false);
    assert.equal(f.ledger().settled.max_steps,2);
  }finally{f.store.close();}
});
test("forged auth, false evidence, scope missing and revocation never run providers",async()=>{
  for(const scoped of [true,false]){
    const f=fixture({scopeOverride:scoped?{}:{standing_technical_policy:null}});
    let called=0;
    try{
      const technical=createStandingTechnicalEffects({
        missionAuthorityResolver:f.missionAuthorityResolver,
        dnsProvider:{async ensure(){called++;return {ok:true,verified:false};}},
        siteProvider:{async release(){called++;return {ok:true,verified:false};}},
      });
      const user=auth();
      const forged=await technical.ensureDns({auth:{...user},effect:MUSEUM_DNS});
      assert.equal(forged.ok,false);
      const result=await technical.ensureDns({auth:user,effect:MUSEUM_DNS});
      assert.equal(result.ok,false);
      if(scoped)assert.equal(called,1);
      else assert.equal(called,0);
      assert.equal(f.ledger().reserved.max_steps,0);
      assert.equal(f.ledger().settled.max_steps,scoped?1:0);
      recordMandateControl(f.store,{principal_ref:"principal:jhn",
        mandate_ref:"mandate:jhn:john-root",action:"revoke"});
      assert.equal((await technical.ensureDns({auth:user,effect:MUSEUM_DNS})).ok,false);
      assert.equal(called,scoped?1:0);
    }finally{f.store.close();}
  }
});
test("live provider semantics are idempotent and never require a shell when already correct",async()=>{
  let spawned=0;
  const providers=createStandingTechnicalProviders({
    run:async()=>{spawned++;throw Error("must not execute");},
    readCname:async()=>[MUSEUM_DNS.content,MUSEUM_DNS.content],
    readSite:async()=>("releases/"+MUSEUM_RELEASE.revision),
    probe:async()=>"<html><h1>Boutique</h1></html>",
  });
  assert.equal((await providers.dnsProvider.ensure(MUSEUM_DNS)).ok,true);
  assert.equal((await providers.siteProvider.release(MUSEUM_RELEASE)).ok,true);
  assert.equal(spawned,0);
});
test("Cloudflare implementation rejects conflicts and tests pinned operator call on absence",async()=>{
  let runs=0,reads=0;
  const conflicts=createStandingTechnicalProviders({
    readCname:async()=>["other.example","other.example"],
    run:async()=>{runs++;throw Error("not allowed");},
  });
  assert.equal((await conflicts.dnsProvider.ensure(MUSEUM_DNS)).ok,false);
  assert.equal(runs,0);
  const pending=createStandingTechnicalProviders({
    readCname:async()=>++reads===1?["",""]:[MUSEUM_DNS.content,MUSEUM_DNS.content],
    run:async(file,args)=>{
      runs++;
      assert.equal(file,"ssh");
      assert.equal(args[4],"thinkpad");
      const script=Buffer.from(args.at(-1),"base64").toString("utf16le");
      assert.match(script,/provision-kys-services-dns\.mjs/);
      assert.match(script,/Get-FileHash/);
      assert.match(script,/--site=museum/);
      assert.doesNotMatch(script,/CLOUDFLARE_API_KEY\s*=\s*['"][A-Za-z0-9]/);
      return {stdout:"COP_DNS_PROVIDER=SUCCESS"};
    },
  });
  const result=await pending.dnsProvider.ensure(MUSEUM_DNS);
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.changed,true);
  assert.equal(runs,1);
});
