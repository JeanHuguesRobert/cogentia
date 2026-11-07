import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant,createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {claimSignedSuperEffect} from './principal-super-effect-claim.js';
import {canonical} from '../super/principal-effect-issuer.mjs';
import {createHash} from 'node:crypto';
const now=new Date('2026-11-07T08:00:00Z');
function fixture(){
 const store=createMemoryCopEventStore(),ref='mandate:jhn:maintenance';
 recordMandateDeclaration(store,{mandate_id:ref,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',scope:{allowed_actions:['host.process.run']}});
 const budget_id='budget:'+ref;
 recordExecutionBudgetGrant(store,{budget_id,mandate_ref:ref,principal_ref:'principal:jhn',limits:{max_steps:2}});
 const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id,limits:{max_steps:2},require_authority_grant:true});
 const reservation=ledger.reserve({idempotency_key:'one-act',expected_version:ledger.snapshot().version,demand:{max_steps:1}});
 assert.equal(reservation.ok,true);
 const effect={action_class:'host.process.run',command:'sudo -n systemctl restart mcp-cogentia.service && systemctl is-active mcp-cogentia.service',execution_mode:'super',provider:'unix-process',target:'node:fracta2',timeout_ms:15000};
 effect.payload_hash='sha256:'+createHash('sha256').update(canonical({capability:effect.action_class,target:effect.target,command:effect.command,args:[],timeout_ms:effect.timeout_ms,execution_mode:effect.execution_mode,provider:effect.provider})).digest('hex');
 const proposal={kind:'cogentia.super-effect-proposal/v1',actor_ref:'agent:jhn',principal_ref:'principal:jhn',mandate_ref:ref,mandate_version:'v1',budget_reservation_id:reservation.reservation.reservation_id,issuer_evidence:'signed:thinkpad',recovery_ref:'ssh:independent',expires_at:'2026-11-07T08:05:00Z',risk_control:'B',single_use:true,effect};
 return {store,proposal,signature:'-----BEGIN SSH SIGNATURE-----\nfixture',trustedPublicKey:'ssh-rsa TEST',now,verifiedSignature:()=>true,issuerVerified:true};
}
test('one COP claim per reservation; no executable authority, durable duplicate rejection',()=>{
 const f=fixture();const first=claimSignedSuperEffect(f);
 assert.equal(first.ok,true,JSON.stringify(first));assert.equal(first.grant,null);assert.equal(first.phase,'COP_CLAIMED_NOT_ISSUED');
 const again=claimSignedSuperEffect(f);
 assert.equal(again.ok,false);assert.equal(again.error,'privileged_effect_already_claimed');
 assert.equal(f.store.listTopic(`privileged-issuer:${first.budget_reservation_id}`).length,1);
});
test('cannot claim with absent proof or wrong mandate',()=>{
 const f=fixture();assert.equal(claimSignedSuperEffect({...f,verifiedSignature:()=>false}).ok,false);
 assert.equal(claimSignedSuperEffect({...f,proposal:{...f.proposal,mandate_version:'v3'}}).ok,false);
 assert.equal(f.store.replay().filter(e=>e.event_type==='PrivilegedEffectClaim').length,0);
});
test('canonical SQLite topic sequence rejects a second claim across separate store handles',async()=>{
 const {createSqliteCopEventStore}=await import('../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js');
 const {mkdtempSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const dir=mkdtempSync(join(tmpdir(),'cop-claim-sqlite-'));
 try{
  const file=join(dir,'canonical.sqlite');
  const f=fixture(), sqlite=createSqliteCopEventStore(file);
  for(const e of f.store.replay())assert.equal(sqlite.append(e).ok,true);
  const other=createSqliteCopEventStore(file);
  try{
   const first=claimSignedSuperEffect({...f,store:sqlite});
   assert.equal(first.ok,true,JSON.stringify(first));
   const again=claimSignedSuperEffect({...f,store:other});
   assert.equal(again.ok,false);assert.equal(again.error,'privileged_effect_already_claimed');
   assert.equal(other.listTopic(`privileged-issuer:${first.budget_reservation_id}`).length,1);
  }finally{other.close();sqlite.close();}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
