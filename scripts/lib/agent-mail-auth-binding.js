/** Bind MCP caller identity to a Twin mailbox before COP dispatch.
 * No caller-controlled 'from'/'agent' can switch the resolved identity.
 * Actual mandate, issuer provenance and budget must still be verified by the
 * injected canonical COP authorizer; this only binds verified caller identity.
 */
import {isResolvedCallerAuth} from './cogentia-mcp-auth.js';

const ACTORS=Object.freeze({
  'agent:jhn':'john@mail.fractavolta.com',
  'agent:jhn.subagent:worker':'john-worker@mail.fractavolta.com',
});
function fail(code){throw Object.assign(new Error(code),{error_class:code});}
export function bindAgentMailCaller(auth,operation,args={}){
  if(!isResolvedCallerAuth(auth) || auth.auth!=='jhn' || auth.principal_ref!=='principal:jhn')fail('mail_verified_jhn_caller_required');
  const mailbox=ACTORS[auth.actor];
  if(!mailbox)fail('mail_agent_identity_unbound');
  if(operation==='send'&&auth.allowMutate!==true)fail('mail_mutation_authentication_required');
  const requested=operation==='send'?args.from:args.agent;
  if(requested!==mailbox)fail('mail_actor_sender_mismatch');
  return Object.freeze({principal_ref:auth.principal_ref,actor_ref:auth.actor,mailbox,mandate_ref:auth.mandate_ref,operation,auth});
}
