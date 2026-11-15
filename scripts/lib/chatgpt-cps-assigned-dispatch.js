/**
 * First delivery of explicitly assigned CPS continuations over an admitted
 * provider. Shares ONA's EXISTING job clock and Cogentia's mandate driver;
 * does not introduce a scheduler, permit browser access, or poll model Output.
 * A general suspended continuation without an explicit CPS dispatch request
 * (including historical test packets) must NEVER be sent to ChatGPT.
 */
import {projectPacketCoordination,validateCurrentPacketClaim} from '../../../inseme/packages/cop-core/src/packet-coordination.js';
import {runMandateToBoundary} from './mandate-continuation.js';
const PROFILE='cop.continuation-browser-dispatch/v1';
const RESULT='cop.continuation-result/v1';
const ID=id=>typeof id==='string'&&/^ctn_[a-zA-Z0-9_]{3,120}$/.test(id);
const intentKey=id=>`chatgpt-browser:${id}:first-dispatch-intent`;
const completeKey=id=>`chatgpt-browser:${id}:first-dispatch-receipt`;
const valid=x=>typeof x==='string'&&x.length>0&&x.length<=180;

/** Core-owned prompt recipe, no DOM answer scraping and no new extension API.
 * Delivers a correlated CPS result by the existing Cogentia MCP capability.
 */
export function buildAssignedChatgptCpsPrompt(c){
  if(!ID(c?.continuation_id)||c?.state?.dispatch_mode!=='cps:assigned-browser-turn/v1'||
      typeof c.state.question!=='string'||!c.state.question.trim()||
      !valid(c.correlation?.challenge)||!valid(c.attempt_id)||
      !valid(c.execution_binding_ref)||!Number.isSafeInteger(c.version)||c.version<1)
    return {ok:false,error:'invalid_assigned_continuation'};
  const template={protocol:'cop.continuation-result-submit/v0',
    continuation_id:c.continuation_id,attempt_id:c.attempt_id,
    execution_binding_ref:c.execution_binding_ref,
    continuation_version:String(c.version),
    idempotency_key:'chatgpt-browser:'+c.continuation_id+':final',
    step_result:{protocol:'cogentia.step_result/v1',
      continuation_id:c.continuation_id,challenge:c.correlation.challenge,
      status:'answered',result:{answer:'[Votre réponse réelle à la question]',
        mandate_status:'[completed, continue ou blocked selon votre jugement]',
        next_action:'[identifiant bref uniquement si continue]'}}};
  const prompt=[
    '[COGENTIA JUDGMENT - NE PAS INTERAGIR] — conversation dédiée à un mandat cognitif.',
    'Vous êtes le JudgmentHandler d’une continuation CPS attribuée par Cogentia.',
    'Tâche :',c.state.question,
    'À l’issue de votre travail, utilisez réellement le connecteur Cogentia et appelez',
    'cogentia_continuation_result_submit en adaptant les champs de réponse du modèle ci-dessous.',
    'Conservez EXACTEMENT les identifiants, challenge, version et clé d’idempotence.',
    'Remplacez les valeurs entre crochets par votre réponse ; ne copiez pas les exemples.',
    'Pour une tâche achevée, choisissez result.mandate_status="completed".',
    'Pour une étape nécessaire, choisissez "continue" et indiquez result.next_action (identifiant court).',
    'Si bloqué, choisissez "blocked" et expliquez pourquoi dans result.answer.',
    'L’évaluation de votre travail relève de votre jugement dans les limites du mandat.',
    'Modèle d’arguments de l’outil à compléter :',JSON.stringify(template),
    'N’annoncez pas de livraison réussie sans reçu MCP. En cas d’absence de connecteur, répondez TOOL_UNAVAILABLE.',
  ].join('\n\n');
  return prompt.length<=6000?{ok:true,prompt}:{ok:false,error:'assigned_prompt_too_long'};
}

