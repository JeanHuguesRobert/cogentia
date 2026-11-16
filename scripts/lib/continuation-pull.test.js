import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {linkPacketChild,registerParentJoin,projectParentJoin}
 from '../../../inseme/packages/cop-core/src/packet-parent-continuations.js';
import {changePacketTemperature} from '../../../inseme/packages/cop-core/src/packet-temperature.js';
import {COPScheduler} from '../../../inseme/packages/cop-kernel/src/scheduler.js';
import {COPBus} from '../../../inseme/packages/cop-kernel/src/bus.js';
import {pullReadyContinuations} from './continuation-pull.js';
import {runFractaCycle,createSchedulerRunContext} from './fracta-scheduler.js';

const P='continuation:cps-pull-root',A='continuation:cps-pull-a',B='continuation:cps-pull-b';
const H=[{id:'handler:local',node:'fracta2',available:true,capabilities:['test.compute']}];
const make=id=>({id,version:1,status:'active',created_at:'2026-11-15T12:00:00.000Z',
  resumeTo:'capability:compute',required_capabilities:['test.compute']});
const C=[make('cps-pull-a'),make('cps-pull-b')];
const admit=async()=>({granted:true,authorization_ref:'test:principal-mandate-budget-approved'});
const handler=async(_cap,continuation)=>({execute:async()=>({
  ok:true,receipt_ref:'artifact:result:'+continuation.continuationId,
  packet_status:'completed'})});
const setup=store=>{
  for(const child_ref of [A,B])assert.equal(linkPacketChild(store,{parent_ref:P,child_ref}).ok,true);
  assert.equal(registerParentJoin(store,{parent_ref:P,join_id:'all-children',mode:'all'}).ok,true);
};
const pull=(store,extra={})=>pullReadyContinuations({store,continuations:C,
  handlers:H,node:'fracta2',now:'2026-11-16T12:00:00.000Z',
  handlerResolver:handler,admit,...extra});

