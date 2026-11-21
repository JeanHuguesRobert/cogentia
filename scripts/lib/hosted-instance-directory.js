/** Read-only hosted-instance directory for the verified JHN Principal and John.
 * Fetches registry + per-instance configuration; never returns secrets or
 * provider credentials. John and humans share the same generic Core read.
 */
const HOST_INSTANCE_ID='00000000-0000-0000-0000-000000000001';
const CONFIG_KEYS=['personal_twin_services','personal_twin_maturity'];

function endpointFromEnv(env){
  const raw=env.SUPABASE_URL||'',key=env.SUPABASE_SERVICE_ROLE_KEY||'';
  try{
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.hostname!=='ndiysuhzmztatpxbkezn.supabase.co'||!key)
      return null;
    return {url:u.origin,key};
  }catch{return null;}
}
async function rest(endpoint,fetchFn,table,params){
  const url=endpoint.url+'/rest/v1/'+table+'?'+new URLSearchParams(params);
  const response=await fetchFn(url,{
    headers:{apikey:endpoint.key,Authorization:'Bearer '+endpoint.key,
      Accept:'application/json'}});
  if(!response.ok)throw Error('instance_directory_http_'+response.status);
  const data=await response.json();
  if(!Array.isArray(data))throw Error('instance_directory_invalid_response');
  return data;
}
export async function readHostedInstanceDirectory({
  env=process.env,fetchFn=globalThis.fetch,slug=null,subject_kind='living_person'
}={}){
  if(slug!==null&&!/^[a-z][a-z0-9-]{2,79}$/.test(slug))
    return {ok:false,error:'invalid_instance_slug'};
  if(subject_kind!==null&&!['living_person','deceased_person','collective',
    'digital_native'].includes(subject_kind))
    return {ok:false,error:'invalid_subject_kind'};
  const e=endpointFromEnv(env);
  if(!e||typeof fetchFn!=='function')
    return {ok:false,error:'jhn_supabase_not_configured'};
  try{
    const params={select:'id,canonical_slug,display_name,bot_name,subject_ref,subject_root_ref,subject_kind,status,host_instance_id,is_claimable,principal_id',
      host_instance_id:'eq.'+HOST_INSTANCE_ID,order:'canonical_slug.asc'};
    if(subject_kind)params.subject_kind='eq.'+subject_kind;
    if(slug)params.canonical_slug='eq.'+slug;
    const instances=await rest(e,fetchFn,'instances',params);
    if(!instances.length)return {ok:true,instances:[],total:0};
    const ids=instances.map(i=>i.id);
    const configs=await rest(e,fetchFn,'instance_config',{
      select:'instance_id,key,value_json',key:'in.('+CONFIG_KEYS.join(',')+')',
      instance_id:'in.('+ids.join(',')+')',
      is_secret:'eq.false'});
    const byId=new Map();
    for(const c of configs){
      if(!CONFIG_KEYS.includes(c.key))continue;
      const obj=byId.get(c.instance_id)||{};
      obj[c.key]=c.value_json;
      byId.set(c.instance_id,obj);
    }
    return {ok:true,total:instances.length,instances:instances.map(i=>{
      const c=byId.get(i.id)||{};
      return {
        instance_id:i.id,canonical_slug:i.canonical_slug,display_name:i.display_name,
        bot_name:i.bot_name,subject_kind:i.subject_kind,subject_ref:i.subject_ref,
        subject_root_ref:i.subject_root_ref,status:i.status,
        host_instance_id:i.host_instance_id,is_claimable:i.is_claimable,
        principal_bound:!!i.principal_id,
        services:c.personal_twin_services?.services??[],
        maturity:c.personal_twin_maturity??null,
      };
    })};
  }catch{return {ok:false,error:'instance_directory_read_failed'};}
}
