import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createMcpCore, MUTATE_TOOLS} from './cogentia-mcp-core.js';
import {resolveCallerAuth} from './cogentia-mcp-auth.js';
import {grantSideEffectAuthorization,resetAuthorizationStore,isEffectfulCapability} from './side-effect-authorization.js';
import {openNodeMemoryDb} from '../../../operium/lib/node-agent/db.js';
import {scheduleCalendar,tickCalendar} from '../../../operium/lib/calendar-capabilities.js';
import {getCalendarObligation} from '../../../operium/lib/node-agent/calendar-store.js';
import {COP_CALENDAR_KINDS,listCopEvents} from '../../../operium/lib/node-agent/cop-events.js';

test('MCP prepares and registers an exact authorized one-shot wake in Operium',async()=>{
  resetAuthorizationStore();
  const previousAccounting=process.env.COGENTIA_COP_SURFACE_ACCOUNTING;
  process.env.COGENTIA_COP_SURFACE_ACCOUNTING='0';
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'calendar-mcp-pilot-'));
  const dbPath=path.join(temp,'node.sqlite');
  const node_id='resource://fixture';
  const hostname='fixture';
  const {db}=openNodeMemoryDb({dbPath,nodeId:node_id,hostname});
  const env={COGENTIA_MCP_VIEW:'public',COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'test-only'};
  const headers={authorization:'Bearer test-only','x-cogentia-actor':'agent:jhn'};
  const caller=resolveCallerAuth(env,{headers,view:'public'});
  let dispatches=0;
  const host=async({node_id:target,wake})=>{
    assert.equal(target,node_id);
    dispatches++;
    return scheduleCalendar({db,nodeId:node_id,hostname},wake);
  };
  const core=createMcpCore(env,{scheduleOperiumCalendar:host});
  const disabled=createMcpCore(env);
  const name='operium_calendar_schedule';
  const prep=name+'_prepare';
  const list=async(c,headers)=> (await c.handleJsonRpc({jsonrpc:'2.0',id:1,method:'tools/list'},{headers})).result.tools.map(t=>t.name);
  const due_at=new Date(Date.now()+60000).toISOString();
  const deadline=new Date(Date.now()+120000).toISOString();
  const id='test:mcp-calendar-pilot';
  const wake={id:'cop:wake:'+id,packet_type:'cop/node.wake.v1',payload:{
    schema:'cop/node.wake.v1',due_at,deadline,cadence:{kind:'once'},stop_condition:{type:'always'},authorized:false,
    packet:{envelope:{packet_kind:'observation',transmission_mode:'copy',status:'active'},
      payload:{id,kind:'observation.dns.delegation',target_node:node_id,domain:'example.test',expected_ns:['ns1.example.test']}}
  }};
  const args={node_id,wake};
  try {
    assert.ok(MUTATE_TOOLS.has(name));
    assert.equal(isEffectfulCapability('calendar.schedule'),true);
    assert.ok(!(await list(core,{})).includes(name));
    assert.ok(!(await list(disabled,headers)).includes(name));
    assert.ok((await list(core,headers)).includes(name));
    const prepared=await core.callTool(prep,args,{auth:caller});
    assert.equal(prepared.action_class,'calendar.schedule');
    assert.equal(dispatches,0);
    assert.equal(getCalendarObligation(db,id),null);
    const grant=(origin='principal')=>grantSideEffectAuthorization({
      principal:caller.principal_ref,actor:caller.actor,mandate_ref:caller.mandate_ref,
      action_class:prepared.action_class,target:prepared.target,payload:prepared.payload,authority_origin:origin,
    });
    const invoke=(authorization,extra=args,auth=caller)=>core.callTool(name,{...extra,side_effect_authorization:authorization},{auth});
    await assert.rejects(()=>invoke(null),{error_class:'calendar_schedule_principal_grant_required'});
    await assert.rejects(()=>invoke(grant('mcp_jhn_attested_mutate')),{error_class:'calendar_schedule_principal_grant_required'});
    const auth=grant();
    const altered=structuredClone(args);altered.wake.payload.packet.payload.domain='other.test';
    await assert.rejects(()=>invoke(auth,altered),{error_class:'authorization_payload_mismatch'});
    await assert.rejects(()=>invoke(auth,args,{...caller}),{error_class:'calendar_schedule_caller_not_verified'});
    assert.equal(dispatches,0);
    const receipt=await invoke(auth);
    assert.equal(receipt.effect_verified,true);
    assert.equal(receipt.result.obligation.id,id);
    assert.equal(receipt.result.authorized,false);
    assert.equal(dispatches,1);
    await assert.rejects(()=>invoke(auth),{error_class:'authorization_replay'});
    assert.equal(dispatches,1);
    const other=openNodeMemoryDb({dbPath,nodeId:node_id,hostname}).db;
    try {
      let observations=0;
      const resolver=async()=>{observations++;return ['ns1.example.test'];};
      const early=await tickCalendar({db:other,nodeId:node_id,hostname,now:new Date(Date.parse(due_at)-1).toISOString()},{resolver});
      assert.equal(early.ran,0);
      const run=await tickCalendar({db:other,nodeId:node_id,hostname,now:due_at},{resolver});
      assert.equal(run.ran,1);
      assert.equal(run.results[0].closed,true);
      assert.equal(observations,1);
      assert.equal((await tickCalendar({db:other,nodeId:node_id,hostname,now:deadline},{resolver})).ran,0);
      assert.equal(observations,1);
      assert.equal(listCopEvents(other,{obligation_id:id,kind:COP_CALENDAR_KINDS.EVIDENCE}).length,1);
    }finally{other.close();}
  }finally{
    db.close();fs.rmSync(temp,{recursive:true,force:true});resetAuthorizationStore();
    if(previousAccounting===undefined)delete process.env.COGENTIA_COP_SURFACE_ACCOUNTING;
    else process.env.COGENTIA_COP_SURFACE_ACCOUNTING=previousAccounting;
  }
});
