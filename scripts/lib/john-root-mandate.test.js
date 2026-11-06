import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {ROOT_MANDATE_KIND,RESERVED_ACTIONS,canonicalProposalBytes,proposalHash,publicKeyFingerprint,verifyJohnRootApproval as check} from './john-root-mandate.js';
const pair=generateKeyPairSync('ed25519');const pub=pair.publicKey.export({type:'spki',format:'pem'});
const other=generateKeyPairSync('ed25519');
const proposal={kind:ROOT_MANDATE_KIND,mandate_id:'mandate:jhn:john-root',version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',valid_from:'2026-01-01T00:00:00Z',valid_until:'2027-01-01T00:00:00Z',scope:{allowed_actions:['host.process.run','host.fs.read'],forbidden_actions:[...RESERVED_ACTIONS]},max_delegation_depth:3,budget_limits:{max_steps:1000,max_compute_seconds:36000}};
const approval=p=>({kind:'cogentia.principal-signature/v1',principal_ref:p.principal_ref,payload_hash:proposalHash(p),key_fingerprint:publicKeyFingerprint(pub),signature_base64:sign(null,canonicalProposalBytes(p),pair.privateKey).toString('base64')});
const checked=(p=proposal,a=approval(p),key=pub)=>check({proposal:p,approval:a,trustedPublicKeyPem:key,now:new Date('2026-11-05T12:00:00Z')});
test('valid offline principal signature is accepted without publishing authority',()=>{assert.equal(checked().ok,true);});
test('sensitive disclosure, payments and irreversible actions cannot be silently omitted from root prohibitions',()=>{
 for(const reserved of ['sensitive.disclose','private.disclose','purchase.execute','security.credentials.change','irreversible.delete']) {
  const narrowed={...proposal,scope:{...proposal.scope,forbidden_actions:RESERVED_ACTIONS.filter(a=>a!==reserved)}};
  assert.equal(checked(narrowed).error,'reserved_acts_not_prohibited',reserved);
 }
});
test('missing trust anchor and forged signer fail',()=>{
 assert.equal(checked(proposal,approval(proposal),null).error,'trusted_issuer_key_missing');
 const forged={...approval(proposal),signature_base64:sign(null,canonicalProposalBytes(proposal),other.privateKey).toString('base64')};
 assert.equal(checked(proposal,forged).error,'signature_invalid');
});
test('payload edits, revoked expiry, delegated forbidden rights and wildcards fail',()=>{
 assert.equal(checked({...proposal,max_delegation_depth:9},approval(proposal)).error,'approval_binding_mismatch');
 assert.equal(checked({...proposal,scope:{...proposal.scope,forbidden_actions:[]}}).error,'reserved_acts_not_prohibited');
 assert.equal(checked({...proposal,scope:{...proposal.scope,allowed_actions:['*']}}).error,'scope_missing_or_wildcard');
 assert.equal(checked({...proposal,scope:{...proposal.scope,allowed_actions:['gmail.send']}}).error,'scope_allow_deny_conflict');
 assert.equal(checked({...proposal,budget_limits:{max_steps:Infinity}}).error,'budget_limits_invalid');
 assert.equal(checked({...proposal,valid_until:'2026-10-01T00:00:00Z'}).error,'mandate_outside_validity');
});
