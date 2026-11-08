import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordMandateDeclaration,recordMandateControl} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {executeMandatedMcpRestart,RESTART_SCOPE,RESTART_MANDATE} from './root-bounded-mcp-restart.mjs';
const start=new Date('2026-11-08T11:00:00Z');
function fixture({steps=3,until='2026-11-10T10:00:00Z',scope=RESTART_SCOPE,issuer='independent_sshsig'}={}){
 const dir=mkdtempSync(join(tmpdir(),'bounded-restart-cop-'));
 const store=createSqliteCopEventStore(join(dir,'cop.sqlite'));
 recordMandateDeclaration(store,{mandate_id:RESTART_MANDATE,version:'v1',principal_ref:'principal:jhn',
  logical_agent_ref:'agent:jhn',valid_from:'2026-11-08T10:00:00Z',valid_until:until,
  scope,metadata:{issuer,proposal_hash:'sha256:'+'a'.repeat(64)}});
 recordExecutionBudgetGrant(store,{budget_id:'budget:'+RESTART_MANDATE,mandate_ref:RESTART_MANDATE,
  principal_ref:'principal:jhn',limits:{max_steps:steps}});
 return {store,close(){store.close();rmSync(dir,{recursive:true,force:true})}};
}
test('one signed 48h mandate permits multiple accountable restarts but never exceeds 3 budgeted uses',async()=>{
 const f=fixture();let called=0;
 const run=async()=>{called++;return {ok:true}};
 try{
  for(let i=0;i<3;i++){
   const result=await executeMandatedMcpRestart({store:f.store,performRestart:run,now:start,clock:()=>start,requestId:`restart_${i+100000}`});
   assert.equal(result.ok,true,JSON.stringify(result));assert.equal(result.remaining,2-i);assert.equal(result.settled,true);
   assert.equal(result.receipt.mandate_ref,RESTART_MANDATE);
  }
  const denied=await executeMandatedMcpRestart({store:f.store,performRestart:run,now:start,clock:()=>start,requestId:'restart_100004'});
  assert.equal(denied.error,'budget_exhausted');assert.equal(called,3);
 }finally{f.close()}
});
test('expiry, revocation, wrong scope, and absent issuer refuse before restart',async()=>{
 for(const options of [
  {until:'2026-11-08T10:59:00Z'},
  {scope:{...RESTART_SCOPE,service:'other.service'}},
  {issuer:'agent_self_declared'},
 ]){
  const f=fixture(options);try{
   const result=await executeMandatedMcpRestart({store:f.store,now:start,clock:()=>start,requestId:'restart_100005',
     performRestart:()=>{throw Error('MUST NOT CALL')}});
   assert.equal(result.executed,false,JSON.stringify(result));
  }finally{f.close()}
 }
 const f=fixture();try{
  recordMandateControl(f.store,{principal_ref:'principal:jhn',mandate_ref:RESTART_MANDATE,action:'revoke',reason:'Principal stops deployment'});
  const result=await executeMandatedMcpRestart({store:f.store,now:start,clock:()=>start,requestId:'restart_100006',
    performRestart:()=>{throw Error('MUST NOT CALL')}});
  assert.equal(result.executed,false);
 }finally{f.close()}
});
test('failed dispatched restart consumes one step and never silently replays',async()=>{
 const f=fixture({steps:1});let called=0;
 try{
  const first=await executeMandatedMcpRestart({store:f.store,now:start,clock:()=>start,
   requestId:'restart_failure_01',performRestart:()=>{called++;throw Error('fixture failure')}});
  assert.equal(first.executed,true);assert.equal(first.settled,true);assert.equal(first.remaining,0);
  const again=await executeMandatedMcpRestart({store:f.store,now:start,clock:()=>start,
   requestId:'restart_failure_01',performRestart:()=>{called++;return {ok:true}}});
  assert.equal(again.executed,false);assert.equal(called,1);
 }finally{f.close()}
});
