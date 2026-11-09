import test from 'node:test';import assert from 'node:assert/strict';
import {copReviewPacket,copConsentIntent} from './cop-consent-packet.js';
import {mandateProposalHash} from './cop-proposal-digest.js';
const p={kind:'cop.mandate-amendment.proposal/v1',mandate_ref:'mandate:jhn:demo',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',previous_version:'v1',new_version:'v2',reason:'A scoped example',scope:{allowed_actions:['corpus.read']}};
test('shared read-only packet/consent intent never grants authority',()=>{
 const r=copReviewPacket(p);const i=copConsentIntent(r,'approve',{channel:'mcp-app'});
 assert.equal(i.grants_mandate_authority,false);assert.equal(i.issuer_verified,false);assert.equal(i.human_authentication,'not_verified');assert.equal(i.decision,'approve');
 assert.equal(copConsentIntent(r,'refuse').decision,'refuse');
});
test('reject changed proposal and arbitrary decision',()=>{
 const r=copReviewPacket(p);
 assert.throws(()=>copConsentIntent({...r,proposal:{...p,reason:'Altered'}},'approve'),{code:'CONSENT_PAYLOAD_MISMATCH'});
 assert.throws(()=>copConsentIntent(r,'execute'),{code:'CONSENT_DECISION_INVALID'});
 assert.throws(()=>copReviewPacket({...p,principal_ref:'principal:other'}),{code:'CONSENT_PROPOSAL_INVALID'});
});

test('digest is identical across semantically equal JSON property order and A2A serialization',()=>{
 const reversed=Object.fromEntries(Object.entries(p).reverse());
 assert.equal(copReviewPacket(p).payload_hash,copReviewPacket(reversed).payload_hash);
 assert.equal(copReviewPacket(p).payload_hash,mandateProposalHash(p));
});
