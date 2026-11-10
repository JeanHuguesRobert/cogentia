/**
 * Internal COP-governed continuation terminal execution. No network or CLI
 * entrypoint: the caller supplies server-owned authority context and a COP
 * event-backed execution ledger. Never use client JSON to build these.
 */
import { assessJohnCopAuthority } from "./john-cop-authority-preflight.js";
import { currentPacketClaim, validatePacketClaim } from "./continuation-packet-claim.js";
import {
  resolveClaimedContinuation, recoverClaimedResolution,
  inspectContinuationPacketCoordination, continuationRevision,
} from "./continuation-terminal-settlement.js";

const refuse=(code,extra={})=>({ok:false,code,...extra});
export function resolveJohnCopContinuation(root,id,{
  witness,expectedSha256,decision,reason="",payload={},
  store,auth,mandate_ref,version_pin,verifyIssuer,ledger,
  capability="continuation.resolve",demand={max_steps:1},
  at_time,
}={}) {
  // COP preflight is not an execution grant and cannot be replaced by
  // the legacy boolean admission hook used in synthetic core unit tests.
  const preflight=assessJohnCopAuthority({
    store,auth,mandate_ref,version_pin,capability,ledger,verifyIssuer,at_time,
  });
  if (!preflight.ok || preflight.preflight_ok!==true)
    return refuse("COP_PREFLIGHT_DENIED",{reason:preflight.error || "unverified"});
  if (!ledger || typeof ledger.reserve!=="function" ||
      typeof ledger.settle!=="function" || typeof ledger.release!=="function" ||
      typeof ledger.snapshot!=="function")
    return refuse("COP_BUDGET_LEDGER_REQUIRED");
  if (typeof witness?.claim_id!=="string" || typeof witness.handler_ref!=="string")
    return refuse("CLAIM_WITNESS_REQUIRED");
  // Read-only checks before budget reservation: invalid revisions and
  // stale witnesses must not consume a one-shot idempotency key.
  const latestBefore=currentPacketClaim(root,id);
  const inRecovery=latestBefore?.status==="settlement_prepared" &&
    latestBefore.claim_id===witness.claim_id &&
    latestBefore.handler_ref===witness.handler_ref;
  if (!inRecovery) {
    const validity=validatePacketClaim(root,id,witness);
    if (!validity.ok) return refuse(validity.code);
    if (continuationRevision(root,id)!==expectedSha256)
      return refuse("BASELINE_CHANGED");
  }
  const idempotency_key="cop:continuation:terminal:"+id+":"+witness.claim_id;
  const previous=ledger.snapshot();
  const reservation=ledger.reserve({
    idempotency_key,expected_version:previous.version,demand,
  });
  if (!reservation.ok)
    return refuse("COP_BUDGET_RESERVATION_DENIED",{reason:reservation.error});
  const reservationId=reservation.reservation?.reservation_id;
  if (!reservationId) return refuse("COP_RESERVATION_MISSING");
  if (reservation.duplicate && reservation.reservation.status==="settled") {
    const receipt=inspectContinuationPacketCoordination(root,id);
    if (receipt.status==="completed" &&
        receipt.projection.completed_claims.some(x=>x.claim_id===witness.claim_id))
      return {ok:true,code:"ALREADY_COMPLETED",reservation_id:reservationId,
        result_ref:receipt.projection.completed_claims.find(x=>x.claim_id===witness.claim_id).result_ref,
        budget_settled:true};
    return refuse("COP_RESERVATION_ALREADY_SETTLED_WITHOUT_RECEIPT");
  }
  if (reservation.duplicate && reservation.reservation.status!=="reserved")
    return refuse("COP_RESERVATION_NOT_ACTIVE");
  let terminal;
  try {
    const latest=currentPacketClaim(root,id);
    if (latest?.status==="settlement_prepared" &&
        latest.claim_id===witness.claim_id && latest.handler_ref===witness.handler_ref) {
      terminal=recoverClaimedResolution(root,id);
    } else {
      terminal=resolveClaimedContinuation(root,id,{
        witness,expectedSha256,decision,reason,payload,
        // This callback is internal to an already verified COP preflight
        // and a successfully persisted budget reservation.
        authorize:()=>({ok:true,preflight, reservation_id:reservationId}),
      });
    }
  } catch (error) {
    const latest=currentPacketClaim(root,id);
    // Do not release after a committed terminal intent: replay must finish
    // the intent and then settle the same reservation exactly once.
    if (latest?.status!=="settlement_prepared" ||
        latest.claim_id!==witness.claim_id) {
      ledger.release({reservation_id:reservationId,
        expected_version:ledger.snapshot().version});
    }
    return refuse("TERMINAL_EXECUTION_INTERRUPTED",{reason:error.message,
      settlement_pending:latest?.status==="settlement_prepared"});
  }
  if (!terminal.ok) {
    const latest=currentPacketClaim(root,id);
    if (latest?.status!=="settlement_prepared" ||
        latest.claim_id!==witness.claim_id)
      ledger.release({reservation_id:reservationId,
        expected_version:ledger.snapshot().version});
    return {...terminal,budget_settled:false};
  }
  const settled=ledger.settle({
    reservation_id:reservationId,
    expected_version:ledger.snapshot().version,
    usage:demand,
  });
  if (!settled.ok) return refuse("COP_BUDGET_SETTLEMENT_PENDING",{
    reason:settled.error,reservation_id:reservationId,
    result_ref:terminal.result_ref,terminal_committed:true,
  });
  return {ok:true,code:"COP_TERMINAL_SETTLED",
    result_ref:terminal.result_ref,receipt:terminal.receipt,
    reservation_id:reservationId,budget_settled:true,
    cop_preflight_verified:true,delivery_confirmed:false};
}