export function listAssignedChatgptCpsContinuations(store,{limit=25}={}){
  if(typeof store?.replay!=='function'||typeof store.eventByIdempotency!=='function'||
      !Number.isSafeInteger(limit)||limit<1||limit>100)
    throw new TypeError('canonical COP store and bounded limit required');
  return store.replay().filter(e=>{
    const c=e.payload?.continuation;
    return e.payload?.profile==='cop/continuation'&&
      e.topic?.id==='continuation:'+c?.continuation_id&&
      ID(c?.continuation_id)&&c?.provider==='chatgpt'&&
      c?.channel==='browser'&&c?.lifecycle==='suspended'&&
      c?.resumeTo==='handler:chatgpt-browser-result-observer'&&
      c?.state?.dispatch_mode==='cps:assigned-browser-turn/v1'&&
      typeof c?.state?.question==='string'&&
      c.state.question.trim().length>0&&c.state.question.length<=4500&&
      valid(c.packet_ref)&&valid(c.budget_reservation_id)&&
      valid(c.claim?.claim_id)&&Number.isInteger(c.claim?.epoch);
  }).filter(e=>{
    const id=e.payload.continuation.continuation_id;
    if(store.eventByIdempotency(completeKey(id)))return false;
    const events=store.listTopic('continuation:'+id);
    return !events.some(x=>(x.payload?.profile===RESULT&&x.payload?.phase==='returned')||
      x.payload?.profile==='cop.continuation-abandonment/v1');
  }).slice(0,limit).map(e=>{
    const c=e.payload.continuation;
    return {continuation_id:c.continuation_id,packet_ref:c.packet_ref,
      status:store.eventByIdempotency(intentKey(c.continuation_id))
        ?'needs_reconciliation':'ready',
      declaration_receipt_ref:e.idempotency_key};
  });
}

function reservationAndClaimCurrent(store,c,now){
  const events=store.listTopic('execution-budget:budget:mandate:jhn:john-root');
  const matches=events.filter(e=>e.event_type==='ExecutionBudgetReservation'&&
    e.payload?.reservation?.reservation_id===c.budget_reservation_id&&
    e.payload?.reservation?.budget_id==='budget:mandate:jhn:john-root');
  if(matches.length!==1||events.some(e=>
      (e.event_type==='ExecutionBudgetSettlement'||e.event_type==='ExecutionBudgetRelease')&&
      e.payload?.reservation_id===c.budget_reservation_id))return false;
  const projection=projectPacketCoordination(store.listTopic('packet-coordination:'+c.packet_ref)
    .map(e=>e.payload?.packet_coordination_event).filter(Boolean));
  return validateCurrentPacketClaim(projection,{
    claimId:c.claim.claim_id,handlerRef:'agent:jhn',epoch:c.claim.epoch,now}).ok===true;
}

/** `admit` verifies the CURRENT signed mandate and provider permission;
 * `dispatch` is the EXISTING governed John executor. Neither is a second LLM.
 * Commit intent before external execution. Unknown outcomes remain fenced.
 */
