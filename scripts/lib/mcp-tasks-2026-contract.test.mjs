import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createMcpCore} from './cogentia-mcp-core.js';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {clientSupportsMcpTasks,formatMcpTask,MCP_TASKS_EXTENSION_ID}
  from './mcp-tasks-2026-contract.mjs';

const modern='2026-07-28';
const meta={
 'io.modelcontextprotocol/protocolVersion':modern,
 'io.modelcontextprotocol/clientCapabilities':{
   extensions:{[MCP_TASKS_EXTENSION_ID]:{}},
 },
};
const rpc=(method,params={},requestMeta=meta,id=7)=>({jsonrpc:'2.0',id,method,
 params:{...params,_meta:requestMeta}});
const shape=(taskId='task:fixture')=>({taskId,status:'working',
 createdAt:'2026-11-17T12:00:00Z',lastUpdatedAt:'2026-11-17T12:00:00Z',
 ttlMs:86400000,pollIntervalMs:5000,internal_secret:'MUST_NOT_LEAK'});

function fixture(){
 const root=mkdtempSync(join(tmpdir(),'mcp-tasks-cop-test-'));
 const path=join(root,'event-store.sqlite');
 let store=createSqliteCopEventStore(path),createCalls=0,sequence=0;
 const adapter={durable:true,
  async shouldCreate({name}){return name==='cogentia_pattern_list'},
  async create(){
    createCalls++;
    const taskId='task:mcp-test-'+(++sequence);
    const event=store.append({topic_id:'mcp-task:'+taskId,
      event_type:'cop.event/v1',actor_id:'cop:mcp-tasks-fixture',
      subject_ref:'mcp-task:'+taskId,epistemic_status:'observed',
      idempotency_key:'mcp-test-created:'+taskId,payload:{
        profile:'test.mcp-tasks/v1',phase:'durably_created',task:shape(taskId)}});
    if(!event.ok)throw Error('fixture_commit_failure');
    return {taskId};
  },
  async get({taskId}){
    const events=store.listTopic('mcp-task:'+taskId);
    const initial=events.find(x=>x.payload?.phase==='durably_created');
    if(!initial)throw Object.assign(Error('unknown_task'),{code:'unknown_task'});
    const result=events.find(x=>x.payload?.phase==='completion');
    return result?{...initial.payload.task,status:'completed',
      lastUpdatedAt:'2026-11-17T12:30:00Z',result:result.payload.result}:initial.payload.task;
  },
  async update(){return {ok:true}},
  async cancel(){return {ok:true}},
 };
 return {adapter,path,store:()=>store,get createCalls(){return createCalls},
   reopen(){store.close();store=createSqliteCopEventStore(path)},
   close(){store.close();rmSync(root,{recursive:true,force:true})}};
}

test('2026-07-28 is stateless; initialize and protocol version do not grant Tasks capability',()=>{
 assert.equal(clientSupportsMcpTasks(meta),true);
 assert.equal(clientSupportsMcpTasks(meta,{protocolEra:'legacy'}),false);
 assert.equal(clientSupportsMcpTasks({'io.modelcontextprotocol/protocolVersion':modern}),false);
 assert.equal(clientSupportsMcpTasks({
  'io.modelcontextprotocol/clientCapabilities':{extensions:{[MCP_TASKS_EXTENSION_ID]:true}},
 }),false);
});

test('unconfigured Cogentia MCP does not claim Tasks merely by supporting modern protocol',async()=>{
 const core=createMcpCore({COGENTIA_MCP_VIEW:'public'});
 const discover=await core.handleJsonRpc(rpc('server/discover'));
 assert.equal(discover.result.resultType,'complete');
 assert.ok(discover.result.supportedVersions.includes(modern));
 assert.equal(Object.hasOwn(discover.result.capabilities.extensions,MCP_TASKS_EXTENSION_ID),false);
 const unsupported=await core.handleJsonRpc(rpc('tasks/get',{taskId:'task:none'}));
 assert.equal(unsupported.error.code,-32601);
 const normal=await core.handleJsonRpc(rpc('tools/list'));
 assert.equal(normal.result.resultType,'complete');
});

