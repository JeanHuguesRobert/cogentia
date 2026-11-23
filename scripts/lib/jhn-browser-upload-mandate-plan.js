/**
 * CPKT-2026-011. Exact, non-issuing proposal for one standing browser file
 * selection capability. The existing authenticated JHN Principal consent
 * workflow issues any resulting root amendment; this code grants nothing.
 */
import {resolveMandate,isMandateActive} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';

export const BROWSER_UPLOAD_CAPABILITY='browser.form.upload';
export const BROWSER_UPLOAD_MANDATE='mandate:jhn:john-root';
export const BROWSER_UPLOAD_POLICY=Object.freeze({
  browser_instance_id:'fracta2-hosted',
  target_binding:'exact_https_url_per_effect',
  source_binding:'configured_upload_roots',
  file_selection_only:true,
  max_file_bytes:300*1024*1024,
  publication_authorized:false,
  require_cop_receipt:true,
});
const fail=error=>({ok:false,error,mandate_amended:false});
export function johnBrowserUploadMandatePlan({store,at_time=new Date()}={}){
  if(typeof store?.replay!=='function'||typeof store?.listTopic!=='function')
    return fail('canonical_store_required');
  const previous=resolveMandate(store,BROWSER_UPLOAD_MANDATE);
  if(!previous||!isMandateActive(store,BROWSER_UPLOAD_MANDATE)||
    previous.status!=='active'||previous.principal_ref!=='principal:jhn'||
    previous.logical_agent_ref!=='agent:jhn'||!/^v[1-9]\d*$/.test(previous.version)||
    !Array.isArray(previous.scope?.allowed_actions)||
    !Array.isArray(previous.scope?.forbidden_actions)||
    previous.scope.forbidden_actions.includes(BROWSER_UPLOAD_CAPABILITY))
    return fail('canonical_root_scope_untrusted');
  if(+at_time<Date.parse(previous.valid_from)||+at_time>=Date.parse(previous.valid_until))
    return fail('mandate_outside_validity');
  const ids=[...new Set(store.replay().filter(e=>
    e.payload?.kind==='ExecutionBudgetGrant'&&
    e.payload?.mandate_ref===BROWSER_UPLOAD_MANDATE).map(e=>e.payload.budget_id))];
  if(ids.length!==1||ids[0]!=='budget:'+BROWSER_UPLOAD_MANDATE)
    return fail('canonical_budget_not_uniquely_funded');
  const budget=createEventSourcedExecutionBudgetLedger({
    store,budget_id:ids[0],require_authority_grant:true
  }).snapshot();
  if(!budget.has_grant||budget.mandate_ref!==BROWSER_UPLOAD_MANDATE||
    !Number.isInteger(budget.available?.max_steps)||budget.available.max_steps<1||
    budget.limits?.max_steps!==previous.scope.budget_ceiling?.max_steps)
    return fail('canonical_budget_not_usable');
  if(previous.scope.allowed_actions.includes(BROWSER_UPLOAD_CAPABILITY)){
    if(JSON.stringify(previous.scope.browser_upload_policy)!==JSON.stringify(BROWSER_UPLOAD_POLICY))
      return fail('existing_browser_upload_policy_mismatch');
    return {ok:true,already_authorized_in_scope:true,
      mandate_ref:BROWSER_UPLOAD_MANDATE,version:previous.version,mandate_amended:false};
  }
  const scope=structuredClone(previous.scope);
  scope.allowed_actions=[...scope.allowed_actions,BROWSER_UPLOAD_CAPABILITY];
  scope.browser_upload_policy={...BROWSER_UPLOAD_POLICY};
  return {ok:true,ready_for_issuance:true,requires_owner_consent:true,
    mandate_ref:BROWSER_UPLOAD_MANDATE,previous_version:previous.version,
    added_capabilities:[BROWSER_UPLOAD_CAPABILITY],
    forbidden_actions_unchanged:true,budget_ceiling_unchanged:true,
    budget_snapshot_for_review:{budget_id:ids[0],available:budget.available,limits:budget.limits},
    mandate:{mandate_ref:BROWSER_UPLOAD_MANDATE,principal_ref:'principal:jhn',
      expected_version:previous.version,scope,
      valid_from:previous.valid_from,valid_until:previous.valid_until,
      reason:'Choix de fichier via le Navigation Assistant JHN, cible HTTPS et chemin local explicites, sans clic publier, sous contrôle COP des effets externes. Aucun nouveau droit de diffusion générale.'},
    mandate_amended:false
  };
}
