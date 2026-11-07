import test from 'node:test';
import assert from 'node:assert/strict';
import {verifySignedEffectApproval,canonical,signedEffectDigest} from './principal-effect-issuer.mjs';
import {createHash} from 'node:crypto';
const sha=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
const e={action_class:'host.process.run',command:'sudo -n systemctl restart mcp-cogentia.service && systemctl is-active mcp-cogentia.service',execution_mode:'super',provider:'unix-process',target:'node:fracta2',timeout_ms:15000};
e.payload_hash=sha(canonical({capability:e.action_class,target:e.target,command:e.command,args:[],timeout_ms:e.timeout_ms,execution_mode:e.execution_mode,provider:e.provider}));
const now=Date.parse('2026-11-07T08:00:00Z');
const p={kind:'cogentia.super-effect-proposal/v1',principal_ref:'principal:jhn',actor_ref:'agent:jhn',mandate_ref:'mandate:jhn:maintenance',mandate_version:'v2',budget_reservation_id:'reservation:bound',issuer_evidence:'trusted:sshsig:thinkpad',recovery_ref:'recovery:independent-ssh',expires_at:new Date(now+120000).toISOString(),risk_control:'B',single_use:true,effect:e};
const approved=x=>verifySignedEffectApproval({proposal:x,signature:'-----BEGIN SSH SIGNATURE-----\nfixture',trustedPublicKey:'ssh-rsa TEST',now:new Date(now),verifySignature:()=>true});
test('exact signed scope verifies but cannot itself issue root authority',()=>{const r=approved(p);assert.equal(r.ok,true);assert.equal(r.grants_authority,false);assert.equal(r.proposal_hash,signedEffectDigest(p));});
test('rejects changed effect, budget, expiry, audience, and critical scope omissions',()=>{
 for(const x of [
  {...p,effect:{...e,command:'sudo reboot'}},
  {...p,effect:{...e,execution_mode:'normal'}},
  {...p,effect:{...e,target:'node:other'}},
  {...p,expires_at:new Date(now-1000).toISOString()},
  {...p,expires_at:new Date(now+86400000).toISOString()},
  {...p,budget_reservation_id:''},
  {...p,principal_ref:'principal:intruder'},
  {...p,unexpected:true}
 ])assert.equal(approved(x).ok,false,JSON.stringify(x).slice(0,145));
});
test('missing or invalid independent signature is never inferred from user message',()=>{
 assert.equal(verifySignedEffectApproval({proposal:p,now:new Date(now),trustedPublicKey:'ssh-rsa TEST'}).ok,false);
 assert.equal(verifySignedEffectApproval({proposal:p,now:new Date(now),signature:'-----BEGIN SSH SIGNATURE-----\ninvalid',trustedPublicKey:'ssh-rsa TEST',verifySignature:()=>false}).ok,false);
});
test('real SSHSIG validates exact bytes and rejects tampered signed proposal',async()=>{
 const {mkdtempSync,writeFileSync,readFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {spawnSync}=await import('node:child_process');
 const dir=mkdtempSync(join(tmpdir(),'cop-issuer-signed-'));
 try {
  const key=join(dir,'issuer'),proposal=join(dir,'proposal');
  const created=spawnSync('ssh-keygen',['-q','-t','ed25519','-N','','-f',key],{timeout:8000});
  assert.equal(created.status,0,created.stderr.toString());
  writeFileSync(proposal,canonical(p));
  const signed=spawnSync('ssh-keygen',['-Y','sign','-f',key,'-n','cogentia-super-effect-v1',proposal],{timeout:8000});
  assert.equal(signed.status,0,signed.stderr.toString());
  const signature=readFileSync(proposal+'.sig','utf8'), trustedPublicKey=readFileSync(key+'.pub','utf8');
  const accepted=verifySignedEffectApproval({proposal:p,signature,trustedPublicKey,now:new Date(now)});
  assert.equal(accepted.ok,true,JSON.stringify(accepted));
  const declined=verifySignedEffectApproval({proposal:{...p,issuer_evidence:'altered'},signature,trustedPublicKey,now:new Date(now)});
  assert.equal(declined.error,'principal_signature_invalid');
 } finally {rmSync(dir,{recursive:true,force:true});}
});
