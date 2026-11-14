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
import { continuationContextFromRecords } from
  "../../../inseme/packages/cop-core/src/continuation-result.js";
import { createSqliteMcpResultReceiptStore } from
  "../../../inseme/packages/cop-core/src/sqlite-mcp-result-receipt-store.js";
import { projectPacketCoordination, validateCurrentPacketClaim } from
  "../../../inseme/packages/cop-core/src/packet-coordination.js";
import { assessJohnCopAuthority } from "./john-cop-authority-preflight.js";
import { resolveMandate } from "../../../inseme/packages/cop-core/src/governed-act.js";
import { isResolvedCallerAuth } from "./cogentia-mcp-auth.js";

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
  verifyIssuer, channelPermission,
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
