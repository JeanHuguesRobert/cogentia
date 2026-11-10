#!/usr/bin/env node
/**
 * Loopback-only COP Principal consent transport. Deliberately NO route for
 * request() / apply(). Only authenticated display and recording a human
 * decision are exposed. All durable records use the existing COP SQLite.
 * To activate mutation, the operator must explicitly configure
 * COGENTIA_JHN_CONSENT_ENABLE_DECISION=1 and a reviewed HTTPS origin.
 * This executable is not an MCP action and never grants agent authority.
 */
import {createServer} from 'node:http';
import {realpathSync,statSync} from 'node:fs';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createJhnCanonicalConsentWorkflow} from '../lib/jhn-canonical-consent-workflow.js';
import {createJhnConsentHttpHandler} from '../lib/jhn-consent-http-handler.js';
import {agentMailMandatePlan} from './jhn-agent-mail-consent-cli.js';
import {createSupabaseClient} from '../../../inseme/apps/platform/scripts/lib/config.js';

const CONFIGURED_CANONICAL='/var/lib/cogentia/cop/john-root-v1.sqlite';
function makeOptions(env) {
 const port=Number(env.COGENTIA_JHN_CONSENT_PORT||8796);
 const origin=String(env.COGENTIA_JHN_CONSENT_ORIGIN||'').trim();
 if(!Number.isSafeInteger(port)||port<1025||port>65535)throw Error('invalid_consent_port');
 if(!/^https:\/\/[^/]+$/.test(origin))throw Error('trusted_consent_origin_required');
 if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)throw Error('supabase_config_missing');
 const path=realpathSync(CONFIGURED_CANONICAL);
 if(path!==CONFIGURED_CANONICAL||!statSync(path).isFile())throw Error('canonical_store_not_verified');
 return {port,origin,path,enableDecision:env.COGENTIA_JHN_CONSENT_ENABLE_DECISION==='1',
   enableAgentMailApply:env.COGENTIA_JHN_CONSENT_ENABLE_AGENT_MAIL_APPLY==='1'};
}

export function createLocalConsentServer({workflow,origin,enableDecision=false,exactAgentMailAmendmentPlan}={}) {
 const api=createJhnConsentHttpHandler({workflow,origin,exactAgentMailAmendmentPlan});
 const expectedHost=new URL(origin).host;
 return createServer(async(req,res)=>{
   const response=(status,body)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body));};
   if(!req.url||!req.url.startsWith('/api/cop/principal-consent/')||req.headers.host!==expectedHost){
     return response(404,{ok:false,error:'consent_route_not_found'});
   }
   if(req.method==='POST'&&!enableDecision){return response(403,{ok:false,error:'principal_decision_not_enabled'});}
   if(!['GET','POST'].includes(req.method))return response(405,{ok:false,error:'method_not_allowed'});
   let bytes=0;
   const chunks=[];
   try {
     for await(const chunk of req){bytes+=chunk.length;if(bytes>4096){return response(413,{ok:false,error:'request_too_large'});}chunks.push(chunk);}
     const request=new Request(origin+req.url,{method:req.method,headers:req.headers,
       ...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
     const result=await api(request);
     const data=await result.text();
     res.writeHead(result.status,Object.fromEntries(result.headers));res.end(data);
   } catch {if(!res.headersSent)response(503,{ok:false,error:'consent_server_error'});}
 });
}

async function main(){
 const opts=makeOptions(process.env);
 // Explicitly opening a verified *existing* SQLite file, never a fixture or
 // automatically synthesized authority store on a new path.
 const store=createSqliteCopEventStore(opts.path);
 const adminClient=createSupabaseClient();
 // Explicit getUser(accessToken) still makes a remote Supabase Auth call.
 // No token is installed as this server-side administrative client's session.
 const workflow=createJhnCanonicalConsentWorkflow({store,adminClient,authClient:adminClient});
 const server=createLocalConsentServer({...opts,workflow});
 server.requestTimeout=10000;
 server.headersTimeout=12000;
 server.listen(opts.port,'127.0.0.1',()=>{
   console.log(JSON.stringify({schema:'cogentia.jhn_consent_listener.v1',listening:'loopback',port:opts.port,
     decisions_enabled:opts.enableDecision,agent_mail_exact_apply_enabled:opts.enableAgentMailApply,
     origin:opts.origin,issuer_routes_exposed:false}));
 });
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>{store.close();process.exit(0)}));
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  main().catch(error=>{console.error('JHN consent server unavailable:',error.message.replace(/[^a-zA-Z0-9_ .:-]/g,''));process.exitCode=1;});
}
