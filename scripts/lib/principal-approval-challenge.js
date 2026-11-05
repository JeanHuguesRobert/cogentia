/** #299: one-time EXPOSE approval challenge in the existing COP event store.
 * No mandate/grant is issued. Only the trusted auth adapter may pass session.
 */
import {randomUUID} from 'node:crypto';
import {isTrustedOAuthPrincipalSession} from './principal-oauth-session.js';
const fail=error=>({ok:false,error});
const topic=id=>`principal-approval:${id}`;
const event=(kind,id,payload,seq,actor='agent:jhn')=>({
 event_type:kind,topic:{id:topic(id),seq},actor_ref:actor,
 subject_ref:'principal:jhn',epistemic_status:kind==='PrincipalApprovalRequested'?'proposed':'decided',
 visibility:'restricted',idempotency_key:`${kind}:${id}`,payload:{kind,...payload}
});
export function requestPrincipalApproval({store,payload_hash,action_class,expires_at,now=new Date(),challenge_id=randomUUID()}={}){
 if(!store?.append||!store?.listTopic)return fail('cop_store_unavailable');
 if(!/^sha256:[a-f0-9]{64}$/.test(payload_hash||'')||!action_class)return fail('invalid_expose');
 const expiry=Date.parse(expires_at);
 if(!Number.isFinite(expiry)||expiry<=+new Date(now)||expiry>+new Date(now)+600000)return fail('challenge_expiry_invalid');
 if(!/^[0-9a-f-]{36}$/i.test(challenge_id)||store.listTopic(topic(challenge_id)).length)return fail('challenge_id_conflict');
 const record=store.append(event('PrincipalApprovalRequested',challenge_id,{payload_hash,action_class,expires_at,principal_ref:'principal:jhn'},1));
 return record?.ok&&!record.duplicate?{ok:true,challenge_id,payload_hash,expires_at}:fail(record?.error||'challenge_append_failed');
}
export async function confirmPrincipalApproval({store,challenge_id,payload_hash,session,approvalProof,verifyHumanConfirmation,now=new Date()}={}){
 if(!store?.append||!store?.listTopic)return fail('cop_store_unavailable');
 if(!isTrustedOAuthPrincipalSession(session)||!session?.ok||session.principal_ref!=='principal:jhn'||session.grants_mandate_authority!==false
   ||session.channel!=='mcp-oauth')return fail('verified_principal_session_required');
 if(Date.parse(session.expires_at)<=+new Date(now))return fail('principal_session_expired');
 const history=store.listTopic(topic(challenge_id));
 if(history.length!==1||history[0].event_type!=='PrincipalApprovalRequested')return fail('challenge_missing_or_consumed');
 const request=history[0].payload;
 if(request.principal_ref!==session.principal_ref||request.payload_hash!==payload_hash)return fail('approval_payload_mismatch');
 if(Date.parse(request.expires_at)<=+new Date(now))return fail('challenge_expired');
 // Authenticated bearer is not independent proof of a human approval gesture.
 if(typeof verifyHumanConfirmation!=='function'||!approvalProof)return fail('human_confirmation_required');
 let confirmed=false;
 try{confirmed=await verifyHumanConfirmation({approvalProof,challenge_id,payload_hash,action_class:request.action_class,issued_at:history[0].time.recorded_at,session,request_event_id:history[0].event_id});}
 catch{return fail('human_confirmation_invalid');}
 if(confirmed!==true)return fail('human_confirmation_invalid');
 // Explicit confirmation must occur on the Principal-controlled authenticated
 // approval surface. This library checks context but cannot prove user presence.
 const result=store.append(event('PrincipalApprovalConfirmed',challenge_id,{
   payload_hash,principal_ref:session.principal_ref,issuer:session.issuer,channel:session.channel,
   request_event_id:history[0].event_id
 },2,'principal:jhn'));
 return result?.ok&&!result.duplicate?{ok:true,challenge_id,confirmation_event_id:result.event.event_id,payload_hash,
   grants_mandate_authority:false}:fail(result?.error||'approval_confirmation_conflict');
}

/** Read-only confirmation evidence lookup. NOT a grant or proof that the
 * event-store writer was a trusted Principal issuer. That check belongs at
 * the issuer boundary; never promote this receipt directly to super access. */
export function inspectPrincipalApproval({store,challenge_id,payload_hash,action_class,now=new Date()}={}){
 if(!store?.listTopic)return fail('cop_store_unavailable');
 if(!/^[0-9a-f-]{36}$/i.test(challenge_id||''))return fail('challenge_id_invalid');
 const events=store.listTopic(topic(challenge_id));
 if(events.length!==2||events[0].event_type!=='PrincipalApprovalRequested'||events[1].event_type!=='PrincipalApprovalConfirmed')
   return fail('approval_not_confirmed');
 const [requested,confirmed]=events;
 if(requested.payload?.payload_hash!==payload_hash||requested.payload?.action_class!==action_class
   ||confirmed.payload?.payload_hash!==payload_hash||confirmed.payload?.request_event_id!==requested.event_id
   ||confirmed.payload?.principal_ref!==requested.payload?.principal_ref)
   return fail('approval_lineage_mismatch');
 if(Date.parse(requested.payload?.expires_at)<=Date.parse(confirmed.time?.recorded_at)||Date.parse(confirmed.time?.recorded_at)>+new Date(now))
   return fail('approval_outside_challenge_window');
 return {ok:true,challenge_id,payload_hash,action_class,confirmation_event_id:confirmed.event_id,
   // Issuer must independently verify this event was produced by a trusted
   // human approval service with an authenticated session.
   grants_mandate_authority:false};
}
