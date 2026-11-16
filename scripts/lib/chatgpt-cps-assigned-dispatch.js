/**
 * First delivery of explicitly assigned CPS continuations over an admitted
 * provider. Shares ONA's EXISTING job clock and Cogentia's mandate driver;
 * does not introduce a scheduler, permit browser access, or poll model Output.
 * A general suspended continuation without an explicit CPS dispatch request
 * (including historical test packets) must NEVER be sent to ChatGPT.
 */
import {projectPacketCoordination,validateCurrentPacketClaim} from '../../../inseme/packages/cop-core/src/packet-coordination.js';
import {runMandateToBoundary} from './mandate-continuation.js';
import {projectPacketTemperature} from '../../../inseme/packages/cop-core/src/packet-temperature.js';
import {inspectQuarantinedBrowserDelivery} from './chatgpt-cps-delivery-quarantine.js';
const PROFILE='cop.continuation-browser-dispatch/v1';
const RESULT='cop.continuation-result/v1';
const ID=id=>typeof id==='string'&&/^ctn_[a-zA-Z0-9_]{3,120}$/.test(id);
const intentKey=id=>`chatgpt-browser:${id}:first-dispatch-intent`;
const completeKey=id=>`chatgpt-browser:${id}:first-dispatch-receipt`;
const unconfirmedKey=id=>`chatgpt-browser:${id}:first-dispatch-unconfirmed`;
const recoveryKey=(id,n=1)=>`chatgpt-browser:${id}:pre-submit-recovery-intent-${n}`;
const recoveryUnconfirmedKey=(id,n=1)=>`chatgpt-browser:${id}:pre-submit-recovery-unconfirmed-${n}`;
const RECOVERY_PROFILE='cop.continuation-browser-pre-submit-recovery/v1';
const safeDiagnostic=x=>typeof x==='string'&&/^[a-z][a-z0-9_]{1,79}$/.test(x)
  ?x:'unclassified_transport_outcome';
const valid=x=>typeof x==='string'&&x.length>0&&x.length<=180;

/** An observed composer_not_ready exits John *before* invoking submit. The
 * separate canonical budget store must independently prove that the original
 * jhn-cps-submit request was NEVER reserved. Only this exact combination
 * admits ONE new attempt under its own John request IDs and COP recovery
 * intent. A second, FINAL recovery needs additional independently verified
 * evidence that a stale machine-owned browser draft was governedly cleaned. A generic timeout, missing receipt or provider exception can
 * never be interpreted as no-send evidence. */
