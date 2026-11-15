/**
 * Canonical, source-level host for direct MCP Judgment result return.
 *
 * No mandate/issuer/budget/claim is inferred from a model submission or MCP
 * token. All admission data is reprojected from the existing COP journal.
 * An operator must supply an independently pinned issuer verifier and a
 * provider-channel permission evaluator. No account is activated by default.
 */
import { createEventSourcedExecutionBudgetLedger } from
  "../../../inseme/packages/cop-core/src/execution-budget.js";
import { continuationContextFromRecords, observeContinuationResult } from
  "../../../inseme/packages/cop-core/src/continuation-result.js";
import { createSqliteMcpResultReceiptStore } from
  "../../../inseme/packages/cop-core/src/sqlite-mcp-result-receipt-store.js";
import { projectPacketCoordination, validateCurrentPacketClaim } from
  "../../../inseme/packages/cop-core/src/packet-coordination.js";
import { assessJohnCopAuthority } from "./john-cop-authority-preflight.js";
import { resolveMandate } from "../../../inseme/packages/cop-core/src/governed-act.js";
import { isResolvedCallerAuth } from "./cogentia-mcp-auth.js";
import { projectCognitivePacketProgress } from "./cognitive-packet-progress.js";
import { recordChatgptReturnWake } from "./chatgpt-cps-return-wake.js";
import { createChatgptCpsReturnEvaluator } from "./chatgpt-cps-return-evaluator.js";
import { resumeContinuationFromReturnedEvent } from
  "../../../inseme/packages/cop-kernel/src/continuation.js";

export const RESULT_RETURN_CAPABILITY = "cogentia.continuation.result.submit";

function hasActiveBudgetReservation(store, budgetId, reservationId) {
  if (!reservationId) return false;
  const events = store.listTopic("execution-budget:" + budgetId);
  let status = "absent";
  for (const event of events) {
    const p = event.payload || {};
    const reservation = p.reservation || {};
    if (event.event_type === "ExecutionBudgetReservation" &&
        reservation.reservation_id === reservationId &&
        reservation.budget_id === budgetId) status = "reserved";
    if (["ExecutionBudgetSettlement", "ExecutionBudgetRelease"].includes(event.event_type) &&
        (p.reservation_id === reservationId || reservation.reservation_id === reservationId))
      status = "closed";
  }
  return status === "reserved";
}

/**
 * Construct a host only with externally verified authority inputs. The
 * returned provider can be injected into createMcpCore as
 * extras.mcpContinuationResultHost. This does NOT automatically enable it on
 * any running public or private MCP server.
 */