test('existing FractaScheduler pull→COPScheduler→PacketClaim→handler→child results→join parent',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'cop-pull-parent-')),db=join(dir,'journal.sqlite');
 try{
  let store=createSqliteCopEventStore(db);setup(store);
  let parentCalls=0;
  const scheduler=new COPScheduler(new COPBus({name:'join-existing-cop-scheduler'}),{
    handlerResolver:async()=>({execute:async({payload})=>{
      parentCalls++;assert.equal(payload.join.completed,2);
      return {accepted:true};
    }}),
  });
  const execute=async({view,parent_ref})=>{
   const resumed=await scheduler.execute({continuationId:parent_ref.slice(13),
     resumeTo:'handler:join-aggregation'}, {reason:'children_completed',payload:{join:view}});
   assert.equal(resumed.execution.result.accepted,true);
   return {ok:true,receipt_ref:'scheduler:join-parent-executed'};
  };
  const first=await pull(store,{parentJoinExecutor:execute});
  assert.equal(first.ok,true,JSON.stringify(first));
  assert.equal(first.work_executed,2);
  assert.equal(first.parent_notifications,2);
  assert.equal(first.parent_resumptions,1);
  assert.equal(parentCalls,1);
  assert.equal(projectParentJoin(store,{parent_ref:P,join_id:'all-children'}).ready,true);
  assert.equal(store.auditCommitments().ok,true);
  store.close();store=createSqliteCopEventStore(db);
  const again=await pull(store,{parentJoinExecutor:execute});
  assert.equal(again.work_executed,0);
  assert.equal(again.parent_notifications,0);
  assert.equal(again.parent_resumptions,0);
  assert.equal(parentCalls,1);
  assert.equal(again.findings.filter(f=>f.status==='already_settled').length,2);
  assert.equal(store.auditCommitments().ok,true);
  store.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('park root, resume only root, and resume selected child only permits that handler',async()=>{
 const store=createSqliteCopEventStore(':memory:');try{
  setup(store);
  assert.equal(changePacketTemperature(store,{packet_ref:P,temperature:'parked',transition_id:'park-all'}).ok,true);
  assert.equal((await pull(store)).work_executed,0);
  assert.equal(changePacketTemperature(store,{packet_ref:P,temperature:'active',transition_id:'resume-parent'}).ok,true);
  assert.equal((await pull(store)).work_executed,0);
  assert.equal(changePacketTemperature(store,{packet_ref:A,temperature:'active',transition_id:'resume-a'}).ok,true);
  const selective=await pull(store);
  assert.equal(selective.work_executed,1);
  assert.equal(selective.findings.find(f=>f.continuation_id==='cps-pull-a').status,'executed');
  assert.equal(selective.parent_notifications,1);
  assert.equal(projectParentJoin(store,{parent_ref:P,join_id:'all-children'}).ready,false);
  assert.equal(store.listTopic(B).filter(e=>e.payload?.phase==='dispatch_intent').length,0);
 }finally{store.close()}
});

test('without independent admission no handler may run even if capability matches',async()=>{
 const s=createSqliteCopEventStore(':memory:');try{
  let effects=0;
  const result=await pull(s,{admit:async()=>({granted:false}),
    handlerResolver:async()=>({execute:async()=>{effects++;return {ok:true}}})});
  assert.equal(result.work_executed,0);assert.equal(effects,0);
  assert.equal(result.findings.filter(x=>x.status==='not_admitted').length,2);
  assert.equal(s.replay().length,0);
 }finally{s.close()}
});

test('ambiguous receipt remains fenced across retries; never repeat a possible effect',async()=>{
 const store=createSqliteCopEventStore(':memory:');try{
  let effects=0;
  const attempt=()=>pull(store,{continuations:[C[0]],
    handlerResolver:async()=>({execute:async()=>{
      effects++;return {ok:true,packet_status:'completed'};
    }})});
  const first=await attempt();
  assert.equal(first.work_executed,0);
  assert.equal(first.findings[0].status,'needs_reconciliation');
  assert.equal(effects,1);
  const second=await attempt();
  assert.equal(second.findings[0].status,'needs_reconciliation');
  assert.equal(effects,1);
  assert.equal(store.auditCommitments().ok,true);
 }finally{store.close()}
});

function launch(file,host){
 return new Promise((resolve,reject)=>{
  const script=`import {createSqliteCopEventStore} from ${JSON.stringify(new URL('../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js',import.meta.url).href)};import {pullReadyContinuations} from ${JSON.stringify(new URL('./continuation-pull.js',import.meta.url).href)};const s=createSqliteCopEventStore(process.argv[1]);try{const res=await pullReadyContinuations({store:s,continuations:[{id:'cps-pull-a',version:1,status:'active',created_at:'2026-11-15T12:00:00.000Z',resumeTo:'capability:compute',required_capabilities:['test.compute']}],handlers:[{id:'handler:local',node:'fracta2',available:true,capabilities:['test.compute']}],node:'fracta2',now:'2026-11-16T12:00:00Z',admit:async()=>({granted:true,authorization_ref:'test:approved'}),handlerResolver:async()=>({execute:async()=>{await new Promise(r=>setTimeout(r,100));return {ok:true,receipt_ref:'artifact:race-test',packet_status:'completed'};}})});console.log(JSON.stringify({host:process.argv[2],...res}));}finally{s.close()}`;
  const p=spawn(process.execPath,['--input-type=module','-e',script,file,host],{stdio:['ignore','pipe','pipe']});
  let out='',err='';const timer=setTimeout(()=>{p.kill();reject(Error('worker_timeout'))},15000);
  p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);
  p.on('error',e=>{clearTimeout(timer);reject(e)});
  p.on('close',c=>{clearTimeout(timer);if(c!==0)reject(Error(err));else{
   try{resolve(JSON.parse(out.trim().split("\n").at(-1)))}catch(e){reject(new Error(out+"\n"+err+"\n"+e.message))}
  }});
 });
}

test('two independent processes drain same ready candidate; one handler and no replay',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'cop-two-drainers-')),file=join(dir,'cop.sqlite');
 try{
  let s=createSqliteCopEventStore(file);s.close();
  const [a,b]=await Promise.all([launch(file,'fracta2'),launch(file,'thinkpad')]);
  assert.equal(a.work_executed+b.work_executed,1,JSON.stringify([a,b]));
  s=createSqliteCopEventStore(file);
  assert.equal(s.listTopic(A).filter(e=>e.payload?.phase==='dispatch_settled').length,1);
  assert.equal(s.listTopic(A).filter(e=>e.payload?.phase==='handler_completed').length,1);
  assert.equal(s.auditCommitments().ok,true);
  s.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});


test('real FractaScheduler cycle uses the bounded pull adapter and reports parent progress',async()=>{
 const store=createSqliteCopEventStore(':memory:');try{
  setup(store);
  const result=await runFractaCycle(createSchedulerRunContext({}, {mode:'quick'}),{
    pullContinuations:async({max_steps})=>pull(store,{max_steps}),
  });
  assert.equal(result.ok,true);
  assert.equal(result.metrics.workPullExecuted,2);
  assert.equal(result.stages.find(x=>x.name==='cop_continuation_work_pull').status,'success');
  assert.equal(projectParentJoin(store,{parent_ref:P,join_id:'all-children'}).ready,true);
  const again=await runFractaCycle(createSchedulerRunContext({}, {mode:'quick'}),{
    pullContinuations:async({max_steps})=>pull(store,{max_steps}),
  });
  assert.equal(again.metrics.workPullExecuted,0);
  assert.equal(store.auditCommitments().ok,true);
 }finally{store.close()}
});
