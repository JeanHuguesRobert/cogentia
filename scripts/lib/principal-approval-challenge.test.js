import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {authenticateOAuthPrincipalSession} from './principal-oauth-session.js';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {requestPrincipalApproval as request,confirmPrincipalApproval as confirm,inspectPrincipalApproval as inspect} from './principal-approval-challenge.js';
const approvalProof='trusted-ui-gesture-test';
const verifyHumanConfirmation=async ({approvalProof:proof,challenge_id,payload_hash})=>proof===approvalProof&&!!challenge_id&&payload_hash==='sha256:'+'a'.repeat(64);
const hash='sha256:'+'a'.repeat(64),now=new Date('2026-11-05T13:00:00Z'),expires_at='2026-11-05T13:05:00Z';
const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const issuer='https://issuer.test',audience='https://cogentia.test/mcp';
async function verifiedSession(clock=now){
 const header=Buffer.from(JSON.stringify({alg:'RS256',kid:'test'})).toString('base64url');
 const body=Buffer.from(JSON.stringify({iss:issuer,aud:audience,sub:'human',scope:'cogentia.principal.approve',exp:Math.floor(+clock/1000)+600})).toString('base64url');
 const raw=header+'.'+body;
 const token=raw+'.'+sign('RSA-SHA256',Buffer.from(raw),privateKey).toString('base64url');
 const jwk={...publicKey.export({format:'jwk'}),kid:'test',alg:'RS256',use:'sig'};
 return authenticateOAuthPrincipalSession(token,{issuer,audience,jwksUrl:issuer+'/jwks',nowMs:+clock,
   bindingsJson:JSON.stringify([{issuer,subject:'human',principal:'principal:jhn'}]),
   fetch:async()=>({ok:true,json:async()=>({keys:[jwk]})})});
}

test('exact payload confirmation is a single COP CAS event, replay refused',async()=>{
 const session=await verifiedSession();assert.equal(session.ok,true);
 const store=createSqliteCopEventStore(':memory:');try{
  const r=request({store,payload_hash:hash,action_class:'host.process.run',now,expires_at});assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal((await confirm({store,challenge_id:r.challenge_id,payload_hash:'sha256:'+'b'.repeat(64),session,approvalProof,verifyHumanConfirmation,now})).error,'approval_payload_mismatch');
  assert.equal((await confirm({store,challenge_id:r.challenge_id,payload_hash:hash,session,now})).error,'human_confirmation_required');
 assert.equal((await confirm({store,challenge_id:r.challenge_id,payload_hash:hash,session,approvalProof:'forged',verifyHumanConfirmation,now})).error,'human_confirmation_invalid');
 const c=await confirm({store,challenge_id:r.challenge_id,payload_hash:hash,session,approvalProof,verifyHumanConfirmation,now});assert.equal(c.ok,true,JSON.stringify(c));
  assert.equal(c.grants_mandate_authority,false);
  assert.equal((await confirm({store,challenge_id:r.challenge_id,payload_hash:hash,session,approvalProof,verifyHumanConfirmation,now})).error,'challenge_missing_or_consumed');
  assert.equal(store.listTopic('principal-approval:'+r.challenge_id).length,2);
 }finally{store.close();}
});
test('missing session and expired challenge deny without issuing events',async()=>{
 const session=await verifiedSession();
 const store=createSqliteCopEventStore(':memory:');try{
  const r=request({store,payload_hash:hash,action_class:'host.process.run',now,expires_at});
  assert.equal((await confirm({store,challenge_id:r.challenge_id,payload_hash:hash,session:null,now})).error,'verified_principal_session_required');
  assert.equal((await confirm({store,challenge_id:r.challenge_id,payload_hash:hash,session:{...session},now})).error,'verified_principal_session_required');
  assert.equal((await confirm({store,challenge_id:r.challenge_id,payload_hash:hash,session,approvalProof,verifyHumanConfirmation,now:new Date('2026-11-05T13:06:00Z')})).error,'challenge_expired');
  assert.equal(store.listTopic('principal-approval:'+r.challenge_id).length,1);
 }finally{store.close();}
});

test('canonical receipt inspection binds original operation and request lineage',async()=>{
 const current=new Date(),expiry=new Date(+current+300000).toISOString();
 const session=await verifiedSession(current);assert.equal(session.ok,true);
 const store=createSqliteCopEventStore(':memory:');try{
  const challenge=request({store,payload_hash:hash,action_class:'host.process.run',now:current,expires_at:expiry});
  assert.equal(inspect({store,challenge_id:challenge.challenge_id,payload_hash:hash,action_class:'host.process.run'}).error,'approval_not_confirmed');
  const result=await confirm({store,challenge_id:challenge.challenge_id,payload_hash:hash,session,approvalProof,verifyHumanConfirmation,now:current});
  assert.equal(result.ok,true,JSON.stringify(result));
  const receipt=inspect({store,challenge_id:challenge.challenge_id,payload_hash:hash,action_class:'host.process.run'});
  assert.equal(receipt.ok,true,JSON.stringify(receipt));
  assert.equal(receipt.grants_mandate_authority,false);
  assert.equal(inspect({store,challenge_id:challenge.challenge_id,payload_hash:hash,action_class:'gmail.send'}).error,'approval_lineage_mismatch');
  assert.equal(inspect({store,challenge_id:challenge.challenge_id,payload_hash:'sha256:'+'b'.repeat(64),action_class:'host.process.run'}).error,'approval_lineage_mismatch');
 }finally{store.close();}
});
