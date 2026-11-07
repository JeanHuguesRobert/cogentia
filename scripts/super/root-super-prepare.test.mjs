import test from 'node:test';
import assert from 'node:assert/strict';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {reserveProposedSuperEffect,prepareRootSuper} from './root-super-prepare.mjs';
import {claimSignedSuperEffect} from '../lib/principal-super-effect-claim.js';
import {composeRootEffectGrant} from './root-principal-effect-issue.mjs';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
const now=new Date('2026-11-07T08:00:00Z');
test('signed active mandate -> one reservation -> SSHSIG effect -> one claim -> materialization candidate',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cop-issuer-end-to-end-'));
 try{
  const store=createSqliteCopEventStore(join(dir,'cop.sqlite'));
  try{
   const ref='mandate:jhn:maintenance',budget_id='budget:'+ref;
   recordMandateDeclaration(store,{mandate_id:ref,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',valid_from:'2026-11-06T08:00:00Z',valid_until:'2026-12-07T08:00:00Z',scope:{allowed_actions:['host.process.run'],execution_mode:'super',target:'node:fracta2'}});
   recordExecutionBudgetGrant(store,{budget_id,mandate_ref:ref,principal_ref:'principal:jhn',limits:{max_steps:3}});
   const prepared=reserveProposedSuperEffect({store,command:'sudo -n systemctl restart mcp-cogentia.service && systemctl is-active mcp-cogentia.service',recovery_ref:'ssh:ThinkPad:fracta2',now});
   assert.equal(prepared.ok,true,JSON.stringify(prepared));
   assert.equal(prepared.grants_authority,false);
   assert.equal(reserveProposedSuperEffect({store,command:prepared.proposal.effect.command,recovery_ref:'ssh:ThinkPad:fracta2',now}).error,'previous_approval_pending_or_unreconciled');
   const key=join(dir,'key'),file=join(dir,'proposal');
   assert.equal(spawnSync('ssh-keygen',['-q','-t','ed25519','-N','','-f',key]).status,0);
   writeFileSync(file,prepared.canonical_to_sign);
   assert.equal(spawnSync('ssh-keygen',['-Y','sign','-f',key,'-n','cogentia-super-effect-v1',file]).status,0);
   const claim=claimSignedSuperEffect({store,proposal:prepared.proposal,signature:readFileSync(file+'.sig','utf8'),trustedPublicKey:readFileSync(key+'.pub','utf8'),now,issuerVerified:true});
   assert.equal(claim.ok,true,JSON.stringify(claim));
   const pending=composeRootEffectGrant({proposal:prepared.proposal,claim,now});
   assert.equal(pending.ok,true,JSON.stringify(pending));
   assert.equal(pending.grant.single_use,true);assert.equal(pending.grant.budget_reservation_id,prepared.reservation_id);
   assert.equal(claimSignedSuperEffect({store,proposal:prepared.proposal,signature:readFileSync(file+'.sig','utf8'),trustedPublicKey:readFileSync(key+'.pub','utf8'),now,issuerVerified:true}).error,'privileged_effect_already_claimed');
  }finally{store.close();}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('normal shell cannot call protected pre-reservation',()=>{
 if(process.geteuid?.()===0)return;
 assert.equal(prepareRootSuper({command:'id',recovery_ref:'ssh:ThinkPad',now}).error,'root_required');
});

test('expired unsigned reservation can be released; a claimed reservation cannot be recycled',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cop-stale-prepare-'));
 try{
  const store=createSqliteCopEventStore(join(dir,'cop.sqlite'));
  try{
   const ref='mandate:jhn:maintenance',budget_id='budget:'+ref;
   recordMandateDeclaration(store,{mandate_id:ref,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',valid_until:'2027-01-01T00:00:00Z',scope:{allowed_actions:['host.process.run']}});
   recordExecutionBudgetGrant(store,{budget_id,mandate_ref:ref,principal_ref:'principal:jhn',limits:{max_steps:3}});
   const first=reserveProposedSuperEffect({store,command:'sudo -n true',recovery_ref:'ssh:ThinkPad:fracta2',now:new Date()});
   assert.equal(first.ok,true,JSON.stringify(first));
   const later=new Date(Date.now()+12*60000);
   const next=reserveProposedSuperEffect({store,command:'sudo -n true',recovery_ref:'ssh:ThinkPad:fracta2',now:later});
   assert.equal(next.ok,true,JSON.stringify(next));assert.notEqual(next.reservation_id,first.reservation_id);
   const topic=`privileged-issuer:${next.reservation_id}`;
   store.append({event_type:'PrivilegedEffectClaim',topic:{id:topic,seq:1},epistemic_status:'normative',visibility:'restricted',payload:{kind:'PrivilegedEffectClaim',effect_hash:'test'}});
   assert.equal(reserveProposedSuperEffect({store,command:'sudo -n true',recovery_ref:'ssh:ThinkPad:fracta2',now:new Date(+later+12*60000)}).error,'previous_effect_claim_requires_reconciliation');
  }finally{store.close();}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
