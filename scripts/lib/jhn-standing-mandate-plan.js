/**
 * #299/#285 — ONE permanent JHN delegation amendment, not one mandate per
 * command/record/commit. Proposal only. The existing JHN Supabase Principal
 * consent and signed canonical Inseme mandate kernel issue any amendment.
 * This file cannot apply an amendment, mint authority or execute effects.
 */
import {isMandateActive,resolveMandate} from
  "../../../inseme/packages/cop-core/src/governed-act.js";
import {createEventSourcedExecutionBudgetLedger} from
  "../../../inseme/packages/cop-core/src/execution-budget.js";
import {STANDING_DIAGNOSTIC_PROFILE,STANDING_GENERAL_HOST_PROFILE,
  STANDING_MANDATE_REF} from "./john-standing-mission-authority.js";
const REF=STANDING_MANDATE_REF;
export const STANDING_CAPABILITIES=Object.freeze([
  "github.write","github.commit","github.push","git.commit","git.push",
  "continuation.resolve","host.process.run","host.fs.write",
  "dns.record.ensure","site.static.release",
]);
const forbid=Object.freeze([
  "communication.send","gmail.send","whatsapp.send","publish",
  "legal.commit","financial.commit","payment.execute","formal.submit",
  "representation.act","third_party.disclose","sensitive.disclose",
  "private.disclose","purchase.execute","security.credentials.change",
  "irreversible.delete",
]);
const fail=error=>Object.freeze({ok:false,error,mandate_amended:false});
export function johnStandingMandatePlan({store,at_time=new Date()}={}) {
  if(typeof store?.replay!=="function" || typeof store?.listTopic!=="function")
    return fail("canonical_store_required");
  let existing;
  try{existing=resolveMandate(store,REF);}catch{return fail("canonical_mandate_unavailable");}
  if(!existing || existing.status!=="active" || !isMandateActive(store,REF) ||
    existing.principal_ref!=="principal:jhn" ||
    existing.logical_agent_ref!=="agent:jhn" ||
    !/^v[1-9]\d*$/.test(existing.version||"") ||
    !Array.isArray(existing.scope?.allowed_actions) ||
    !Array.isArray(existing.scope?.forbidden_actions) ||
    forbid.some(x=>!existing.scope.forbidden_actions.includes(x)))
    return fail("canonical_root_scope_untrusted");
  const now=+at_time;
  if(!Number.isFinite(now) ||
    Date.parse(existing.valid_from)>now || Date.parse(existing.valid_until)<=now)
    return fail("mandate_outside_validity");
  const ids=[...new Set(store.replay().filter(e=>
    e.payload?.kind==="ExecutionBudgetGrant" &&
    e.payload?.mandate_ref===REF).map(e=>e.payload.budget_id))];
  if(ids.length!==1||ids[0]!=="budget:"+REF)
    return fail("canonical_budget_identity_ambiguous");
  let budget;
  try{
    budget=createEventSourcedExecutionBudgetLedger({
      store,budget_id:ids[0],require_authority_grant:true,
    }).snapshot();
  }catch{return fail("canonical_budget_unavailable");}
  if(!budget.has_grant || budget.mandate_ref!==REF ||
    !Number.isSafeInteger(budget.available?.max_steps) ||
    budget.available.max_steps<1 ||
    budget.limits?.max_steps!==existing.scope.budget_ceiling?.max_steps)
    return fail("canonical_budget_not_usable");
  // v4 was already signed by the Principal. Its broad action name was
  // accidentally paired with a diagnostics-only admission profile. A single
  // authenticated v4→v5 amendment fixes that durable delegation; no new MCP
  // tool, capacity, provider, host or per-command signature is introduced.
  if (existing.version==="v4") {
    const scope=structuredClone(existing.scope);
    if (!scope.allowed_actions.includes("host.process.run") ||
        !Array.isArray(scope.standing_operations) ||
        scope.standing_operations.length!==2 ||
        scope.standing_operations.some(op=>
          op.profile!==STANDING_DIAGNOSTIC_PROFILE ||
          op.capability!=="host.process.run"))
      return fail("standing_v4_lineage_untrusted");
    scope.allowed_actions=scope.allowed_actions.filter(action=>
      action!=="dns.record.ensure"&&action!=="site.static.release");
    scope.standing_operations=[
      {profile:STANDING_GENERAL_HOST_PROFILE,capability:"host.process.run",
        target:"node:fracta2",provider:"unix-process",execution_mode:"normal"},
      {profile:STANDING_GENERAL_HOST_PROFILE,capability:"host.process.run",
        target:"node:i7-thinkpad-jhr",provider:"windows-ssh",execution_mode:"normal"},
    ];
    delete scope.standing_technical_policy;
    return {ok:true,ready_for_issuance:true,requires_owner_consent:true,
      mandate_ref:REF,previous_version:"v4",next_version:"v5",
      added_capabilities:[],removed_obsolete_capabilities:[
        "dns.record.ensure","site.static.release"],
      forbidden_actions_unchanged:true,budget_ceiling_unchanged:true,
      budget_snapshot_for_review:{budget_id:ids[0],limits:budget.limits,
        available:budget.available,observed_version:budget.version},
      mandate:{mandate_ref:REF,principal_ref:"principal:jhn",
        expected_version:"v4",scope,valid_from:existing.valid_from,
        valid_until:existing.valid_until,
        reason:"Correction FBF : une capacité générale host.process.run sur les nœuds Fractanet existants sous mandat permanent, avec budget COP et reçus ; suppression des outils spécialisés au Musée. Restrictions externes et durée inchangées."},
      mandate_amended:false};
  }
  if (existing.version!=="v3"&&existing.version!=="v5")
    return fail("standing_plan_version_unsupported");
  if (existing.version==="v5")return {ok:true,
    already_authorized_in_scope:true,mandate_ref:REF,version:"v5",
    mandate_amended:false};
  const scope=structuredClone(existing.scope);
  const added=STANDING_CAPABILITIES.filter(x=>!scope.allowed_actions.includes(x));
  if(added.some(x=>scope.forbidden_actions.includes(x)))
    return fail("standing_capability_forbidden");
  scope.allowed_actions=[...scope.allowed_actions,...added];
  scope.repository_policy={
    kind:"cop.github-provider-access/v1",provider:"github",
    selection:"credential_accessible",include_future:true,
    require_verified_target:true,ownership_check:"provider_enforced",
  };
  // Historical v3→v4 exact-consent payload, preserved for the signed
  // 2026-11-15 lineage. The v4→v5 correction above removes the accidental
  // diagnostics-only limitation without inventing any new MCP capability.
  scope.standing_operations=[
    {profile:STANDING_DIAGNOSTIC_PROFILE,capability:"host.process.run",
      target:"node:fracta2",provider:"unix-process",execution_mode:"normal"},
    {profile:STANDING_DIAGNOSTIC_PROFILE,capability:"host.process.run",
      target:"node:i7-thinkpad-jhr",provider:"windows-ssh",
      execution_mode:"normal"},
  ];
  scope.standing_technical_policy={
    version:1,repeat_per_act_consent:false,
    rule:"check exact provider scope, optimistic conflict, recovery, COP budget and receipt on each effect",
    dns:{capability:"dns.record.ensure",zones:["baronsmariani.org","acorsica.org"],
      allowed_types:["CNAME"],proxied:false,write_mode:"create_only",
      require_nonconflicting_name:true,forbid_mx_ns:true},
    site:{capability:"site.static.release",source_visibility:"already_public",
      require_pinned_revision:true,require_rollback:true,
      forbid_new_authorship:true,forbid_private_disclosure:true},
    workspace:{capability:"host.fs.write",require_bounded_workspace:true,
      forbid_secrets:true,require_recovery:true},
    external_commitments:"excluded",
  };
  const unchanged=JSON.stringify(scope.forbidden_actions)===
    JSON.stringify(existing.scope.forbidden_actions) &&
    JSON.stringify(scope.budget_ceiling)===JSON.stringify(existing.scope.budget_ceiling) &&
    JSON.stringify([existing.valid_from,existing.valid_until]).length>0;
  if(!unchanged)return fail("invariant_change_refused");
  if(!added.length &&
    JSON.stringify(existing.scope.standing_operations)===JSON.stringify(scope.standing_operations) &&
    JSON.stringify(existing.scope.standing_technical_policy)===JSON.stringify(scope.standing_technical_policy))
    return {ok:true,already_authorized_in_scope:true,mandate_ref:REF,
      version:existing.version,mandate_amended:false};
  const mandate={mandate_ref:REF,principal_ref:"principal:jhn",
    expected_version:existing.version,scope,
    valid_from:existing.valid_from,valid_until:existing.valid_until,
    reason:"Délégation permanente Optimistic Locking pour les opérations techniques récupérables, modifications de Corpus et continuations sous contrôles COP; un mandat durable, des reçus par effet, sans messages aux tiers ni engagements réservés."};
  return {ok:true,ready_for_issuance:true,requires_owner_consent:true,
    mandate_ref:REF,previous_version:existing.version,
    next_version:"v"+(Number(existing.version.slice(1))+1),
    added_capabilities:added,
    forbidden_actions_unchanged:true,budget_ceiling_unchanged:true,
    budget_snapshot_for_review:{budget_id:ids[0],limits:budget.limits,
      available:budget.available,observed_version:budget.version},
    mandate,mandate_amended:false};
}
