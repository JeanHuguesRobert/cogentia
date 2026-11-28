/**
 * #299/#285 — One independently signed JHN root mandate, many bounded
 * technical effects. This is an ADMISSION adapter, not a Principal issuer.
 *
 * A valid MCP bearer is only transport authentication. The signed mandate
 * itself must allow host.process.run AND a specific standing operation profile.
 * No caller-supplied permission, natural-language instruction or environment
 * flag can enlarge that signed scope.
 *
 * The active v4 signed standing profile currently admits diagnostics only;
 * this is an authority limitation, not a missing host execution capability.
 * Do not replace general execution with task-specific effect tools.
 */
import { randomUUID } from "node:crypto";
import { createEventSourcedExecutionBudgetLedger } from
  "../../../inseme/packages/cop-core/src/execution-budget.js";
import { resolveMandate } from "../../../inseme/packages/cop-core/src/governed-act.js";
import { projectPacketWorkAssignment } from "../../../inseme/packages/cop-core/src/packet-work-assignment.js";
import { assessJohnCopAuthority } from "./john-cop-authority-preflight.js";
import { isResolvedCallerAuth } from "./cogentia-mcp-auth.js";
import {workAuthorityAllows} from "./work-commissioning-contract.js";
import {BROWSER_INSTANCES,routeInSignedScope} from "./commissioned-work-routes.js";

export const STANDING_DIAGNOSTIC_PROFILE = "host.readonly-diagnostics/v1";
export const STANDING_GENERAL_HOST_PROFILE = "host.process-general/v1";
export const STANDING_MANDATE_REF = "mandate:jhn:john-root";
export const STANDING_TRANSPORT_LABEL = "mandate:chatgpt-corpus-coding";
export const STANDING_BUDGET_ID = "budget:mandate:jhn:john-root";

// Exact strings only: no shell separators, command interpolation, paths,
// agent-selected command-line arguments or side-effecting command chains.
const DIAGNOSTIC_COMMANDS = new Set([
  "hostname", "id -un", "pwd", "uname -s", "uptime",
  "$env:COMPUTERNAME", "$PSVersionTable.PSVersion.ToString()",
]);
const DEFAULT_TARGETS = Object.freeze({
  "node:fracta2": "unix-process",
  "node:i7-thinkpad-jhr": "windows-ssh",
});

const denied = (reason) => ({ allowed:false, verified:false, reason });

function activeStandingOperation(scope, request) {
  if (request.execution_mode!=="normal") return false;
  // Inventory is a signed, read-only semantic capability, not a shell
  // command. Only a commissioned packet may use this adapter.
  if(request.capability===BROWSER_INSTANCES)
    return typeof request.packet_ref==="string"&&request.command==null&&
      routeInSignedScope(scope,{capability:request.capability,target:request.target,
        provider:request.provider,execution_mode:request.execution_mode});
  const operations = scope?.standing_operations;
  if (!Array.isArray(operations)) return false;
  if (request.capability !== "host.process.run" ||
      request.execution_mode !== "normal") return false;
  if (DEFAULT_TARGETS[request.target] !== request.provider) return false;
  // A separately authenticated, signed v5 mandate can authorize generic
  // command execution. The actual command is an effect payload, not a new
  // capability or a hardcoded recipe. No v4 diagnostic permit is widened.
  if (typeof request.command==="string" && request.command.trim() &&
      request.command.length<=32768 &&
      operations.some(item=>item && typeof item==="object" &&
        item.profile===STANDING_GENERAL_HOST_PROFILE &&
        item.capability===request.capability &&
        item.target===request.target &&
        item.provider===request.provider &&
        item.execution_mode==="normal"))return true;
  return operations.some((item) => item && typeof item === "object" &&
    item.profile === STANDING_DIAGNOSTIC_PROFILE &&
    DIAGNOSTIC_COMMANDS.has(request.command) &&
    item.capability === request.capability &&
    item.target === request.target &&
    item.provider === request.provider &&
    item.execution_mode === "normal");
}

function updateBudget(ledger, method, reservationId, evidence) {
  for (let attempt=0; attempt<4; attempt++) {
    const snapshot=ledger.snapshot();
    const input={
      reservation_id:reservationId, expected_version:snapshot.version,
      idempotency_key:method+":"+reservationId,
      ...(method==="settle" ? {usage:{max_steps:1}, evidence} : {}),
    };
    const result=ledger[method](input);
    if (result?.ok) return result;
    if (result?.error !== "budget_version_conflict")
      throw Object.assign(new Error(result?.error || "standing_budget_finalize_failed"),
        {error_class:result?.error || "standing_budget_finalize_failed"});
  }
  throw Object.assign(new Error("standing_budget_cas_exhausted"),
    {error_class:"standing_budget_cas_exhausted"});
}

