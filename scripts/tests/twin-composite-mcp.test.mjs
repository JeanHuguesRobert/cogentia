import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createMcpCore} from '../lib/cogentia-mcp-core.js';
import {createTwinCompositeRuntime} from '../lib/twin-composite-runtime.js';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant} from '../../../inseme/packages/cop-core/src/execution-budget.js';

const envBase={
  COGENTIA_MCP_VIEW:'public',
  COGENTIA_MCP_JHN_MUTATE:'1',
  COGENTIA_MCP_JHN_TOKEN:'test-only-jhn-token',
};
const cmd=(name,args={})=>({jsonrpc:'2.0',id:3,method:'tools/call',
  params:{name,arguments:args}});
const attested={headers:{authorization:'Bearer test-only-jhn-token',
  'x-cogentia-actor':'agent:jhn'}};
function result(response){return response?.result?.structuredContent?.data||
  response?.result?.structuredContent||response?.result;}
test('anonymous and OAuth read-only callers cannot see/use twin mutation tools',async()=>{
  const core=createMcpCore(envBase);
  const listing=(await core.handleJsonRpc({jsonrpc:'2.0',id:1,
    method:'tools/list',params:{}},{headers:{}})).result.tools;
  assert.ok(!listing.some(x=>x.name==='cogentia_twin_member_run'));
  assert.ok(!listing.some(x=>x.name==='cogentia_twin_members_list'));
  const refused=await core.handleJsonRpc(cmd('cogentia_twin_member_declare',
    {agent_ref:'agent:fake'}),{headers:{}});
  assert.equal(refused.result.isError,true);
});
test('JHN-attested MCP routes declare + activate through existing COP on disposable SQLite',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'cogentia-twin-mcp-'));
  const db=join(dir,'cop.sqlite');
  const store=createSqliteCopEventStore(db);
  try{
    recordMandateDeclaration(store,{mandate_id:'mandate:jhn:john-root',
      principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
      scope:{allowed_actions:['host.process.run']}});
    recordExecutionBudgetGrant(store,{
      budget_id:'budget:mandate:jhn:john-root',
      mandate_ref:'mandate:jhn:john-root',principal_ref:'principal:jhn',
      limits:{max_steps:5}});
    store.close();
    const core=createMcpCore({...envBase,COGENTIA_JOHN_COP_STORE_PATH:db});
    const list=(await core.handleJsonRpc({jsonrpc:'2.0',id:2,
      method:'tools/list',params:{}},attested)).result.tools;
    assert.ok(list.some(x=>x.name==='cogentia_twin_member_declare'));
    const declare=await core.handleJsonRpc(cmd('cogentia_twin_member_declare',{
      agent_ref:'agent:minesteggio:vulcain',twin_root_ref:'twin:jhn',
      profile_ref:'profile:minesteggio:informatique',
      member_of:['organization:minesteggio'],
      declaration_id:'synthetic-vulcain',metadata:{synthetic:true}}),attested);
    assert.equal(result(declare).ok,true,JSON.stringify(declare).slice(0,2500));
    const active=await core.handleJsonRpc(cmd('cogentia_twin_member_activate',{
      agent_ref:'agent:minesteggio:vulcain',expected_revision:1,
      operation_id:'synthetic-activate'}),attested);
    assert.equal(result(active).ok,true,JSON.stringify(active).slice(0,2500));
    const members=await core.handleJsonRpc(cmd('cogentia_twin_members_list',{
      member_of:'organization:minesteggio'}),attested);
    assert.equal(result(members).agents.length,1,JSON.stringify(members).slice(0,2500));
    assert.equal(result(members).agents[0].status,'available');
    const s=createSqliteCopEventStore(db);
    assert.equal(s.auditCommitments().ok,true);
    s.close();
  }finally{try{store.close();}catch{}rmSync(dir,{recursive:true,force:true});}
});


test('same generic runtime actually invokes injected Magistral handler under rooted mandate and COP budget',async()=>{
  const store=createSqliteCopEventStore(':memory:');
  try{
    recordMandateDeclaration(store,{mandate_id:'mandate:jhn:john-root',
      principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',
      scope:{allowed_actions:['host.process.run'],budget_ceiling:{max_steps:5}}});
    recordExecutionBudgetGrant(store,{budget_id:'budget:mandate:jhn:john-root',
      mandate_ref:'mandate:jhn:john-root',principal_ref:'principal:jhn',
      limits:{max_steps:5}});
    let calls=0;
    const router={chatCompletions:async()=>{calls++;return {ok:true,
      body:{choices:[{message:{content:'Vulcain: analyse technique reçue.'}}]}};}};
    const runtime=createTwinCompositeRuntime({store,router});
    assert.equal(runtime.declare({agent_ref:'agent:minesteggio:vulcain',
      twin_root_ref:'twin:jhn',profile_ref:'profile:minesteggio:informatique',
      member_of:['organization:minesteggio'],declaration_id:'test-real-handler'}).ok,true);
    assert.equal(runtime.activate({agent_ref:'agent:minesteggio:vulcain',
      expected_revision:1,operation_id:'ready'}).ok,true);
    const result=await runtime.run({agent_ref:'agent:minesteggio:vulcain',
      packet_ref:'packet:minesteggio:analysis-test',mission_id:'mission:analysis-test',
      prompt:'Examiner un algorithme fictif de tri.'});
    assert.equal(result.ok,true,JSON.stringify(result));
    assert.equal(result.text,'Vulcain: analyse technique reçue.');
    assert.equal(result.authority_agent_ref,'agent:jhn');
    assert.equal(result.execution_relation,'supervised_member_handler');
    assert.ok(result.act_id);
    assert.equal(calls,1);
    assert.equal(store.auditCommitments().ok,true);
  }finally{store.close();}
});
