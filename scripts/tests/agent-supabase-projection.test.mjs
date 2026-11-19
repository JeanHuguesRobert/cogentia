import test from 'node:test';
import assert from 'node:assert/strict';
import {projectAgentToSupabase} from '../lib/agent-supabase-projection.js';

const subject='agent:minesteggio:vulcain';
const principal='0a3730d5-e7e1-4956-b509-13a33da0f888';
const agent={
  ok:true,exists:true,agent_ref:subject,host_root_ref:'twin:jhn',
  reports_to:'agent:jhn',status:'available',revision:2,
  receipt_ref:'cop:receipt:vulcain',profile_ref:'profile:minesteggio:informatique',
  member_of:['organization:minesteggio'],spawned_by:'agent:jhn',
  memory_ref:'memory:minesteggio:vulcain',activation_policy:'on_demand',
  metadata:{name:'Vulcain',domain:'information-technology'}
};
const env={SUPABASE_URL:'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY:'fixture-not-real'};

test('a native digital agent is a hosted instance with own root; COP is a separate projection',async()=>{
  const requests=[];
  const mockFetch=async(url,opt)=>{
    const table=String(url).split('/rest/v1/')[1].split('?')[0];
    requests.push({table,method:opt.method,body:opt.body?JSON.parse(opt.body):null});
    if(table==='instances'&&opt.method==='GET')
      return new Response(JSON.stringify([{id:'root',principal_id:principal}]),{status:200});
    if(table==='instances'&&opt.method==='POST')
      return new Response(JSON.stringify([{id:'new-instance-id'}]),{status:201});
    if(table==='cop_logical_agents'&&opt.method==='GET')
      return new Response(JSON.stringify([{created_at:'2026-11-19T10:00:00Z'}]),{status:200});
    return new Response(JSON.stringify([{id:'projected'}]),{status:201});
  };
  const r=await projectAgentToSupabase({agent,env,fetchFn:mockFetch});
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.canonical_slug,'vulcain-minesteggio');
  assert.deepEqual(requests.map(x=>x.table),
    ['instances','instances','cop_logical_agents','cop_logical_agents','instance_config','instance_aliases']);
  const i=requests[1].body[0];
  assert.equal(i.subject_ref,subject);
  assert.equal(i.subject_root_ref,subject);
  assert.equal(i.subject_kind,'digital_native');
  assert.equal(i.host_instance_id,'00000000-0000-0000-0000-000000000001');
  assert.equal(i.principal_id,principal);
  assert.equal(i.is_claimable,false);
  assert.equal(Object.hasOwn(i,'twin_root_ref'),false);
  const c=requests[3].body[0];
  assert.equal(c.logical_agent_id,subject);
  assert.equal(c.instance_id,'new-instance-id');
  assert.equal(c.active_mandate_ref,null);
  assert.equal(c.created_at,'2026-11-19T10:00:00Z');
  assert.equal(JSON.parse(c.metadata).memory_ref,'memory:minesteggio:vulcain');
});
test('missing Supabase configuration does not invent a successful projection',async()=>{
  const r=await projectAgentToSupabase({agent,env:{},fetchFn:async()=>{throw Error('unexpected')}});
  assert.equal(r.ok,false);
  assert.equal(r.error,'supabase_projection_not_configured');
});
test('non-supervised member cannot be projected under the JHN host',async()=>{
  const r=await projectAgentToSupabase({agent:{...agent,reports_to:'agent:elsewhere'},env});
  assert.equal(r.ok,false);
  assert.equal(r.error,'not_jhn_supervised_member');
});
