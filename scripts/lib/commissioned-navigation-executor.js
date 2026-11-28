/** Semantic adapter for one existing read-only capability. The work runner
 * owns the claim and lifecycle; the canonical standing resolver alone owns
 * reservation, authority and settlement. No nested John run or root spend. */
import {randomUUID} from 'node:crypto';
import {BROWSER_INSTANCES,normalizeWorkAct} from './commissioned-work-routes.js';
import {resolveHostMissionAuthority} from './host-mission-authority.js';
import {canonicalPayloadHash} from './side-effect-authorization.js';
import {createHostedBrowserCapabilities} from './hosted-browser-capabilities.js';
import {isResolvedCallerAuth} from './cogentia-mcp-auth.js';

export async function executeCommissionedNavigation({act,context,auth,resolveAuthority,
  env=process.env,createCapabilities=createHostedBrowserCapabilities}={}){
 const route={capability:BROWSER_INSTANCES,target:'node:fracta2',provider:'navigation-gateway',execution_mode:'normal'};
 if(!normalizeWorkAct(route,act)||context?.capability!==BROWSER_INSTANCES||
    !/^pkt-mcp-[0-9a-f-]{36}$/.test(context?.packet_ref||'')||
    !isResolvedCallerAuth(auth)||auth.allowMutate!==true||
    env.COGENTIA_JHN_CANONICAL_READ_ENABLED!=='1'||
    /^(0|false|no)$/i.test(String(env.COGENTIA_JHN_HOSTED_BROWSER_ENABLED||'1')))
   return {ok:false,error:'commissioned_navigation_unavailable'};
 const started_at=new Date().toISOString(), trace_id='sct_'+randomUUID();
 const payload_hash=canonicalPayloadHash({capability:BROWSER_INSTANCES,arguments:act});
 const authority=await resolveHostMissionAuthority(resolveAuthority,{
   ...route,actor:auth.actor,principal:auth.principal_ref,mandate:auth.mandate_ref,
   caller_auth:auth,payload_hash,packet_ref:context.packet_ref,command:null,
 });
 if(!authority?.canonical_cop)return {ok:false,error:'commissioned_navigation_authority_denied'};
 let attempted=false,result,receipt,providerHash=null;
 try{
   const capabilities=createCapabilities({gateway:env.COGENTIA_HOSTED_BROWSER_GATEWAY,
     health:env.COGENTIA_HOSTED_BROWSER_HEALTH,timeoutMs:Math.floor(act.timeout_ms/2)});
   const cap=capabilities.find(c=>c.name===BROWSER_INSTANCES&&c.risk==='read_only');
   if(!cap||typeof cap.execute!=='function')throw Error('navigation_executor_unavailable');
   if(await authority.beforeDispatch?.()!==true)throw Error('navigation_authority_changed');
   attempted=true;
   const raw=await cap.execute({});
   providerHash=canonicalPayloadHash(raw??null);
   // Only inventory metadata; no page contents, tab access, binary payloads,
   // or arbitrary fields passed through from the gateway.
   if(raw?.ok===false||!Array.isArray(raw?.browsers)||raw.browsers.length>256)
     throw Error('navigation_inventory_invalid');
   const browsers=raw.browsers.filter(b=>b?.registered===true).map(b=>{
     if(typeof b?.browser_instance_id!=='string'||!b.browser_instance_id||
       b.browser_instance_id.length>200)throw Error('navigation_inventory_invalid');
     const provider=b.provider;
     return {browser_instance_id:b.browser_instance_id,registered:b.registered===true,
       ...(provider?{provider:{
         engine:typeof provider.engine==='string'?provider.engine.slice(0,80):null,
         transport:typeof provider.transport==='string'?provider.transport.slice(0,80):null,
         methods:Array.isArray(provider.methods)?provider.methods.filter(x=>typeof x==='string').slice(0,64).map(x=>x.slice(0,100)):[]
       }}:{})};
   });
   result={ok:true,browsers};
 }catch{
   result={ok:false,error:attempted?'navigation_inventory_unconfirmed':'navigation_not_dispatched'};
 }
 receipt={trace_id,receipt_hash:providerHash??canonicalPayloadHash(result),
   projected_result_hash:canonicalPayloadHash(result),
   status:result.ok?'success':'failed',output_truncated:false};
 const spend=await authority.finalize({attempted,ok:result.ok,receipt});
 return {...result,trace:{protocol:'cogentia.semantic_capability_trace/v1',
   trace_id,capability:BROWSER_INSTANCES,target:route.target,provider:route.provider,
   actor:auth.actor,principal:auth.principal_ref,mandate:auth.mandate_ref,
   argument_hash:payload_hash,started_at,ended_at:new Date().toISOString(),
   status:result.ok?'ok':'error',authorization_id:authority.authority_id,
   provider_receipt:receipt,authority_origin:'verified_mission',
   verification:{ok:result.ok,accounting_complete:spend?.accounting_complete===true,cop_spend:spend}}};
}