export async function dispatchAssignedChatgptCpsContinuation({
  store,continuation_id,admit,dispatch,now=new Date(),
}={}){
  if(typeof store?.transaction!=='function'||!ID(continuation_id)||
     typeof admit!=='function'||typeof dispatch!=='function')
    return {ok:false,status:'invalid_request'};
  const topic='continuation:'+continuation_id;
  const row=store.listTopic(topic).find(e=>e.payload?.profile==='cop/continuation');
  const c=row?.payload?.continuation;
  if(!c||!listAssignedChatgptCpsContinuations(store,{limit:100})
    .some(e=>e.continuation_id===continuation_id))
    return {ok:false,status:'assigned_continuation_missing'};
  if(store.eventByIdempotency(completeKey(continuation_id)))
    return {ok:false,status:'already_dispatched'};
  if(store.eventByIdempotency(intentKey(continuation_id)))
    return {ok:false,status:'needs_reconciliation'};
  if(!reservationAndClaimCurrent(store,c,now))
    return {ok:false,status:'stale_claim_or_budget'};
  let grant;
  try{grant=await admit({continuation:c,continuation_id});}
  catch{return {ok:false,status:'admission_failed'}}
  if(grant?.granted!==true||grant.provider_permitted!==true||
     grant.budget_admitted!==true||!valid(grant.authorization_ref)||
     !valid(grant.provider_permission_receipt_ref)||!valid(grant.budget_authorization_ref))
    return {ok:false,status:'not_admitted'};
  const fencing=store.transaction(tx=>{
    if(tx.eventByIdempotency(intentKey(continuation_id)))return {reserved:false};
    // Must re-read the existing authority/claim after crossing the async
    // admission boundary, under the journal's serialized SQLite write lock.
    const latest=tx.listTopic(topic).find(e=>e.payload?.profile==='cop/continuation');
    if(latest?.idempotency_key!==row.idempotency_key||
       !reservationAndClaimCurrent(tx,c,new Date()))return {reserved:false,stale:true};
    const written=tx.append({topic_id:topic,event_type:'cop.event/v1',
      actor_id:'cop:cps-assigned-dispatch',subject_ref:'continuation:'+continuation_id,
      visibility:'restricted',epistemic_status:'decided',
      idempotency_key:intentKey(continuation_id),
      causal_refs:[row.idempotency_key,grant.authorization_ref,
        grant.provider_permission_receipt_ref,grant.budget_authorization_ref],
      payload:{profile:PROFILE,phase:'intent_committed',continuation_id,
        mandate_authorization_ref:grant.authorization_ref,
        provider_permission_receipt_ref:grant.provider_permission_receipt_ref,
        budget_authorization_ref:grant.budget_authorization_ref},
    });
    if(!written.ok)throw Error(written.error||'dispatch_intent_failed');
    return {reserved:true};
  });
  if(!fencing.ok)return {ok:false,status:'intent_commit_failed'};
  if(!fencing.value?.reserved)return {ok:false,status:fencing.value?.stale
    ?'stale_claim_or_budget':'needs_reconciliation'};
  // Projection is deterministic and bound to this already-fenced packet.
  // Invalid projections remain in reconciliation, never silently retrying.
  const projected=buildAssignedChatgptCpsPrompt(c);
  if(!projected.ok)return {ok:false,status:'needs_reconciliation'};
  let outcome;
  try{outcome=await dispatch({continuation:c,prompt:projected.prompt,continuation_id,
    authorization_ref:grant.authorization_ref,
    dispatch_intent_ref:intentKey(continuation_id)});}
  catch{return {ok:false,status:'needs_reconciliation'}}
  if(outcome?.ok!==true||outcome.submitted!==true||
     outcome.continuation_id!==continuation_id||
     !valid(outcome.execution_receipt_ref))return {ok:false,status:'needs_reconciliation'};
  const written=store.append({topic_id:topic,event_type:'cop.event/v1',
    actor_id:'cop:cps-assigned-dispatch',subject_ref:'continuation:'+continuation_id,
    visibility:'restricted',epistemic_status:'observed',
    idempotency_key:completeKey(continuation_id),
    causal_refs:[intentKey(continuation_id),outcome.execution_receipt_ref],
    payload:{profile:PROFILE,phase:'ui_click_dispatched_not_model_result',
      continuation_id,execution_receipt_ref:outcome.execution_receipt_ref,
      result_returned:false,receipt_basis:'mandated_john_dispatcher'},
  });
  if(!written.ok)return {ok:false,status:'needs_reconciliation'};
  return {ok:true,status:'dispatched_awaiting_mcp_return',continuation_id,
    receipt_ref:completeKey(continuation_id)};
}

/** Reuse the already-established bounded continuation driver; scheduling
 * remains exclusively ONA's configured 60-second job. */
export async function runAssignedChatgptCpsBatch({store,admit,dispatch,max_steps=3}={}){
  if(!store||typeof admit!=='function'||typeof dispatch!=='function'||
     !Number.isSafeInteger(max_steps)||max_steps<1||max_steps>20)
    return {ok:false,status:'invalid_batch'};
  const running=await runMandateToBoundary({max_steps,inspect:async()=>{
    const pending=listAssignedChatgptCpsContinuations(store,{limit:100});
    if(pending.some(x=>x.status==='needs_reconciliation'))return {hard_blocker:true};
    const next=pending.find(x=>x.status==='ready');
    if(!next)return {objective_met:true};
    return {next_step_clear:true,next_step_allowed:true,
      continuation_id:next.continuation_id};
  },execute:async({state})=>{
    const result=await dispatchAssignedChatgptCpsContinuation({store,
      continuation_id:state.continuation_id,admit,dispatch});
    return {ok:result.ok===true,code:result.status};
  }});
  const left=listAssignedChatgptCpsContinuations(store,{limit:100});
  // Exactly max_steps confirmed deliveries may drain the queue on the last
  // allowed step. Do not label that successful exhaustion as an error.
  const drained=running.reason==='verified_objective_met'||
    (running.reason==='step_limit'&&left.length===0);
  return {ok:drained,status:drained?'queue_drained':running.reason,
    steps_completed:running.steps_completed,
    pending_count:left.filter(x=>x.status==='ready').length,
    needs_reconciliation:left.filter(x=>x.status==='needs_reconciliation').length,
    autonomous_browser_worker:false, parent_mandate_completed:false,
    events:running.events};
}
