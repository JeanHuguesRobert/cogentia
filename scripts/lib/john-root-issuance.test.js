import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {evaluateMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {issueVerifiedJohnRoot} from './john-root-issuance.js';
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,proposalHash,publicKeyFingerprint} from './john-root-mandate.js';
const kp=generateKeyPairSync('ed25519');const pem=kp.publicKey.export({type:'spki',format:'pem'});
const proposal={kind:ROOT_MANDATE_KIND,mandate_id:'mandate:jhn:john-root',version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',valid_from:'2026-01-01T00:00:00Z',valid_until:'2027-01-01T00:00:00Z',scope:{allowed_actions:['host.fs.read'],forbidden_actions:[...RESERVED_ACTIONS]},max_delegation_depth:2,budget_limits:{max_steps:4}};
const approval={kind:'cogentia.principal-signature/v1',principal_ref:proposal.principal_ref,payload_hash:proposalHash(proposal),key_fingerprint:publicKeyFingerprint(pem),signature_base64:sign(null,canonicalProposalBytes(proposal),kp.privateKey).toString('base64')};
const args={proposal,approval,trustedPublicKeyPem:pem,now:new Date('2026-11-05T12:00:00Z')};
test('signed root issuance is atomic in canonical Inseme SQLite, with no replay',()=>{
 const store=createSqliteCopEventStore(':memory:');try{
  assert.equal(issueVerifiedJohnRoot({...args,store:{...store,appendBatch:undefined}}).error,'canonical_atomic_store_required');
  const first=issueVerifiedJohnRoot({...args,store});assert.equal(first.ok,true,JSON.stringify(first));
  assert.equal(store.replay().length,2);
  const grant=evaluateMandate(store,{mandate_ref:proposal.mandate_id,expected_principal_ref:proposal.principal_ref,expected_actor_ref:proposal.logical_agent_ref,capability:'host.fs.read'});
  assert.equal(grant.granted,true,JSON.stringify(grant));
  assert.equal(issueVerifiedJohnRoot({...args,store}).error,'existing_authority_requires_versioned_amendment');
  assert.equal(store.replay().length,2);
 }finally{store.close();}
});
test('forged signature produces no events in canonical store',()=>{
 const store=createSqliteCopEventStore(':memory:');try{
  const invalid=issueVerifiedJohnRoot({...args,store,approval:{...approval,signature_base64:'AAAA'}});
  assert.equal(invalid.error,'signature_invalid');assert.equal(store.replay().length,0);
 }finally{store.close();}
});