export function createCanonicalStandingMissionResolver({
  store, verifyIssuer, mandate_ref=STANDING_MANDATE_REF,
  budget_id=STANDING_BUDGET_ID,
  transport_mandate_label=STANDING_TRANSPORT_LABEL,
  now=()=>new Date(), resolvePacketContext=null,
}={}) {
  if (store?.kind!=="sqlite" || typeof store.listTopic!=="function" ||
      typeof store.append!=="function" ||
      typeof verifyIssuer!=="function" ||
      mandate_ref!==STANDING_MANDATE_REF ||
      budget_id!==STANDING_BUDGET_ID ||
      (resolvePacketContext!==null && typeof resolvePacketContext!=="function"))
    throw new TypeError("canonical_standing_authority_configuration_required");
  return async function standingMission(request={}) {
    const auth=request.caller_auth;
    if (!isResolvedCallerAuth(auth) || auth.auth!=="jhn" ||
        auth.allowMutate!==true || auth.principal_ref!=="principal:jhn" ||
        typeof auth.actor!=="string" || !auth.actor.startsWith("agent:jhn") ||
        auth.mandate_ref!==transport_mandate_label ||
        request.actor!==auth.actor ||
        request.principal!==auth.principal_ref ||
        request.mandate!==transport_mandate_label)
      return denied("standing_authenticated_caller_required");
    if (!request.payload_hash || typeof request.payload_hash!=="string")
      return denied("standing_payload_hash_required");
    if (request.execution_mode==="super")
      return denied("standing_privileged_execution_not_permitted");
    let mandate;
    try {mandate=resolveMandate(store,mandate_ref);}
    catch {return denied("standing_mandate_unavailable");}
    if (!mandate || !activeStandingOperation(mandate.scope,request))
      return denied("standing_operation_outside_signed_scope");

    // Direct calls retain their root budget. A packet-bound call must use
    // its real primary store and an existing active parent allocation.
    // A failed packet resolution never falls back to root.
    const parentLedger=createEventSourcedExecutionBudgetLedger({
      store,budget_id,require_authority_grant:true,
    });
    let ledger=parentLedger,local=null;
    function resolveLocal(){
      try{
        const c=resolvePacketContext?.({packet_ref:request.packet_ref,
          actor_ref:auth.actor,principal_ref:auth.principal_ref,
          mandate_ref,mandate_version:mandate.version,capability:request.capability,
          target:request.target,provider:request.provider,execution_mode:request.execution_mode});
        if(!c || c.budget_id===budget_id || c.budget_id!=="budget:"+request.packet_ref ||
           typeof c.primary_store_id!=="string" || !c.primary_store_id ||
           typeof c.store?.auditTopicCommitment!=="function")return null;
        const topic="packet:"+request.packet_ref;
        const history=c.store.listTopic(topic);
        const creation=history[0]?.payload;
        const created=creation?.packet;
        const work=creation?.access_context;
        const assignment=projectPacketWorkAssignment(c.store,{packet_ref:topic});
        const taskPhase=history.findLast(e=>e.payload?.profile==="cogentia.mcp-tasks-cop-pilot/v1"&&
          ["claimed","input_required","input_received","cancel_requested","completed","failed","cancelled",
           "reconciliation_required"].includes(e.payload.phase))?.payload.phase;
        const primary=created?.placements?.filter(p=>p.is_primary===true);
        if(created?.packet_id!==request.packet_ref || primary?.length!==1 ||
           primary[0].store_id!==c.primary_store_id ||
           c.store.auditTopicCommitment(topic)?.ok!==true ||
           c.store.auditTopicCommitment("execution-budget:"+c.budget_id)?.ok!==true)return null;
        // The canonical commissioning and responsibility, not the handler
        // name or the transport's owner string, identify this work.
        if(work?.schema!=="cogentia.work-commissioning/v1"||
           work.principal_ref!==auth.principal_ref||
           work.authority?.mandate_ref!==mandate_ref||
           work.authority?.version!==mandate.version||
           !workAuthorityAllows(work.authority,request.capability)||
           work.funding?.parent_budget_ref!==budget_id||
           assignment.ok!==true||assignment.status!=="assigned"||
           assignment.responsible_agent_ref!==auth.actor||
           taskPhase!=="claimed")return null;
        const l=createEventSourcedExecutionBudgetLedger({store:c.store,budget_id:c.budget_id,require_authority_grant:true});
        const b=l.snapshot();
        const events=store.listTopic("execution-budget:"+budget_id);
        const a=events.find(e=>e.event_type==="ExecutionBudgetReservation"&&
          e.payload?.reservation?.reservation_id===c.allocation_ref)?.payload?.reservation;
        if(!b.has_grant||b.mandate_ref!==mandate_ref||
           Object.keys(b.limits||{}).length!==1||!Number.isSafeInteger(b.limits.max_steps)||
           a?.idempotency_key!=="delegate:"+c.budget_id+":"+request.packet_ref||
           a.demand?.max_steps!==b.limits.max_steps||
           work.funding?.allocation?.max_steps!==b.limits.max_steps||
           events.some(e=>["ExecutionBudgetSettlement","ExecutionBudgetRelease"].includes(e.event_type)&&
             e.payload?.reservation_id===c.allocation_ref)||
           c.store.listTopic("execution-budget:"+c.budget_id).some(e=>e.event_type==="ExecutionBudgetSeal"))
          return null;
        return {context:c,ledger:l,assignment_revision:assignment.revision,
          assignment_ref:assignment.receipt_ref};
      }catch{return null}
    }
    if(request.packet_ref!=null){
      if(typeof request.packet_ref!=="string"||!request.packet_ref||request.packet_ref.length>255)
        return denied("standing_packet_context_unverified");
      local=resolveLocal();
      if(!local)return denied("standing_packet_context_unverified");
      ledger=local.ledger;
    }
    const accountingContext={budget_id:local?.context.budget_id??budget_id,
      accounting_locality:local?"packet":"principal",
      packet_ref:local?request.packet_ref:null,
      ...(local?{primary_store_id:local.context.primary_store_id,allocation_ref:local.context.allocation_ref,
        assignment_ref:local.assignment_ref}:{})};
    const preflight=assessJohnCopAuthority({
      store,auth,mandate_ref,version_pin:mandate.version,
      transport_mandate_label,capability:request.capability,
      ledger,verifyIssuer,at_time:now(),
    });
    if (!preflight.preflight_ok)
      return denied(preflight.error || "standing_canonical_authority_denied");
    // Recheck current revision after the expensive issuer preflight. If the
    // mandate was amended while it ran, don't admit under an obsolete scope.
    const latest=resolveMandate(store,mandate_ref);
    if (latest?.version!==mandate.version ||
        !activeStandingOperation(latest.scope,request))
      return denied("standing_mandate_changed");

    // One hard-budget unit per actual technical invocation. A new event
    // reservation is required for *every* effect, not a new human mandate.
    const reservationKey="standing:"+randomUUID();
    let reserved;
    for (let attempt=0; attempt<4; attempt++) {
      const snapshot=ledger.snapshot();
      const result=ledger.reserve({
        expected_version:snapshot.version,
        idempotency_key:reservationKey,demand:{max_steps:1},
      });
      if (result?.ok) {reserved=result;break;}
      if (result?.error!=="budget_version_conflict")
        return denied(result?.error || "standing_budget_denied");
    }
    if (!reserved?.ok) return denied("standing_budget_cas_exhausted");
    const reservationId=reserved.reservation.reservation_id;
    let finished=false;
    return {
      allowed:true,verified:true,authority_id:reservationId,
      principal:auth.principal_ref,
      actor:auth.actor,mandate:request.mandate,
      capability:request.capability,target:request.target,
      payload_hash:request.payload_hash,
      allowed_operations:[request.capability],
      allowed_execution_modes:["normal"],
      issuer_ref:mandate_ref,mandate_version:mandate.version,
      expires_at:mandate.valid_until,
      ...accountingContext,
      async beforeDispatch() {
        // A previous reservation is NOT authority to execute after the
        // Principal revokes or amends the standing mandate. Revalidate
        // issuer, signed scope, version and current budget before dispatch.
        if (finished) return false;
        const current=resolveMandate(store,mandate_ref);
        if (current?.version!==mandate.version ||
            !activeStandingOperation(current.scope,request)) return false;
        if(local){
          const currentLocal=resolveLocal();
          if(!currentLocal||currentLocal.context.store!==local.context.store||
             currentLocal.context.primary_store_id!==local.context.primary_store_id||
             currentLocal.context.allocation_ref!==local.context.allocation_ref||
             currentLocal.assignment_revision!==local.assignment_revision||
             currentLocal.assignment_ref!==local.assignment_ref)return false;
        }
        const fresh=assessJohnCopAuthority({
          store,auth,mandate_ref,version_pin:mandate.version,
          transport_mandate_label,capability:request.capability,
          ledger,verifyIssuer,at_time:now(),
        });
        return fresh.preflight_ok===true;
      },
      async finalize({attempted=false,ok=false,receipt=null}={}) {
        if (finished) return {ok:true,duplicate:true,reservation_id:reservationId};
        // A dispatch that was started consumes its step even if the provider
        // fails/its ACK is lost. Pre-dispatch failures release the reservation.
        const method=attempted ? "settle" : "release";
        const outcome=updateBudget(ledger,method,reservationId,
          attempted ? {outcome:ok ? "success" : "failed_or_uncertain",
            payload_hash:request.payload_hash,
            ...accountingContext,
            ...(receipt?.status ? {status:receipt.status} : {}),
            ...(/^(?:hct|sct)_[0-9a-f-]{36}$/.test(receipt?.trace_id||"")?{trace_id:receipt.trace_id}:{}),
            ...(/^sha256:[a-f0-9]{64}$/.test(receipt?.receipt_hash||"")?{provider_receipt_hash:receipt.receipt_hash,
              output_truncated:receipt.output_truncated===true}:{})} : null);
        finished=true;
        return {ok:outcome.ok,canonical_cop:true,
          budget_action:method,reservation_id:reservationId,
          mandate_ref,mandate_version:mandate.version,
          ...accountingContext,
          accounting_complete:outcome.ok===true};
      },
    };
  };
}
