#!/usr/bin/env node
/** Owner/admin local CLI: prepare a real review of an existing JHN mandate.
 * Does not create, amend, grant, budget or execute a mandate.
 * The Principal must complete the review from their own authenticated browser.
 * This command is not exposed through untrusted MCP or A2A.
 */
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createSupabaseClient} from '../../../inseme/apps/platform/scripts/lib/config.js';
import {createJhnCanonicalConsentWorkflow} from '../lib/jhn-canonical-consent-workflow.js';
const PATH='/var/lib/cogentia/cop/john-root-v1.sqlite';
const BASE='https://jhn.baronsmariani.org';
function error(reason){process.exitCode=1;return {ok:false,error:reason};}
function target(args){
 if(args.length!==2||args[0]!=='--mandate'||
    !['mandate:jhn:john-root','mandate:jhn:form-assist'].includes(args[1]))return null;
 return args[1];
}
export async function runRatifyCli({args=process.argv.slice(2),cwdHost=true}={}) {
 const mandate_ref=target(args);
 if(!mandate_ref)return error('usage: --mandate mandate:jhn:john-root|mandate:jhn:form-assist');
 // Only the server operator has custody over the canonical store; this is
 // deliberately not a network mutation action or generic principal issuer.
 if(cwdHost&&!process.env.SSH_CONNECTION)
   return error('authenticated_owner_shell_required');
 let store;
 try{
  createSupabaseClient(); // fail-closed if Supabase owner configuration missing
  store=createSqliteCopEventStore(PATH);
  const workflow=createJhnCanonicalConsentWorkflow({store});
  const result=workflow.requestRatification({mandate_ref,ttl_ms:600000});
  if(!result.ok)return error(result.error);
  const url=`${BASE}/cop/consent/${result.challenge_id}`;
  return {ok:true,kind:'cop.mandate-ratification.request.v1',
    mandate_ref,payload_hash:result.payload_hash,expires_at:result.expires_at,
    url,grants_mandate_authority:false,execution:false};
 }catch(e){error('canonical_ratification_issuer_unavailable');}
 finally{store?.close()}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)
  console.log(JSON.stringify(await runRatifyCli(),null,2));
