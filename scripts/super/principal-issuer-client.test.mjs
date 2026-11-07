import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildIssuerRequest,sendIssuerRequest} from './principal-issuer-client.mjs';
test('client transport cannot mint rights and preserves exact signed effect material',()=>{
 const dir=mkdtempSync(join(tmpdir(),'issuer-client-'));
 try{
  const proposal={kind:'cogentia.super-effect-proposal/v1',actor_ref:'agent:jhn',principal_ref:'principal:jhn',mandate_ref:'mandate:jhn:maintenance',
   effect:{command:'sudo -n id -u',target:'node:fracta2',provider:'unix-process',timeout_ms:15000}};
  const p=join(dir,'proposal'),s=join(dir,'sig');writeFileSync(p,JSON.stringify(proposal));writeFileSync(s,'signed-proof');
  assert.equal(buildIssuerRequest(['enroll',p,s]).signature,'signed-proof');
  assert.equal(buildIssuerRequest(['issue',p,s]).proposal.effect.command,proposal.effect.command);
  assert.equal(buildIssuerRequest(['run','sea:trusted',p]).script,proposal.effect.command);
  assert.equal(buildIssuerRequest(['prepare','sudo -n true','ssh:independent']).recovery_ref,'ssh:independent');
  assert.equal(buildIssuerRequest(['unknown']),null);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('transport rejects missing parameters and does not generate authorization',async()=>{
 assert.equal(buildIssuerRequest(['issue']),null);
 assert.equal((await sendIssuerRequest(null)).error,'invalid_request');
});
