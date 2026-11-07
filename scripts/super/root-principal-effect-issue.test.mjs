import test from 'node:test';
import assert from 'node:assert/strict';
import {composeRootEffectGrant,issueRootApprovedEffect,isProtectedFile} from './root-principal-effect-issue.mjs';
import {handle} from './broker.mjs';
const valid={kind:'cogentia.super-effect-proposal/v1',principal_ref:'principal:jhn',actor_ref:'agent:jhn',mandate_ref:'mandate:jhn:maintenance',mandate_version:'v1',budget_reservation_id:'reservation:one',expires_at:new Date(Date.now()+200000).toISOString(),effect:{target:'node:fracta2',payload_hash:'sha256:some'}};
const claim={ok:true,phase:'COP_CLAIMED_NOT_ISSUED',proposal_hash:'sha256:proposal',mandate_ref:valid.mandate_ref,mandate_version:'v1',budget_reservation_id:valid.budget_reservation_id,effect_hash:'sha256:some',event_id:'event:claim'};
test('materializing from an admitted one-use claim is an act-specific grant only',()=>{
 const r=composeRootEffectGrant({proposal:valid,claim});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.grant.single_use,true);
 assert.equal(r.grant.authority_origin,'principal');
 assert.equal(r.grant.provenance.cop_claim_event_id,'event:claim');
 assert.equal(r.grant.mandate_version,'v1');
 assert.equal(r.grant.budget_reservation_id,'reservation:one');
 assert.equal(r.grant.expires_at,valid.expires_at);
 assert.equal(composeRootEffectGrant({proposal:valid,claim:{...claim,effect_hash:'not-signed'}}).ok,false);
});
test('installed root source and protected stores are mandatory before issuance',async()=>{
 if(process.geteuid?.()===0)return;
 assert.equal(issueRootApprovedEffect({proposal:valid,signature:'anything'}).error,'root_required');
 assert.equal((await handle({op:'issue',proposal:valid,signature:'anything'})).error,'root_issuer_unavailable');
 assert.equal(isProtectedFile(import.meta.url.replace(/^file:\/\//,'')),false);
});
