/**
 * Idempotent PostgREST projection of an event-sourced LogicalAgent into the
 * JHN Supabase instances registry. COP identity + mandate remain authoritative.
 * No legacy "Twin" instance fields and no duplicated identity config keys.
 *
 * Only invoke after an authenticated, COP-admitted declaration/transition.
 * If a write fails, return a retriable partial-projection receipt; never
 * falsify COP history and never print service credentials or private content.
 */
export const JHN_HOST_INSTANCE_ID = '00000000-0000-0000-0000-000000000001';

function slug(agent_ref) {
  const parts = String(agent_ref).split(':');
  if(parts[0]!=='agent'||parts.length<3||parts.slice(1).some(
    p=>!/^[a-z0-9][a-z0-9-]{0,63}$/.test(p)))return null;
  return parts.slice(1).reverse().join('-');
}
function fail(error, detail={}){return {ok:false,error,...detail};}
function parseEndpoint(env) {
  const raw=env.SUPABASE_URL||'';
  const key=env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SERVICE_ROLE||'';
  try{
    const u=new URL(raw);
    if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')||
       u.username||u.password||u.search||u.hash||u.pathname!=='/')return null;
    return key?{url:u.origin,key}:null;
  }catch{return null;}
}
async function request(endpoint,fetchFn,table,{method='GET',query='',body}={}) {
  const headers={apikey:endpoint.key,Authorization:'Bearer '+endpoint.key,
    Accept:'application/json'};
  if(body!==undefined) {
    headers['Content-Type']='application/json';
    headers.Prefer='resolution=merge-duplicates,return=representation';
  }
  try {
    const response=await fetchFn(endpoint.url+'/rest/v1/'+table+query,
      {method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    if(!response.ok)return fail('supabase_http_'+response.status,{table});
    const rows=await response.json();
    if(!Array.isArray(rows))return fail('invalid_supabase_response',{table});
    return {ok:true,rows};
  } catch {return fail('supabase_transport_error',{table});}
}

export async function projectAgentToSupabase({
  agent,env=process.env,fetchFn=globalThis.fetch,
  host_instance_id=JHN_HOST_INSTANCE_ID
}={}) {
  if(!agent?.ok||!agent?.exists||agent.reports_to!=='agent:jhn'||
     agent.host_root_ref!=='twin:jhn')return fail('not_jhn_supervised_member');
  const canonical_slug=slug(agent.agent_ref);
  if(!canonical_slug||typeof fetchFn!=='function')
    return fail('invalid_native_agent_ref');
  const endpoint=parseEndpoint(env);
  if(!endpoint)return fail('supabase_projection_not_configured');
  const root=await request(endpoint,fetchFn,'instances',{
    query:'?select=id,principal_id&'+new URLSearchParams({
      id:'eq.'+host_instance_id})});
  if(!root.ok)return root;
  if(root.rows.length!==1||!root.rows[0].principal_id)
    return fail('host_principal_not_bound');
  const principal_id=root.rows[0].principal_id;
  const display_name=typeof agent.metadata?.name==='string'&&
    agent.metadata.name.trim()?agent.metadata.name.trim():canonical_slug;
  const instance=await request(endpoint,fetchFn,'instances',{
    method:'POST',query:'?on_conflict=canonical_slug',
    body:[{
      canonical_slug,display_name,bot_name:display_name,
      host_instance_id,principal_id,subject_ref:agent.agent_ref,
      subject_root_ref:agent.agent_ref,subject_kind:'digital_native',
      deployment_kind:'organizational',
      status:agent.status==='retired'?'archived':'active',
      is_claimable:false,
      metadata:{
        created_under:'agent:jhn',
        organization_ref:agent.member_of?.[0]||null,
        role:agent.metadata?.domain||null,
        institutional_status:agent.metadata?.institutional_status||null
      },
    }]
  });
  if(!instance.ok)return {...instance,stage:'instance'};
  const instance_id=instance.rows[0]?.id;
  if(!instance_id)return fail('supabase_instance_id_missing');

  const projection=await request(endpoint,fetchFn,'cop_logical_agents',{
    method:'POST',query:'?on_conflict=logical_agent_id',
    body:[{
      logical_agent_id:agent.agent_ref,
      logical_agent_name:display_name,status:agent.status,
      twin_root_ref:agent.host_root_ref,active_mandate_ref:null,
      instance_id,
      metadata:JSON.stringify({
        profile_ref:agent.profile_ref,member_of:agent.member_of,
        reports_to:agent.reports_to,spawned_by:agent.spawned_by,
        memory_ref:agent.memory_ref,activation_policy:agent.activation_policy,
        cop_revision:agent.revision,receipt_ref:agent.receipt_ref,
        authority:'supervised_no_independent_mandate'
      }),
      created_at:new Date().toISOString(),
      updated_at:new Date().toISOString(),
    }]
  });
  if(!projection.ok)return {...projection,stage:'cop_projection',instance_id};

  const config=await request(endpoint,fetchFn,'instance_config',{
    method:'POST',query:'?on_conflict=instance_id,key',
    body:[
      {instance_id,key:'bot_name',value:display_name,category:'identity',
       description:'Native agent display name',is_public:false,is_secret:false},
      {instance_id,key:'community_name',value:display_name,category:'identity',
       description:'Native agent name',is_public:false,is_secret:false},
      {instance_id,key:'community_code',value:canonical_slug,category:'identity',
       description:'Native agent slug',is_public:false,is_secret:false},
    ]
  });
  if(!config.ok)return {...config,stage:'config',instance_id};
  const aliases=await request(endpoint,fetchFn,'instance_aliases',{
    method:'POST',query:'?on_conflict=alias',
    body:[{
      alias:canonical_slug,instance_id,is_primary:true,
      alias_kind:'canonical_slug',
      description:'Digital-native hosted agent alias'
    }]
  });
  if(!aliases.ok)return {...aliases,stage:'aliases',instance_id};
  return {ok:true,instance_id,agent_ref:agent.agent_ref,
    canonical_slug,host_instance_id,principal_id,projection_status:agent.status};
}
