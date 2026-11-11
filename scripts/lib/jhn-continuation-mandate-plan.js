/** #299 — deterministic proposal only. No issuer, grant, request or mutation. */
import {resolveMandate,isMandateActive} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
const REF='mandate:jhn:john-root';
const CAPABILITY='continuation.resolve';
const deny=error=>Object.freeze({ok:false,error,mandate_amended:false});

/** Find a uniquely attributable funded budget in the SAME canonical event log.
 * Do not accept a separately supplied ledger or arbitrary budget ID.
 * A multiple-budget case needs deliberate selection by the trusted issuer.
 */
export function findJohnContinuationBudgetId(events) {
  if(!Array.isArray(events))return deny('canonical_events_unavailable');
  const ids=new Set();
  for(const event of events) {
    if(event?.event_type!=='ExecutionBudgetGrant' &&
       event?.payload?.kind!=='ExecutionBudgetGrant')continue;
    const payload=event.payload;
    if(payload?.mandate_ref!==REF)continue;
    if(typeof payload.budget_id!=='string'||!payload.budget_id)
      return deny('canonical_budget_grant_invalid');
    ids.add(payload.budget_id);
  }
  if(!ids.size)return deny('canonical_budget_not_funded');
  if(ids.size!==1)return deny('canonical_budget_ambiguous');
  return {ok:true,budget_id:[...ids][0]};
}

export function johnContinuationMandatePlan({store,at_time=new Date()}={}) {
  if(typeof store?.replay!=='function'||typeof store?.listTopic!=='function'||
     typeof store?.append!=='function')return deny('canonical_store_required');
  let current,active,events;
  try {
    current=resolveMandate(store,REF);
    active=isMandateActive(store,REF);
    events=store.replay();
  } catch {return deny('canonical_authority_unavailable');}
  if(!current||!active||current.status!=='active'||current.principal_ref!=='principal:jhn'||
     current.logical_agent_ref!=='agent:jhn'||!current.version||
     !current.scope||!Array.isArray(current.scope.allowed_actions))
    return deny('canonical_root_mandate_unavailable');
  const now=at_time instanceof Date?at_time.getTime():NaN;
  if(!Number.isFinite(now))return deny('invalid_review_time');
  if(current.valid_from&&Date.parse(current.valid_from)>now)
    return deny('mandate_not_yet_valid');
  if(current.valid_until&&(!Number.isFinite(Date.parse(current.valid_until))||
     Date.parse(current.valid_until)<=now))return deny('mandate_expired');
  if((current.scope.forbidden_actions||[]).includes(CAPABILITY))
    return deny('continuation_resolve_forbidden');
  if(current.scope.allowed_actions.includes(CAPABILITY))
    return Object.freeze({ok:true,already_authorized_in_scope:true,
      mandate_ref:REF,version:current.version,mandate_amended:false});

  const budgetId=findJohnContinuationBudgetId(events);
  if(!budgetId.ok)return budgetId;
  let snapshot;
  try {
    // Same store, authority grant REQUIRED, no fallback invented limits.
    snapshot=createEventSourcedExecutionBudgetLedger({
      store,budget_id:budgetId.budget_id,require_authority_grant:true
    }).snapshot();
  } catch {return deny('canonical_budget_unavailable');}
  if(!snapshot||snapshot.has_grant!==true||snapshot.mandate_ref!==REF||
     snapshot.budget_id!==budgetId.budget_id||!snapshot.limits||!snapshot.available)
    return deny('canonical_budget_unverified');
  const dims=Object.keys(snapshot.limits);
  if(!dims.length||dims.some(k=>
     !Number.isSafeInteger(snapshot.limits[k])||snapshot.limits[k]<0||
     !Number.isSafeInteger(snapshot.available[k])||snapshot.available[k]<0||
     snapshot.available[k]>snapshot.limits[k]))
    return deny('canonical_budget_invalid');
  const budget={budget_id:snapshot.budget_id,authority_version:snapshot.authority_version,
    limits:structuredClone(snapshot.limits),available:structuredClone(snapshot.available),
    observed_version:snapshot.version};
  const scope=structuredClone(current.scope);
  scope.allowed_actions=[...scope.allowed_actions,CAPABILITY];
  const mandate={mandate_ref:REF,principal_ref:'principal:jhn',
    expected_version:current.version,scope,
    valid_from:current.valid_from,valid_until:current.valid_until,
    reason:'Autoriser John à résoudre des continuations déjà réclamées, sous garde COP, budget et reçus ; aucun envoi à des tiers.'};
  return {ok:true,requires_owner_consent:true,mandate_ref:REF,
    previous_version:current.version,added_capabilities:[CAPABILITY],
    budget_snapshot_for_review:budget,mandate,mandate_amended:false};
}
