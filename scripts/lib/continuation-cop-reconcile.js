/**
 * Internal-only COP settlement reconciler. A completed terminal claim already
 * crossed its effect boundary. Reconciliation is bookkeeping, NOT authority
 * to produce a new effect or to create a budget reservation.
 *
 * Does not depend on the mandate remaining active AFTER that commit. It does
 * require a server-resolved JHN actor, original event-sourced reservation,
 * matching durable intent and claim witness, and the canonical result hash.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { isResolvedCallerAuth } from "./cogentia-mcp-auth.js";
import { currentPacketClaim } from "./continuation-packet-claim.js";
import { isClaimExpired } from "../../../inseme/packages/cop-core/src/packet-coordination.js";
import {
  recoverClaimedResolution, inspectContinuationPacketCoordination,
} from "./continuation-terminal-settlement.js";

const hash=value=>createHash("sha256").update(value).digest("hex");
const refuse=(code,rest={})=>({ok:false,code,...rest});
const validId=id=>typeof id==="string" && /^ctn_[a-z0-9_]{8,}$/i.test(id);
const validBudget=id=>typeof id==="string" && /^budget:mandate:[a-z0-9:._-]+$/i.test(id);

/**
 * Source-of-truth lookup for a reservation. Never call ledger.reserve during
 * reconciliation: that could CREATE an authority-bearing reservation.
 */
function reservationEvents(store,budget_id,reservationId) {
  if(typeof store?.listTopic!=="function") return null;
  const events=store.listTopic("execution-budget:"+budget_id);
  const grants=events.filter(e=>e.event_type==="ExecutionBudgetGrant");
  const original=events.find(e=>e.event_type==="ExecutionBudgetReservation"
    && e.payload?.reservation?.reservation_id===reservationId);
  const settlements=events.filter(e=>e.event_type==="ExecutionBudgetSettlement"
    && e.payload?.reservation_id===reservationId);
  const releases=events.filter(e=>e.event_type==="ExecutionBudgetRelease"
    && e.payload?.reservation_id===reservationId);
  return {grants,original,settlements,releases};
}
export function reconcileJohnCopSettlement(root,id,{
  auth,store,ledger,retryLimit=3,
}={}) {
  if(!validId(id)) return refuse("INVALID_CONTINUATION_ID");
  if(!isResolvedCallerAuth(auth) || auth.auth!=="jhn" ||
     auth.principal_ref!=="principal:jhn" || auth.allowMutate!==true)
    return refuse("AUTHENTICATED_JHN_RECONCILER_REQUIRED");
  if(typeof ledger?.snapshot!=="function" || typeof ledger?.settle!=="function")
    return refuse("DURABLE_BUDGET_LEDGER_REQUIRED");
  if(typeof store?.listTopic!=="function")
    return refuse("DURABLE_COP_STORE_REQUIRED");
  const intent=currentPacketClaim(root,id);
  if(intent?.schema!=="cogentia.cop-terminal-intent/v1" ||
     intent.status!=="settlement_prepared")
    return refuse("NO_PREPARED_TERMINAL_INTENT");
  const b=intent.settlement?.budget_reservation;
  if(!validBudget(b?.budget_id) || typeof b?.reservation_id!=="string" ||
     !b?.mandate_ref || b?.capability!=="continuation.resolve" ||
     b?.version_pin!=="v1" || typeof b?.intent_sha256!=="string")
    return refuse("INVALID_TERMINAL_BUDGET_BINDING");
  const claim=intent.settlement?.claim;
  if(claim?.claim_id!==intent.claim_id ||
     claim?.handler_ref!==intent.handler_ref ||
     claim?.epoch!==intent.predecessor_epoch ||
     claim?.packet_ref!=="continuation:"+id)
    return refuse("TERMINAL_CLAIM_BINDING_MISMATCH");
  const expectedKey="cop:continuation:terminal:"+id+":"+claim.claim_id;
  if(b.reservation_id!=="reservation:"+b.budget_id+":"+expectedKey)
    return refuse("TERMINAL_RESERVATION_ID_MISMATCH");
  const history=reservationEvents(store,b.budget_id,b.reservation_id);
  if(!history?.original || !history.grants.length)
    return refuse("COP_RESERVATION_EVIDENCE_MISSING");
  const recorded=history.original.payload.reservation;
  if(recorded?.idempotency_key!==expectedKey ||
     recorded?.budget_id!==b.budget_id ||
     history.original.payload.budget_id!==b.budget_id)
    return refuse("COP_RESERVATION_EVIDENCE_MISMATCH");
  if(!history.grants.some(e=>e.payload?.mandate_ref===b.mandate_ref &&
     e.payload?.budget_id===b.budget_id))
    return refuse("COP_MANDATE_GRANT_EVIDENCE_MISSING");
  if(history.releases.length)
    return refuse("COP_RESERVATION_RELEASED");
  if(ledger.snapshot().budget_id!==b.budget_id)
    return refuse("COP_LEDGER_IDENTITY_MISMATCH");
  const file=path.join(root,".cogentia","continuations",id+".json");
  const body=fs.readFileSync(file,"utf8");
  const desired=intent.settlement.desired_json;
  if(hash(desired)!==intent.settlement.result_sha256)
    return refuse("CORRUPT_TERMINAL_INTENT");
  if(hash(body)!==intent.settlement.baseline_sha256 &&
     hash(body)!==intent.settlement.result_sha256)
    return refuse("TERMINAL_REVISION_CONFLICT");
  // An existing receipt is checked, not trusted blindly.
  const before=inspectContinuationPacketCoordination(root,id);
  if(before.status==="completed") {
    const completion=before.events.find(e=>e.type==="PACKET_CLAIM_COMPLETED");
    if(completion?.claim_id!==claim.claim_id ||
       completion?.result_sha256!==intent.settlement.result_sha256 ||
       completion?.budget_reservation?.reservation_id!==b.reservation_id)
      return refuse("COMPLETION_RECEIPT_MISMATCH");
  }
  // Recover ONLY a previously prepared, approved intent; never recompute a
  // decision or execute a new action. Revocation does not erase this evidence.
  const terminal=recoverClaimedResolution(root,id);
  if(!terminal.ok) return refuse("TERMINAL_RECOVERY_FAILED",{reason:terminal.code});
  const receipt=terminal.receipt;
  if(receipt?.budget_reservation?.reservation_id!==b.reservation_id ||
     receipt?.claim_id!==claim.claim_id ||
     receipt?.result_sha256!==intent.settlement.result_sha256)
    return refuse("RECOVERED_RECEIPT_MISMATCH");
  // The durable budget store handles idempotency. A version collision is
  // retried against a FRESH version; no new reservation can be created here.
  for(let attempt=0;attempt<retryLimit;attempt++) {
    const result=ledger.settle({
      reservation_id:b.reservation_id,
      expected_version:ledger.snapshot().version,
      usage:recorded.demand,
      idempotency_key:"settle:"+b.reservation_id,
      evidence:{
        continuation_id:id,claim_id:claim.claim_id,
        result_ref:receipt.result_ref,result_sha256:receipt.result_sha256,
      },
    });
    if(result.ok) return {ok:true,code:result.duplicate?
      "ALREADY_RECONCILED":"RECONCILED",reservation_id:b.reservation_id,
      result_ref:receipt.result_ref,budget_settled:true,
      delivered:false};
    if(result.error!=="budget_version_conflict")
      return refuse("COP_BUDGET_RECONCILIATION_FAILED",{reason:result.error});
  }
  return refuse("COP_BUDGET_VERSION_CONFLICT");
}