test('a configured durable adapter advertises Tasks, and the client opts in PER REQUEST',async()=>{
 const f=fixture();try{
  const core=createMcpCore({COGENTIA_MCP_VIEW:'public'},{mcpTasksAdapter:f.adapter});
  const discovery=await core.handleJsonRpc(rpc('server/discover'));
  assert.deepEqual(discovery.result.capabilities.extensions[MCP_TASKS_EXTENSION_ID],{});
  const noOptIn=await core.handleJsonRpc(rpc('tools/call',{
    name:'cogentia_pattern_list',arguments:{}},
   {'io.modelcontextprotocol/protocolVersion':modern}));
  assert.equal(noOptIn.result.resultType,'complete');
  assert.equal(f.createCalls,0);
  const task=await core.handleJsonRpc(rpc('tools/call',{
    name:'cogentia_pattern_list',arguments:{query:'public'}}));
  assert.equal(task.result.resultType,'task');
  assert.equal(task.result.status,'working');
  assert.equal(task.result.taskId,'task:mcp-test-1');
  assert.equal(Object.hasOwn(task.result,'internal_secret'),false);
  assert.equal(f.createCalls,1);
  const noOptInGet=await core.handleJsonRpc(rpc('tasks/get',{
    taskId:task.result.taskId},{'io.modelcontextprotocol/protocolVersion':modern}));
  assert.equal(noOptInGet.error.code,-32021);
  const read=await core.handleJsonRpc(rpc('tasks/get',{taskId:task.result.taskId}));
  assert.equal(read.result.resultType,'complete');
  assert.equal(read.result.status,'working');
  f.reopen();
  const reread=await core.handleJsonRpc(rpc('tasks/get',{taskId:task.result.taskId}));
  assert.equal(reread.result.taskId,task.result.taskId);
  assert.equal(f.store().auditCommitments().ok,true);
 }finally{f.close()}
});

test('task update and cancellation use standard complete acknowledgements, not a new continuation',async()=>{
 const f=fixture();try{
  const core=createMcpCore({}, {mcpTasksAdapter:f.adapter});
  await core.handleJsonRpc(rpc('tools/call',{
    name:'cogentia_pattern_list',arguments:{}}));
  const a=await core.handleJsonRpc(rpc('tasks/update',{
    taskId:'task:mcp-test-1',inputResponses:{clarify:{action:'accept',content:{}}}}));
  assert.equal(a.result.resultType,'complete');
  const b=await core.handleJsonRpc(rpc('tasks/cancel',{taskId:'task:mcp-test-1'}));
  assert.equal(b.result.resultType,'complete');
  const mismatch=await core.handleJsonRpc(rpc('tasks/get',{taskId:'task:mcp-test-1'}),{
    mcpName:'task:other'});
  assert.equal(mismatch.error.code,-32600);
 }finally{f.close()}
});

test('terminal tool-level isError remains completed, and malformed result is never advertised',()=>{
 const done=formatMcpTask({...shape(),status:'completed',result:{
  content:[{type:'text',text:'Tool failed'}],isError:true,
 }},{operation:'get'});
 assert.equal(done.status,'completed');
 assert.equal(done.result.isError,true);
 assert.equal(done.resultType,'complete');
 assert.throws(()=>formatMcpTask({...shape(),status:'failed'}),
  /failed_task_requires_jsonrpc_error/);
 assert.throws(()=>formatMcpTask({...shape(),status:'completed'}),
  /completed_task_requires_result/);
});

test('invalid backing create cannot accidentally fall back to a second tools/call execution',async()=>{
 let count=0;
 const adapter={durable:true,shouldCreate:async()=>true,
  create:async()=>{count++;return {taskId:'task:invalid'}},
  get:async()=>{throw Error('not yet queryable')},update:async()=>({ok:true}),
  cancel:async()=>({ok:true})};
 const core=createMcpCore({}, {mcpTasksAdapter:adapter});
 const r=await core.handleJsonRpc(rpc('tools/call',{name:'cogentia_pattern_list',arguments:{}}));
 assert.equal(r.error.code,-32603);
 assert.equal(count,1);
 assert.match(r.error.message,/reconciliation/);
});


test('tasks adapter cannot override existing private/mutate authorization or unknown tool checks',async()=>{
 let calls=0;
 const adapter={durable:true,shouldCreate:async()=>{calls++;return true},
  create:async()=>{throw Error('must not occur')},
  get:async()=>shape(),update:async()=>({ok:true}),cancel:async()=>({ok:true})};
 const core=createMcpCore({COGENTIA_MCP_VIEW:'public'}, {mcpTasksAdapter:adapter});
 const secret=await core.handleJsonRpc(rpc('tools/call',{
  name:'cogentia_continuation_emit',arguments:{kind:'secret'}}));
 assert.equal(secret.result.resultType,'complete');
 assert.equal(calls,0);
 const unknown=await core.handleJsonRpc(rpc('tools/call',{
  name:'unregistered_hidden_tool',arguments:{}}));
 assert.equal(unknown.result.resultType,'complete');
 assert.equal(calls,0);
});


test('unknown task identifiers use standard invalid-params errors',async()=>{
 const f=fixture();try{
  const core=createMcpCore({}, {mcpTasksAdapter:f.adapter});
  const get=await core.handleJsonRpc(rpc('tasks/get',{taskId:'task:unknown'}));
  // The fixture raises the unknown-task error with a stable public code.
  assert.equal(get.error.code,-32602);
  const invalid=await core.handleJsonRpc(rpc('tasks/get',{taskId:''}));
  assert.equal(invalid.error.code,-32602);
 }finally{f.close()}
});
