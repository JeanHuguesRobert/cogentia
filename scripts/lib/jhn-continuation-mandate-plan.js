/** #299 — plan only. No issuer, grant, request or production mutation. */
import {resolveMandate,isMandateActive} from '../../../inseme/packages/cop-core/src/governed-act.js';
const REF='mandate:jhn:john-root';
const CAPABILITY='continuation.resolve';
const deny=error=>Object.freeze({ok:false,error,mandate_amended:false});

export function johnContinuationMandatePlan({store,ledger}={}) {
  if(typeof store?.replay!=='function'||typeof store?.listTopic!=='function')
    return deny('canonical_store_required');
  let current,active,snapshot;
  try {
    current=resolveMandate(store,REF);
    active=isMandateActive(store,REF);
    snapshot=ledger?.snapshot?.();
  } catch {return deny('canonical_authority_unavailable');}
  if(!current||!active||current.status!=='active'||current.principal_ref!=='principal:jhn'||
     current.logical_agent_ref!=='agent:jhn'||!current.version||
     !current.scope||!Array.isArray(current.scope.allowed_actions))
    return deny('canonical_root_mandate_unavailable');
  if(current.valid_until && Date.parse(current.valid_until)<=Date.now())
    return deny('mandate_expired');
  if((current.scope.forbidden_actions||[]).includes(CAPABILITY))
    return deny('continuation_resolve_forbidden');
  if(current.scope.allowed_actions.includes(CAPABILITY))
    return Object.freeze({ok:true,already_authorized_in_scope:true,
      mandate_ref:REF,version:current.version,mandate_amended:false});
  // Snapshot is needed for a truthful consent review, NOT for authority issuance.
  // It must come from the same event-sourced COP authority; a fabricated
  // request budget or spend-spool does not count as a grant.
  if(!snapshot||snapshot.has_grant!==true||snapshot.mandate_ref!==REF||
     !snapshot.limits||!snapshot.available)
    return deny('canonical_budget_unverified');
  const activeDims=Object.keys(snapshot.limits);
  if(activeDims.length===0||activeDims.some(k=>
     !Number.isSafeInteger(snapshot.limits[k])||snapshot.limits[k]<0||
     !Number.isSafeInteger(snapshot.available[k])||snapshot.available[k]<0))
    return deny('canonical_budget_invalid');
  const budget={budget_id:snapshot.budget_id,authority_version:snapshot.authority_version,
    limits:structuredClone(snapshot.limits),available:structuredClone(snapshot.available),
    observed_version:snapshot.version};
  const scope={...structuredClone(current.scope),
    allowed_actions:[...current.scope.allowed_actions,CAPABILITY]};
  const mandate={mandate_ref:REF,principal_ref:'principal:jhn',
    expected_version:current.version,scope,
    valid_from:current.valid_from,valid_until:current.valid_until,
    reason:'Autoriser John à résoudre des continuations déjà réclamées, sous garde COP, budget et reçus ; aucun envoi à des tiers.'};
  return {ok:true,requires_owner_consent:true,mandate_ref:REF,
    previous_version:current.version,added_capabilities:[CAPABILITY],
    budget_snapshot_for_review:budget,mandate,mandate_amended:false};
}
