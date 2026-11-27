/** Disposable COP composition fixture; never installed as an MCP provider.
 * Read-only calls use actual hosted capabilities. The effect is suspended
 * and executed by the independent John bounded-runner fixture, never Alan.
 */
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {createMultiMcpProgramRuntime} from '../lib/multimcp-program.mjs';
import {createMultiMcpCopBridge,MULTIMCP_PROGRAM_TOOL} from '../lib/multimcp-cop-bridge.mjs';
import {packetTopicForMcpTask} from '../lib/mcp-tasks-cop-pilot.mjs';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {runJohnRequest} from '../lib/john-run.js';

export async function proveBrowserComposition({dir,caps,request,readValue}){
 const AUTH={auth:'none'},args=request.input.arguments;
 const store=createSqliteCopEventStore(join(dir,'multimcp-fixture.sqlite'));
 const form=caps.find(c=>c.name==='browser.form.fill');
 const selected=caps.filter(c=>['browser.navigation.instances','browser.hosted.inspect','browser.form.fill'].includes(c.name));
 const reads=selected.filter(c=>c.risk==='read_only');
 let bridge,dispatched=0,admitted=0,denied=0,allow=true,verifiedReceipt=null;
 const provider={async handleJsonRpc(message){
  if(message.method==='tools/list')return {result:{tools:selected.map(c=>({
   name:c.name,inputSchema:c.inputSchema,annotations:{readOnlyHint:c.risk==='read_only'}
  }))}};
  const cap=reads.find(c=>c.name===message.params.name);
  if(!cap)throw Error('fixture_effect_must_be_suspended');
  dispatched++;
  return {result:{structuredContent:await cap.execute(message.params.arguments)}};
 }};
 const runtime=createMultiMcpProgramRuntime({providers:{browser:provider},
  authorizeCall:async({context,tool})=>{
   if(!allow||context.auth!==AUTH||!context.taskId||tool.executionClass!=='read_only'){denied++;return false}
   admitted++;return true;
  }});
 const q=JSON.stringify;
 const target=args.element_target;
 const readArgs={action:'frame_structure',browser_instance_id:args.browser_instance_id,tab_id:args.tab_id,
  expected_url:args.expected_url,frame_id:target.frame_id,expected_frame_origin:args.expected_frame_origin,
  include_element_identity:true};
 const targetLiteral='{'+Object.entries(target).map(([k,v])=>k+':'+q(v)).join(',')+'}';
 const readLine=Object.entries(readArgs).map(([k,v])=>k+'='+q(v)).join(' ');
 const fillLine=Object.entries(args).map(([k,v])=>k+'='+(k==='element_target'?targetLiteral:q(v))).join(' ');
 const code=[
  'alan 0.2','use std.mcp',
  'extern browser.browser.navigation.instances','kind tool','effect read_only','data public','policy P1','input { }','output { value: any }','end',
  'extern browser.browser.hosted.inspect','kind tool','effect read_only','data public','policy P1',
  'input { action: string, browser_instance_id: string, tab_id: int, expected_url: string, frame_id: string, expected_frame_origin: string, include_element_identity: bool }','output { value: any }','end',
  // Alan v0.2 has no internal_recoverable effect literal; conservatively use P3,
  // while the real provider catalog and John gate determine dispatch.
  'extern browser.browser.form.fill','kind tool','effect private_data_access','data private','policy P3',
  'input { browser_instance_id: string, tab_id: int, expected_url: string, element_target: any, expected_frame_origin: string, text: string }','output { value: any }','end',
  'fn main','  found = mcp browser.browser.navigation.instances',
  '  seen = mcp browser.browser.hosted.inspect '+readLine,
  '  filled = mcp browser.browser.form.fill '+fillLine,
  '  return discovery=$found.value structure=$seen.value receipt=$filled.value','end'
 ].join('\n');
 async function until(taskId,status){
  for(let i=0;i<200;i++){
   const state=await bridge.adapter.get({taskId,auth:AUTH});
   if(state.status===status)return state;
   if(state.status==='failed')throw Error('composition_failed:'+JSON.stringify(state.error));
   await delay(20);
  }throw Error('composition_timeout:'+status);
 }
 function open(){
  bridge=createMultiMcpCopBridge({runtime,store,allowAnonymous:true,
   primaryStoreId:'sqlite:firefox-reality',ownerInstanceRef:'instance:firefox-reality',
   authorizationForTask:async()=>AUTH,
   verifyExternalResult:async({taskId,candidate,pending,suspension})=>{
    if(!verifiedReceipt||taskId!==verifiedReceipt.taskId||candidate?.receipt_ref!==verifiedReceipt.ref||
      pending.capability!=='browser.browser.form.fill'||pending.slot_ordinal!==2||
      JSON.stringify(pending.input)!==JSON.stringify(suspension.pending_call.input)||
      Object.keys(args).some(k=>JSON.stringify(pending.input[k])!==JSON.stringify(args[k])))return {verified:false};
    const row=store.listTopic(packetTopicForMcpTask(taskId)).find(e=>e.idempotency_key===verifiedReceipt.ref);
    if(!row||row.payload?.accounting?.internal_effects!==1||row.payload.accounting.external_effects!==0||
      row.payload.receipt?.ok!==true)return {verified:false};
    return {verified:true,receipt_ref:verifiedReceipt.ref,value:{value:row.payload.receipt}};
   }});
  bridge.start();
 }
 try{
  open();
  allow=false;
  const rejected=await bridge.adapter.create({name:MULTIMCP_PROGRAM_TOOL,auth:AUTH,args:{language:'alan',code,maxCalls:3}});
  const failure=await until(rejected.taskId,'failed');
  assert.match(failure.error.message,/program_tool_authority_denied/);
  assert.equal(dispatched,0);assert.equal(denied,1);
  allow=true;
  const before=await readValue();
  const {taskId}=await bridge.adapter.create({name:MULTIMCP_PROGRAM_TOOL,auth:AUTH,args:{language:'alan',code,maxCalls:3,timeoutMs:10000}});
  await until(taskId,'input_required');
  assert.equal(dispatched,2);assert.equal(admitted,2);assert.equal(await readValue(),before);
  const openEvent=store.listTopic(packetTopicForMcpTask(taskId)).findLast(e=>e.payload?.phase==='input_required');
  assert.equal(openEvent.payload.pending.capability,'browser.browser.form.fill');
  assert.deepEqual(openEvent.payload.pending.input,args);
  await assert.rejects(bridge.adapter.acceptVerifiedExternalResult(taskId,AUTH,{receipt_ref:'fake'}),/verified_cps_result_required/);
  bridge.stop();open();
  assert.equal((await bridge.recover()).waiting_input,1);
  assert.equal(dispatched,2);
  const result=await runJohnRequest({...request,request_id:'multimcp-firefox-bounded-fixture'},{
   capabilities:[form],allowedCapabilities:[form.name],maxInternalEffects:1,requiredEvents:false,approvedBoundedOnceCapability:form.name});
  const accounting=result.find(e=>e.type==='john.accounting.settled')?.data;
  assert.equal(accounting?.internal_effects,1);assert.equal(accounting?.external_effects,0);
  assert.ok(result.some(e=>e.type==='john.run.completed'));assert.equal(await readValue(),args.text);
  const receipt=JSON.parse(result.find(e=>e.type==='john.run.completed').data.result.text);
  assert.equal(receipt.ok,true);assert.equal(receipt.submitted,false);
  assert.equal(receipt.inserted_length,args.text.length);assert.deepEqual(receipt.element_target,target);
  const ref='fixture:john:'+taskId;
  const appended=store.append({topic_id:packetTopicForMcpTask(taskId),event_type:'cop.event/v1',
   actor_id:'cop:fixture',subject_ref:taskId,visibility:'restricted',epistemic_status:'observed',
   idempotency_key:ref,payload:{profile:'fixture.browser.effect/v1',receipt,accounting}});
  assert.equal(appended.ok,true);
  verifiedReceipt={taskId,ref};
  assert.equal((await bridge.adapter.acceptVerifiedExternalResult(taskId,AUTH,{receipt_ref:ref})).ok,true);
  const done=await until(taskId,'completed');
  assert.equal(done.result.structuredContent.calls,3);
  assert.equal(done.result.structuredContent.value.receipt.ok,true);
  assert.ok(done.result.structuredContent.value.discovery.browsers.some(b=>b.browser_instance_id===args.browser_instance_id));
  assert.deepEqual(done.result.structuredContent.value.structure.fields[0].element_target,target);
  assert.equal(dispatched,2);
  assert.equal((await bridge.adapter.acceptVerifiedExternalResult(taskId,AUTH,{receipt_ref:ref})).duplicate,true);
  assert.equal(bridge.pilot.auditPacket(taskId).ok,true);
  bridge.stop();open();assert.equal((await bridge.recover()).scheduled,0);
  assert.equal((await bridge.adapter.get({taskId,auth:AUTH})).status,'completed');
  assert.equal(dispatched,2);
  return {calls:3,read_calls:2,internal_effects:1,external_effects:0,replay:false};
 }finally{bridge?.stop();store.close()}
}
