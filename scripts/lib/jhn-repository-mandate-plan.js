/**
 * #324 — deterministic planning of JHN's owner-scoped GitHub delegation.
 * This function NEVER writes a mandate, requests consent, or grants authority.
 *
 * GitHub authenticates the repository operation and enforces its own ACLs.
 * COP governs the agent's delegated purposes, capabilities and budgets;
 * it must not duplicate GitHub's repository ownership database.
 */
import {resolveMandate,isMandateActive} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';

const REF='mandate:jhn:john-root';
const EXTRA=['github.write','github.commit','github.push','git.commit','git.push'];
const fail=error=>({ok:false,error,mandate_amended:false});

export function johnRepositoryMandatePlan({store,at_time=new Date()}={}) {
  if(typeof store?.replay!=='function'||typeof store?.listTopic!=='function')
    return fail('canonical_store_unavailable');
  let previous;
  try { previous=resolveMandate(store,REF); }
  catch {return fail('canonical_mandate_unavailable');}
  if(!previous||!isMandateActive(store,REF)||previous.status!=='active'||
     previous.principal_ref!=='principal:jhn'||previous.logical_agent_ref!=='agent:jhn'||
     !/^v[1-9]\d*$/.test(previous.version||'')||
     !previous.scope||!Array.isArray(previous.scope.allowed_actions)||
     !Array.isArray(previous.scope.forbidden_actions))
    return fail('canonical_root_mandate_unavailable');
  const now=+at_time;
  if(!Number.isFinite(now)||
     (previous.valid_from&&Date.parse(previous.valid_from)>now)||
     (previous.valid_until&&Date.parse(previous.valid_until)<=now))
    return fail('mandate_outside_validity');
  const forbidden=new Set(previous.scope.forbidden_actions);
  if(EXTRA.some(cap=>forbidden.has(cap)))return fail('explicitly_forbidden_repository_action');
  const missing=EXTRA.filter(cap=>!previous.scope.allowed_actions.includes(cap));
  // Reuse the existing mandate-keyed hard budget; do not issue a new grant,
  // reset accounting or silently enlarge it. Recheck at governed dispatch.
  const grants=store.replay().filter(e=>e.payload?.kind==='ExecutionBudgetGrant'&&
    e.payload.mandate_ref===REF);
  const budgetIds=[...new Set(grants.map(e=>e.payload.budget_id))];
  if(budgetIds.length!==1||typeof budgetIds[0]!=='string'||!budgetIds[0])
    return fail('canonical_budget_not_uniquely_funded');
  let funded;
  try {
    funded=createEventSourcedExecutionBudgetLedger({
      store,budget_id:budgetIds[0],require_authority_grant:true
    }).snapshot();
  } catch {return fail('canonical_budget_unavailable');}
  if(!funded.has_grant||funded.mandate_ref!==REF||
     !Number.isInteger(funded.available?.max_steps)||funded.available.max_steps<1||
     !Number.isInteger(funded.limits?.max_steps)||funded.limits.max_steps<1||
     funded.limits.max_steps!==previous.scope.budget_ceiling?.max_steps)
    return fail('canonical_budget_not_usable');
  // GitHub is the authority on permissions. COP need not mirror its ACLs.
  // Access remains bounded by the actual delegated credentials and GitHub rules.
  // Local git paths/remotes require target binding, NOT owner lookup.
  const repository_policy={kind:'cop.github-provider-access/v1',
    provider:'github',selection:'credential_accessible',
    include_future:true,require_verified_target:true,
    ownership_check:'provider_enforced'};
  const scope=structuredClone(previous.scope);
  scope.allowed_actions=[...scope.allowed_actions,...missing];
  scope.repository_policy=repository_policy;
  return {
    ok:true,ready_for_issuance:true,requires_owner_consent:true,
    blocking_reasons:[],
    mandate_ref:REF,previous_version:previous.version,
    added_capabilities:missing,repository_policy,
    budget_snapshot_for_review:{budget_id:funded.budget_id,authority_version:funded.authority_version,
      limits:funded.limits,available:funded.available},
    mandate:{mandate_ref:REF,principal_ref:'principal:jhn',
      expected_version:previous.version,scope,
      valid_from:previous.valid_from,valid_until:previous.valid_until,
      reason:'Standing repository delegation subject to GitHub credentials, provider permissions and COP purposes; no third-party communications or irreversible effects.'},
    mandate_amended:false,consent_challenge_created:false
  };
}