export function createCanonicalMcpJudgmentResultHost({
  store, mandate_ref, budget_id, transport_mandate_label,
  verifyIssuer, channelPermission, autoProcess = false,
} = {}) {
  if (!store || store.kind !== "sqlite" ||
      typeof store.listTopic !== "function" ||
      typeof store.transaction !== "function" ||
      !mandate_ref || !budget_id ||
      typeof verifyIssuer !== "function" ||
      typeof channelPermission !== "function")
    throw new TypeError("canonical_result_authority_configuration_required");
  const receiptStore = createSqliteMcpResultReceiptStore(store);
  return async function resultHost({ auth } = {}) {
    return {
      store: receiptStore,
      async afterReceipt(submission) {
        if (!autoProcess) return null;
        const id = submission?.continuation_id;
        if (!id) return null;
        const topic = "continuation:" + id;
        let records = store.listTopic(topic);
        const declaration = records.find(e => e.payload?.profile === "cop/continuation");
        const continuation = declaration?.payload?.continuation;
        // Only the canonical journal, not MCP arguments, may supply the
        // observation, channel or executable continuation descriptor.
        const observation = records.find(e => e.payload?.surface === "mcp" &&
          e.payload?.candidate_result?.continuation_id === id &&
          e.payload?.submission_idempotency_key === submission.idempotency_key);
        if (!continuation || !observation) return { status: "processing_pending" };
        const context = continuationContextFromRecords(
          records.filter(e => e.payload?.profile === "cop/continuation"),
          records.filter(e => e.payload?.profile === "cop.continuation-result/v1"),
        );
        const recognized = observeContinuationResult(observation, context);
        if (recognized.proposed_events.length) {
          const appended = store.appendBatch(recognized.proposed_events);
          if (!appended.ok) throw new Error(appended.error || "recognition_commit_failed");
        }
        records = store.listTopic(topic);
        const returned = records.find(e => e.payload?.profile ===
          "cop.continuation-result/v1" && e.payload.phase === "returned");
        if (!returned) return { status: "processing_pending" };
        // A browser ChatGPT return is a durable result, not permission to
        // invent or dispatch its next prompt. Release its actual, already
        // reserved one-step COP budget once, and let the CPS observer route
        // the verified return under the parent mandate separately.
        if (continuation.provider === "chatgpt" &&
            continuation.channel === "browser") {
          const settlementKey="chatgpt-browser:"+id+":settled";
          if (!store.eventByIdempotency(settlementKey)) {
            const ledger=createEventSourcedExecutionBudgetLedger({
              store,budget_id,require_authority_grant:true});
            const settled=ledger.settle({
              reservation_id:continuation.budget_reservation_id,
              expected_version:ledger.snapshot().version,
              idempotency_key:settlementKey,
              usage:{max_steps:1},
            });
            if (!settled.ok) throw new Error(
              settled.error || "chatgpt_result_budget_settlement_failed");
          }
          const wake=recordChatgptReturnWake({store,continuation:{...continuation,
            continuation_id:id},returned,budget_id});
          if(!wake.ok)throw new Error(wake.error||"chatgpt_scheduler_wake_failed");
          // Evaluation is local and safe to perform after the MCP return
          // has been durably recorded. No new browser/API turn is launched.
          const evaluate=createChatgptCpsReturnEvaluator({
            store,auth,mandate_ref,budget_id,
            transport_mandate_label,verifyIssuer,
          });
          const evaluation=await evaluate(id);
          // If the evaluator cannot proceed, leave the durable wake for
          // reconciliation rather than disguising an evaluation as success.
          return {status:"returned",autonomous_handler:false,
            scheduler_wake_receipt:wake.receipt_ref,
            local_cps_evaluation:evaluation.status};
        }
        // Dispatch only the trusted, no-external-effects local fixture handler.
        // Production agents need a separately configured governed resolver.
        if (continuation.provider !== "local-fixture" ||
            continuation.channel !== "mcp" ||
            continuation.resumeTo !== "handler:local-result-evaluator")
          return { status: "returned", autonomous_handler: false };
        const resumeKey = "continuation:" + id + ":local-resumed";
        if (!store.eventByIdempotency(resumeKey)) {
          const wake = await resumeContinuationFromReturnedEvent({
            continuation: { ...continuation, continuationId: id },
            returnedEvent: returned,
            handlerResolver: async (name) => name === "handler:local-result-evaluator"
              ? async ({ payload }) => ({
                  accepted: payload?.candidateResult?.status === "answered",
                  ...projectCognitivePacketProgress({
                    acceptance: continuation.parent_acceptance || [],
                    evidence: [],
                    nextActions: [{ id:"local-next-step", admissible:true,
                      available:true }],
                    agentClaim: "completed",
                  }),
                  packet_completed: false,
                }) : null,
          });
          // Handler output is a Step result, not authority to close its parent.
          const recorded = store.append({
            topic_id: topic,
            event_type: "cop.event/v1",
            actor_id: "cop:local-result-resumption",
            subject_ref: "continuation:" + id,
            visibility: "restricted",
            epistemic_status: "observed",
            idempotency_key: resumeKey,
            causal_refs: [returned.idempotency_key],
            payload: {
              profile: "cop.continuation-resumption/v1",
              phase: "resumed",
              continuation_id: id,
              handler: continuation.resumeTo,
              execution: wake.execution?.result || null,
              parent_packet_status: wake.execution?.result?.status === "completed"
                ? "completed" : "open",
            },
          });
          if (!recorded.ok) throw new Error(recorded.error || "resumption_commit_failed");
        }
        return { status: "resumed", autonomous_handler: true };
      },
      async admit(submission) {
        const continuationId = submission?.continuation_id;
        if (typeof continuationId !== "string" || !continuationId)
          return null;
        const events = store.listTopic("continuation:" + continuationId);
        const reconstructed = continuationContextFromRecords(
          events.filter(e => e.payload?.profile === "cop/continuation"),
          events.filter(e => e.payload?.profile === "cop.continuation-result/v1"),
        );
        const continuation = reconstructed.continuations[continuationId] || null;
        // Actor/receipt read are authenticated by the MCP layer; not by the
        // submitted continuation ID or claimed model/provenance fields.
        const actor = auth?.actor;
        if (!isResolvedCallerAuth(auth) || auth.auth !== "jhn" ||
            auth.principal_ref !== "principal:jhn" ||
            typeof actor !== "string" || !actor.startsWith("agent:jhn") ||
            !continuation) return null;
        const ledger = createEventSourcedExecutionBudgetLedger({
          store, budget_id, require_authority_grant: true,
        });
        // Resolve version on EVERY admission. A signed vN amendment or
        // revocation must take effect without restarting the MCP connection.
        // assessJohnCopAuthority independently verifies the full issuer chain
        // and rejects a stale/revoked/invalid current declaration.
        const version_pin = resolveMandate(store, mandate_ref)?.version;
        const preflight = assessJohnCopAuthority({
          store, auth, mandate_ref, version_pin,
          transport_mandate_label, capability: RESULT_RETURN_CAPABILITY,
          ledger, verifyIssuer,
        });
        // An exact previously persisted receipt can still be read after
        // mandate/budget expiry. Only fresh writes require this preflight.
        const canRead = auth?.allowMutate === true && auth?.auth === "jhn";
        const budgetReservation = continuation.budget_reservation_id;
        const packetRef = continuation.packet_ref;
        const witness = continuation.claim;
        const projection = packetRef
          ? projectPacketCoordination(
              store.listTopic("packet-coordination:" + packetRef)
                .map(e => e.payload?.packet_coordination_event).filter(Boolean)
            ) : null;
        const valid = witness && projection
          ? validateCurrentPacketClaim(projection, {
              claimId: witness.claim_id, handlerRef: actor,
              epoch: witness.epoch, now: new Date(),
            }) : { ok: false };
        const channelAllowed = await channelPermission({
          continuation, auth, provider: continuation.provider,
          channel: continuation.channel,
        }) === true;
        return {
          authenticated_actor: actor,
          receipt_read_authorized: canRead,
          channel_permitted: channelAllowed,
          mandate_valid: preflight.preflight_ok === true,
          budget_admitted: preflight.preflight_ok === true &&
            hasActiveBudgetReservation(store, budget_id, budgetReservation),
          claim_valid: valid.ok === true,
          continuation,
          claim: witness ? {
            packet_ref: packetRef, claim_id: witness.claim_id,
            handler_ref: actor, epoch: witness.epoch,
            expected_generation: witness.expected_generation,
          } : null,
        };
      },
    };
  };
}
