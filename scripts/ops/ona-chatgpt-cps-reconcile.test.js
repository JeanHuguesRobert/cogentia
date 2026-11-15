import test from 'node:test';
import assert from 'node:assert/strict';
import {runScheduledHeartbeat,withOwnedCpsStore,runChatgptCpsResidentCycle} from './ona-chatgpt-cps-reconcile.mjs';
import {linkPacketChild,registerParentJoin,projectParentJoin} from '../../../inseme/packages/cop-core/src/packet-parent-continuations.js';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';

test('ONA existing-job adapter is disabled by default without opening credentials',async()=>{
  assert.deepEqual(await runScheduledHeartbeat({env:{}}),
    {ok:true,skipped:'not_enabled',external_effects:0});
});

test('opt-in requires existing independently pinned trusted public issuer key',async()=>{
  assert.deepEqual(await runScheduledHeartbeat({env:{COGENTIA_CPS_WAKE_RECOVERY_ENABLED:'1'}}),
    {ok:false,error:'trusted_issuer_not_configured'});
  assert.equal((await runScheduledHeartbeat({env:{
    COGENTIA_CPS_WAKE_RECOVERY_ENABLED:'1',
    COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS:'/no-such-issuer-test-file',
  }})).error,'canonical_store_or_issuer_unavailable');
});

test('actual Operium Node Agent script job imports the existing adapter without a browser action',async()=>{
  const {runScheduledJob}=await import('../../../operium/lib/node-agent/job-runner.js');
  const {fileURLToPath}=await import('node:url');
  const source=fileURLToPath(new URL('./ona-chatgpt-cps-reconcile.mjs',import.meta.url));
  const r=await runScheduledJob({job_id:'test:cps-local-replay',kind:'script',
    config:{script:source,cwd:'cogentia'}},
    {config:{env:{},hostname:'fracta2',jobTimeoutMs:5000},env:{}});
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.skipped,'not_enabled');
  assert.equal(r.external_effects,0);
});

test('FBF: asynchronous ONA scheduler completion retains SQLite ownership until after await',async()=>{
  const store=createSqliteCopEventStore(':memory:');
  const result=await withOwnedCpsStore(store,async(s)=>{
    await Promise.resolve();
    const before=s.replay().length;
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(s.replay().length,before);
    return 'completed_with_open_store';
  });
  assert.equal(result,'completed_with_open_store');
  assert.throws(()=>store.replay(),/closed|finalized|invalid/i);
});

test('existing ONA 60s cycle notifies linked parent after accepted child transitions',async()=>{
  const store=createSqliteCopEventStore(':memory:');
  try{
    const parent='continuation:ctn_parent_cycle_01';
    const child='continuation:ctn_child_cycle_01';
    const linked=linkPacketChild(store,{parent_ref:parent,child_ref:child});
    assert.equal(linked.ok,true);
    const wait=registerParentJoin(store,{parent_ref:parent,
      join_id:'cycle-join',mode:'all'});
    assert.equal(wait.ok,true);
    const appended=store.append({topic_id:child,event_type:'cop.event/v1',
      actor_id:'agent:child',subject_ref:child,epistemic_status:'decided',
      idempotency_key:'child:cycle:completed',
      payload:{profile:'cop.continuation-dispatch/v1',phase:'handler_completed',
        parent_packet_status:'completed'}});
    assert.equal(appended.ok,true);
    let calls=0;
    const inputs={store,reconcile:async()=>({ok:true,status:'queue_drained',
      steps_completed:0,pending_count:0,needs_reconciliation:0}),env:{},
      parentJoinExecutor:async({view})=>{calls++;assert.equal(view.completed,1);
        return {ok:true,receipt_ref:'scheduler:cycle-parent-wake'};}};
    const first=await runChatgptCpsResidentCycle(inputs);
    assert.equal(first.ok,true);
    assert.equal(first.parent_notifications,1);
    assert.equal(first.parent_join_resumptions,1);
    assert.equal(calls,1);
    assert.equal(projectParentJoin(store,{parent_ref:parent,join_id:'cycle-join'}).ready,true);
    const next=await runChatgptCpsResidentCycle(inputs);
    assert.equal(next.ok,true);
    assert.equal(next.parent_notifications,0);
    assert.equal(next.parent_join_resumptions,0);
    assert.equal(calls,1);
    assert.equal(store.auditCommitments().ok,true);
  }finally{store.close()}
});
