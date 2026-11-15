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
import { assessJohnCopAuthority } from "./john-cop-authority-preflight.js";
import { isResolvedCallerAuth } from "./cogentia-mcp-auth.js";

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
  now=()=>new Date(),
}={}) {
  if (store?.kind!=="sqlite" || typeof store.listTopic!=="function" ||
      typeof store.append!=="function" ||
      typeof verifyIssuer!=="function" ||
      mandate_ref!==STANDING_MANDATE_REF ||
      budget_id!==STANDING_BUDGET_ID)
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

    const ledger=createEventSourcedExecutionBudgetLedger({
      store,budget_id,require_authority_grant:true,
    });
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
      async beforeDispatch() {
        // A previous reservation is NOT authority to execute after the
        // Principal revokes or amends the standing mandate. Revalidate
        // issuer, signed scope, version and current budget before dispatch.
        if (finished) return false;
        const current=resolveMandate(store,mandate_ref);
        if (current?.version!==mandate.version ||
            !activeStandingOperation(current.scope,request)) return false;
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
            ...(receipt?.status ? {status:receipt.status} : {})} : null);
        finished=true;
        return {ok:outcome.ok,canonical_cop:true,
          budget_action:method,reservation_id:reservationId,
          mandate_ref,mandate_version:mandate.version,
          accounting_complete:outcome.ok===true};
      },
    };
  };
}