/**
 * Release an abandoned budget reservation ONLY when its original claim
 * epoch has expired and NO terminal intent/receipt was ever published for
 * this particular witness. Never releases a currently live reservation.
 */
export function reconcileOrphanJohnCopReservation(root,id,{
  auth,store,ledger,witness,now=new Date(),retryLimit=3,
}={}) {
  if(!validId(id)) return refuse("INVALID_CONTINUATION_ID");
  if(!isResolvedCallerAuth(auth) || auth.auth!=="jhn" ||
     auth.principal_ref!=="principal:jhn" || auth.allowMutate!==true)
    return refuse("AUTHENTICATED_JHN_RECONCILER_REQUIRED");
  if(typeof store?.listTopic!=="function" ||
     typeof ledger?.release!=="function" || typeof ledger?.snapshot!=="function")
    return refuse("DURABLE_COP_REQUIRED");
  if(typeof witness?.claim_id!=="string" ||
     !Number.isInteger(witness.epoch) || witness.epoch<1 ||
     witness.packet_ref!=="continuation:"+id)
    return refuse("CLAIM_WITNESS_REQUIRED");
  const dir=path.join(root,".cogentia","resolvers","claims-v1",id);
  const file=path.join(dir,String(witness.epoch).padStart(12,"0")+".json");
  if(!fs.existsSync(file)) return refuse("CLAIM_EPOCH_NOT_FOUND");
  const original=JSON.parse(fs.readFileSync(file,"utf8"));
  if(original.schema!=="cop.packet-claim/v1" ||
     original.claim_id!==witness.claim_id ||
     original.handler_ref!==witness.handler_ref ||
     original.epoch!==witness.epoch)
    return refuse("CLAIM_WITNESS_MISMATCH");
  if(!isClaimExpired(original,now)) return refuse("CLAIM_STILL_ACTIVE");
  const epochs=fs.readdirSync(dir).filter(f=>/^\d{12}\.json$/.test(f)).sort();
  for(const f of epochs) {
    const item=JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"));
    if(item.status==="settlement_prepared" && item.claim_id===witness.claim_id)
      return refuse("TERMINAL_SETTLEMENT_PREPARED");
  }
  const receipt=inspectContinuationPacketCoordination(root,id);
  if(receipt.events.some(e=>e.type==="PACKET_CLAIM_COMPLETED" &&
     e.claim_id===witness.claim_id))
    return refuse("TERMINAL_ALREADY_COMPLETED");
  const snap=ledger.snapshot();
  const budget_id=snap.budget_id;
  if(!validBudget(budget_id)) return refuse("INVALID_BUDGET_IDENTITY");
  const idempotency_key="cop:continuation:terminal:"+id+":"+witness.claim_id;
  const reservation_id="reservation:"+budget_id+":"+idempotency_key;
  const history=reservationEvents(store,budget_id,reservation_id);
  if(!history?.original || !history.grants.length)
    return refuse("COP_RESERVATION_EVIDENCE_MISSING");
  if(history.original.payload?.reservation?.idempotency_key!==idempotency_key)
    return refuse("COP_RESERVATION_EVIDENCE_MISMATCH");
  if(history.settlements.length) return refuse("COP_RESERVATION_ALREADY_SETTLED");
  for(let attempt=0;attempt<retryLimit;attempt++) {
    const result=ledger.release({
      reservation_id,expected_version:ledger.snapshot().version,
      idempotency_key:"release:"+reservation_id,
    });
    if(result.ok) return {ok:true,code:result.duplicate?
      "ALREADY_RELEASED":"ORPHAN_RESERVATION_RELEASED",
      reservation_id,budget_released:true};
    if(result.error!=="budget_version_conflict")
      return refuse("COP_ORPHAN_RELEASE_FAILED",{reason:result.error});
  }
  return refuse("COP_BUDGET_VERSION_CONFLICT");
}
