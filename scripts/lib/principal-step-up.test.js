import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {authenticateOAuthPrincipalSession} from './principal-oauth-session.js';
import {createPrincipalStepUpVerifier} from './principal-step-up.js';
import {requestPrincipalApproval,confirmPrincipalApproval} from './principal-approval-challenge.js';
const kp=generateKeyPairSync('rsa',{modulusLength:2048});
const issuer='https://identity.example.test',audience='https://cogentia.example.test/mcp';
const nowMs=Date.now(),subject='human-abc',hash='sha256:'+'c'.repeat(64);
const jwk={...kp.publicKey.export({format:'jwk'}),kid:'issuer-test',alg:'RS256',use:'sig'};
const config={issuer,audience,jwksUrl:issuer+'/jwks',bindingsJson:JSON.stringify([{issuer,subject,principal:'principal:jhn'}]),fetch:async()=>({ok:true,json:async()=>({keys:[jwk]})})};
function token(claims={}){
 const h=Buffer.from(JSON.stringify({alg:'RS256',kid:'issuer-test'})).toString('base64url');
 const b=Buffer.from(JSON.stringify({iss:issuer,aud:audience,sub:subject,exp:Math.floor(nowMs/1000)+600,scope:'cogentia.principal.approve',...claims})).toString('base64url');
 const input=h+'.'+b;return input+'.'+sign('RSA-SHA256',Buffer.from(input),kp.privateKey).toString('base64url');
}
test('fresh signed step-up for one exact COP challenge, not a grant',async()=>{
 const store=createSqliteCopEventStore(':memory:');try{
  const session=await authenticateOAuthPrincipalSession(token(),{...config,nowMs});assert.equal(session.ok,true);
  const request=requestPrincipalApproval({store,payload_hash:hash,action_class:'host.process.run',now:new Date(nowMs),expires_at:new Date(nowMs+300000).toISOString()});assert.equal(request.ok,true);
  const verifier=createPrincipalStepUpVerifier({...config,nowMs:()=>nowMs});
  const approval={challenge_id:request.challenge_id,payload_hash:hash,action_class:'host.process.run',confirmed:true};
  const proof=token({cogentia_approval:approval,auth_time:Math.floor(nowMs/1000),amr:['user_presence']});
  const confirmed=await confirmPrincipalApproval({store,challenge_id:request.challenge_id,payload_hash:hash,session,approvalProof:proof,verifyHumanConfirmation:verifier,now:new Date(nowMs)});
  assert.equal(confirmed.ok,true,JSON.stringify(confirmed));assert.equal(confirmed.grants_mandate_authority,false);
  const replay=await confirmPrincipalApproval({store,challenge_id:request.challenge_id,payload_hash:hash,session,approvalProof:proof,verifyHumanConfirmation:verifier,now:new Date(nowMs)});
  assert.equal(replay.error,'challenge_missing_or_consumed');
 }finally{store.close();}
});
test('generic bearer and wrong signed transaction do not confirm',async()=>{
 const store=createSqliteCopEventStore(':memory:');try{
  const session=await authenticateOAuthPrincipalSession(token(),{...config,nowMs});
  const request=requestPrincipalApproval({store,payload_hash:hash,action_class:'host.process.run',now:new Date(nowMs),expires_at:new Date(nowMs+300000).toISOString()});
  const verifier=createPrincipalStepUpVerifier({...config,nowMs:()=>nowMs});
  for(const proof of [token(),token({auth_time:Math.floor(nowMs/1000),amr:['user_presence'],cogentia_approval:{challenge_id:request.challenge_id,payload_hash:hash,action_class:'gmail.send',confirmed:true}})]){
   const denied=await confirmPrincipalApproval({store,challenge_id:request.challenge_id,payload_hash:hash,session,approvalProof:proof,verifyHumanConfirmation:verifier,now:new Date(nowMs)});
   assert.equal(denied.error,'human_confirmation_invalid');
  }
  assert.equal(store.listTopic('principal-approval:'+request.challenge_id).length,1);
 }finally{store.close();}
});