export function inspectPreSubmitRecovery(store,id){
  if(typeof store?.eventByIdempotency!=='function'||!ID(id))
    return {ok:false,eligible:false,status:'invalid_recovery_source'};
  const original=store.eventByIdempotency(intentKey(id));
  const unconfirmed=store.eventByIdempotency(unconfirmedKey(id));
  if(original?.payload?.profile!==PROFILE||original.payload.phase!=='intent_committed'||
    unconfirmed?.payload?.profile!==PROFILE||
    unconfirmed.payload.phase!=='delivery_unconfirmed'||
    unconfirmed.payload.diagnostic_code!=='composer_not_ready')
    return {ok:true,eligible:false,status:'no_proven_pre_submit_failure'};
  if(store.eventByIdempotency(completeKey(id))||
     store.listTopic('continuation:'+id).some(e=>
       e.payload?.profile===RESULT&&e.payload?.phase==='returned'))
    return {ok:true,eligible:false,status:'recovery_already_spent_or_completed'};
  const budget=store.listTopic('execution-budget:budget:mandate:jhn:john-root');
  const submitReserved=suffix=>budget.some(e=>
    e.event_type==='ExecutionBudgetReservation'&&
    e.payload?.reservation?.idempotency_key===
      'chatgpt-turn:jhn-cps-submit-'+id+suffix);
  if(submitReserved(''))
    return {ok:true,eligible:false,status:'submit_attempt_may_have_occurred'};
  const priorRecovery=store.eventByIdempotency(recoveryKey(id,1));
  let recovery_attempt=1,cleanup_ref=null;
  if(priorRecovery){
    const failure=store.eventByIdempotency(recoveryUnconfirmedKey(id,1));
    if(priorRecovery.payload?.profile!==RECOVERY_PROFILE||
       priorRecovery.payload?.phase!=='pre_submit_recovery_intent'||
       failure?.payload?.profile!==PROFILE||
       failure.payload.phase!=='delivery_unconfirmed'||
       failure.payload.diagnostic_code!=='composer_not_ready'||
       submitReserved('--recovery-1')||
       store.eventByIdempotency(recoveryKey(id,2)))
      return {ok:true,eligible:false,status:'recovery_already_spent_or_completed'};
    // A verified, separately admitted cleanup of a *completed earlier CPS*
    // draft supplies positive evidence that the root-browser contamination
    // was repaired. It NEVER permits a second chance after any submit call.
    const clean=store.replay().find(e=>
      e.payload?.profile==='cogentia.cps-browser-owned-draft/v1'&&
      e.payload.phase==='verified_owned_draft_cleared'&&
      e.payload.confirmed_by_john===true&&
      e.payload.send_effects===0&&
      e.payload.source_continuation_id!==id&&
      /^ctn_chatgpt_browser_[a-f0-9]{32}$/.test(
        e.payload.source_continuation_id||'')&&
      Number.isSafeInteger(e.payload.tab_id)&&e.payload.tab_id>0&&
      typeof e.payload.source_prompt_sha256==='string'&&
      /^[a-f0-9]{64}$/.test(e.payload.source_prompt_sha256));
    if(!clean)return {ok:true,eligible:false,
      status:'second_pre_submit_recovery_requires_governed_draft_cleanup'};
    recovery_attempt=2;cleanup_ref=clean.idempotency_key;
    if(submitReserved('--recovery-2'))
      return {ok:true,eligible:false,status:'submit_attempt_may_have_occurred'};
  }
  const warmth=projectPacketTemperature(store,{packet_ref:'continuation:'+id});
  if(!warmth.ok||!warmth.runnable)
    return {ok:true,eligible:false,status:'packet_temperature_deferred'};
  return {ok:true,eligible:true,status:'pre_submit_recovery_ready',
    recovery_attempt,cleanup_receipt_ref:cleanup_ref,
    original_dispatch_intent_ref:intentKey(id),
    original_preflight_receipt_ref:recovery_attempt===1?unconfirmedKey(id):
      recoveryUnconfirmedKey(id,1)};
}

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
        packet_status:'[completed, continue ou blocked selon votre jugement]',
        next_action:'[identifiant bref uniquement si continue]',
        next_question:'[instruction précise de la prochaine étape, uniquement si continue]'}}};
  const prompt=[
    '[COGENTIA JUDGMENT - NE PAS INTERAGIR] — traitement d’un paquet cognitif sous mandat.',
    'Vous êtes le JudgmentHandler d’une continuation CPS attribuée par Cogentia.',
    'Tâche :',c.state.question,
    'À l’issue de votre travail, utilisez réellement le connecteur Cogentia et appelez',
    'cogentia_continuation_result_submit en adaptant les champs de réponse du modèle ci-dessous.',
    'Conservez EXACTEMENT les identifiants, challenge, version et clé d’idempotence.',
    'Remplacez les valeurs entre crochets par votre réponse ; ne copiez pas les exemples.',
    'Pour un paquet cognitif achevé, choisissez result.packet_status="completed".',
    'Si le travail doit progresser, choisissez result.packet_status="continue" et indiquez result.next_action (identifiant court)',
    'ainsi que result.next_question (l’instruction cognitive exacte de l’étape suivante).',
    'Si le paquet est bloqué, choisissez result.packet_status="blocked" et expliquez pourquoi dans result.answer.',
    'Le paquet décrit le travail ; le mandat délimite seulement vos permissions. Jugez librement la progression du paquet dans ces limites.',
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
    const quarantine=inspectQuarantinedBrowserDelivery(store,c.continuation_id);
    // A child may be parked by a parent cascade. Only a *validated*,
    // explicit uncertainty quarantine may downgrade its historical dispatch
    // blocker to non-runnable parked status. Any other cold child stays
    // excluded from dispatch and its issue remains visible to reconciliation.
    const warmth=projectPacketTemperature(store,{packet_ref:'continuation:'+c.continuation_id});
    const hasIntent=Boolean(store.eventByIdempotency(intentKey(c.continuation_id)));
    const recovery=hasIntent?inspectPreSubmitRecovery(store,c.continuation_id):null;
    return {continuation_id:c.continuation_id,packet_ref:c.packet_ref,
      status:quarantine.ok&&quarantine.quarantined?'parked':
        hasIntent?(recovery?.eligible?'pre_submit_recovery_ready':'needs_reconciliation'):
        warmth.ok&&warmth.runnable?'ready':'cold_deferred',
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
  const isRecovery=Boolean(store.eventByIdempotency(intentKey(continuation_id)));
  const preflight=isRecovery?inspectPreSubmitRecovery(store,continuation_id):null;
  if(isRecovery&&!preflight?.eligible)
    return {ok:false,status:'needs_reconciliation'};
  if(!projectPacketTemperature(store,{packet_ref:topic}).runnable)
    return {ok:false,status:'packet_temperature_deferred'};
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
    if(!projectPacketTemperature(tx,{packet_ref:topic}).runnable)
      return {reserved:false,stale:true};
    // Recheck current authority/claim under the same serialized journal lock
    // as BOTH the initial intent and the exceptionally admitted recovery.
    const latest=tx.listTopic(topic).find(e=>e.payload?.profile==='cop/continuation');
    if(latest?.idempotency_key!==row.idempotency_key||
       !reservationAndClaimCurrent(tx,c,new Date()))return {reserved:false,stale:true};
    if(isRecovery){
      const p=inspectPreSubmitRecovery(tx,continuation_id);
      if(!p.eligible)return {reserved:false,stale:true};
      const written=tx.append({topic_id:topic,event_type:'cop.event/v1',
        actor_id:'cop:cps-assigned-dispatch',subject_ref:topic,
        visibility:'restricted',epistemic_status:'decided',
        idempotency_key:recoveryKey(continuation_id,p.recovery_attempt),
        causal_refs:[p.original_dispatch_intent_ref,p.original_preflight_receipt_ref,
          ...(p.cleanup_receipt_ref?[p.cleanup_receipt_ref]:[]),
          grant.authorization_ref,grant.provider_permission_receipt_ref,
          grant.budget_authorization_ref],
        payload:{profile:RECOVERY_PROFILE,phase:'pre_submit_recovery_intent',
          continuation_id,recovery_attempt:p.recovery_attempt,
          evidence:p.recovery_attempt===2?
            'second_proven_pre_submit_failure_and_governed_draft_cleanup':
            'composer_not_ready_and_no_original_submit_budget_reservation',
          previous_click_was_not_invoked:true,max_recovery_attempts:p.recovery_attempt},
      });
      if(!written.ok)throw Error(written.error||'recovery_intent_failed');
      return {reserved:true,recovery_attempt:p.recovery_attempt};
    }
    if(tx.eventByIdempotency(intentKey(continuation_id)))return {reserved:false};
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
    return {reserved:true,recovery_attempt:0};
  });
  if(!fencing.ok)return {ok:false,status:'intent_commit_failed'};
  if(!fencing.value?.reserved)return {ok:false,status:fencing.value?.stale
    ?'stale_claim_or_budget':'needs_reconciliation'};
  const recoveryAttempt=fencing.value.recovery_attempt;
  // Keep a typed, non-sensitive diagnostic. A failed John/MCP result after
  // a committed intent is NOT evidence that the UI click was never made.
  // The diagnostic is NOT a retry ticket and never unlocks dispatch.
  const unconfirmed=reason=>{
    const code=safeDiagnostic(reason);
    try{store.append({topic_id:topic,event_type:'cop.event/v1',
      actor_id:'cop:cps-assigned-dispatch',subject_ref:topic,
      visibility:'restricted',epistemic_status:'observed',
      idempotency_key:isRecovery?recoveryUnconfirmedKey(continuation_id,recoveryAttempt):
        unconfirmedKey(continuation_id),
      causal_refs:isRecovery?[intentKey(continuation_id),
        recoveryKey(continuation_id,recoveryAttempt)]:
        [intentKey(continuation_id)],
      payload:{profile:PROFILE,phase:'delivery_unconfirmed',
        continuation_id,recovery_attempt:recoveryAttempt,diagnostic_code:code,
        click_delivery_proven:false,outcome_ambiguous:true,
        retry_authorized:false},
    });}catch{/* Preserve the original unknown effect, not a second send. */}
    return {ok:false,status:'needs_reconciliation'};
  };
  // Projection is deterministic and bound to this already-fenced packet.
  // Invalid projections remain in reconciliation, never silently retrying.
  const projected=buildAssignedChatgptCpsPrompt(c);
  if(!projected.ok)return unconfirmed('invalid_assigned_projection');
  let outcome;
  try{outcome=await dispatch({continuation:c,prompt:projected.prompt,continuation_id,
    authorization_ref:grant.authorization_ref,
    dispatch_intent_ref:isRecovery?recoveryKey(continuation_id,recoveryAttempt):
      intentKey(continuation_id),
    recovery_attempt:recoveryAttempt});}
  catch{return unconfirmed('provider_dispatch_exception')}
  if(outcome?.ok!==true||outcome.submitted!==true||
     outcome.continuation_id!==continuation_id||
     !valid(outcome.execution_receipt_ref))
    return unconfirmed(outcome?.error||'provider_receipt_unconfirmed');
  const written=store.append({topic_id:topic,event_type:'cop.event/v1',
    actor_id:'cop:cps-assigned-dispatch',subject_ref:'continuation:'+continuation_id,
    visibility:'restricted',epistemic_status:'observed',
    idempotency_key:completeKey(continuation_id),
    causal_refs:[intentKey(continuation_id),
      ...(isRecovery?[recoveryKey(continuation_id,recoveryAttempt)]:[]),
      outcome.execution_receipt_ref],
    payload:{profile:PROFILE,phase:'ui_click_dispatched_not_model_result',
      continuation_id,recovery_attempt:recoveryAttempt,
      execution_receipt_ref:outcome.execution_receipt_ref,
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
    const next=pending.find(x=>x.status==='ready'||
      x.status==='pre_submit_recovery_ready');
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
    pending_count:left.filter(x=>x.status==='ready'||
      x.status==='pre_submit_recovery_ready').length,
    needs_reconciliation:left.filter(x=>x.status==='needs_reconciliation').length,
    autonomous_browser_worker:false, parent_packet_completed:false,
    events:running.events};
}
