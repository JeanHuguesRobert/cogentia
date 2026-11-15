import test from 'node:test';
import assert from 'node:assert/strict';
import {runChatgptCpsBrowserLoop} from './chatgpt-cps-browser-loop.js';

test('one invocation drives three separate governed browser turns and canonical MCP returns',async()=>{
 let received=0;
 const submitted=[];
 const done=await runChatgptCpsBrowserLoop({max_turns:3,
   next:async()=>received===3?{completed:true}:{ready:true,allowed:true,
     parent_packet_ref:'packet:parent',action_id:'next-predeclared-step'},
   prepare:async({step,parent_packet_ref})=>{
     assert.equal(parent_packet_ref,'packet:parent');
     return {continuation_id:`ctn_browser_${step+1}_test`,
       packet_ref:`packet:child:${step+1}`,prompt:`MCP result ${step+1}`};
   },
   dispatch:async({prepared})=>{
     submitted.push(prepared.continuation_id);
     return {ok:true,submitted:true,
       execution_receipt_ref:'cop:execution:'+prepared.continuation_id};
   },
   observeReturn:async({prepared,dispatch_receipt})=>{
     assert.equal(dispatch_receipt,'cop:execution:'+prepared.continuation_id);
     received++;
     return {ok:true,continuation_id:prepared.continuation_id,
       returned_receipt_ref:'cop:return:'+prepared.continuation_id,
       handler_receipt_ref:'cop:evaluator:'+prepared.continuation_id};
   },
 });
 assert.equal(done.ok,true,JSON.stringify(done));
 assert.equal(done.steps_completed,3);
 assert.equal(done.trace.length,3);
 assert.equal(done.autonomous_per_turn,true);
 assert.equal(done.persistent_worker,false);
 assert.deepEqual(submitted,['ctn_browser_1_test','ctn_browser_2_test','ctn_browser_3_test']);
});

test('ambiguous post-click delivery never triggers a second browser turn',async()=>{
 let dispatched=0;
 const done=await runChatgptCpsBrowserLoop({
   next:async()=>({ready:true,allowed:true,parent_packet_ref:'packet:p'}),
   prepare:async()=>({continuation_id:'ctn_browser_ambiguous',packet_ref:'packet:c',prompt:'test'}),
   dispatch:async()=>{dispatched++;return {ok:true,submitted:true,execution_receipt_ref:'cop:click'}},
   observeReturn:async()=>({ok:false}),
 });
 assert.equal(done.ok,false);
 assert.equal(done.status,'needs_reconciliation');
 assert.equal(dispatched,1);
 assert.equal(done.trace[0].stage,'return_ambiguous');
});

test('no independent parent grant means zero preparation and zero dispatch',async()=>{
 let calls=0;
 const done=await runChatgptCpsBrowserLoop({
   next:async()=>({allowed:false,ready:true,parent_packet_ref:'packet:p'}),
   prepare:async()=>{calls++;return null},
   dispatch:async()=>{calls++;return null},
   observeReturn:async()=>{calls++;return null},
 });
 assert.equal(done.ok,false);
 assert.equal(done.status,'mandate_or_next_step_unclear');
 assert.equal(calls,0);
});

test('max turn budget prevents unbounded continuation even with perpetual parent demand',async()=>{
 let dispatched=0;
 const done=await runChatgptCpsBrowserLoop({max_turns:2,
   next:async()=>({allowed:true,ready:true,parent_packet_ref:'packet:p'}),
   prepare:async({step})=>({continuation_id:'ctn_browser_step_'+step,packet_ref:'packet:c',prompt:'test'}),
   dispatch:async()=>{dispatched++;return {ok:true,submitted:true,execution_receipt_ref:'cop:click'}},
   observeReturn:async({prepared})=>({ok:true,continuation_id:prepared.continuation_id,
     returned_receipt_ref:'cop:return',handler_receipt_ref:'cop:evaluator'}),
 });
 assert.equal(done.ok,false);
 assert.equal(done.status,'step_limit');
 assert.equal(dispatched,2);
});
