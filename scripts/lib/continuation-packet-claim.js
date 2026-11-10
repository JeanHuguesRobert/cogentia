/**
 * Local filesystem implementation of the canonical COP PacketClaim vocabulary.
 * Immutable, epoch-indexed, create-if-absent claims; no lock service/database.
 *
 * This module is NOT an effect authorization. At every effect boundary a caller
 * must independently verify its mandate/budget and use a versioned effect CAS;
 * a successful claim validation alone cannot fence a racing state mutation.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  createPacketClaim, isClaimExpired, validateCurrentPacketClaim,
} from "../../../inseme/packages/cop-core/src/packet-coordination.js";

const validId = (s, field) => {
  if (typeof s !== "string" || !/^[a-zA-Z0-9_.:-]{1,160}$/.test(s) || s.includes(".."))
    throw new Error("invalid " + field);
  return s;
};
const boundedLease = (leaseMs) => {
  if (!Number.isInteger(leaseMs) || leaseMs < 100 || leaseMs > 86400000)
    throw new Error("leaseMs must be an integer between 100 and 86400000");
  return leaseMs;
};
const claimDir = (root, packetId) => path.join(root, ".cogentia", "resolvers", "claims-v1",
  validId(packetId, "packetId"));
const epochFile = (dir, epoch) => path.join(dir, String(epoch).padStart(12,"0") + ".json");

export function currentPacketClaim(root, packetId) {
  const dir = claimDir(root, packetId);
  if (!fs.existsSync(dir)) return null;
  const epochs = fs.readdirSync(dir).filter(n => /^\d{12}\.json$/.test(n)).sort();
  if (!epochs.length) return null;
  const latest = epochs.at(-1);
  const claim = JSON.parse(fs.readFileSync(path.join(dir, latest), "utf8"));
  if (claim.epoch !== Number(latest.slice(0,12)))
    throw new Error("packet claim epoch/file mismatch");
  return claim;
}

export function acquirePacketClaim(root, packetId, handlerRef, {
  leaseMs = 300000, now = new Date(),
} = {}) {
  validId(packetId, "packetId");
  validId(handlerRef, "handlerRef");
  boundedLease(leaseMs);
  const at = new Date(now);
  if (!Number.isFinite(at.getTime())) throw new Error("invalid now");
  const dir = claimDir(root, packetId);
  fs.mkdirSync(dir, { recursive: true });
  // A racing contender cannot bypass a not-yet-expired claim.
  const previous = currentPacketClaim(root, packetId);
  if (previous?.status === "settlement_prepared")
    return { claimed:false, code:"TERMINAL_SETTLEMENT_PENDING", existingClaim:previous };
  if (previous && !isClaimExpired(previous, at))
    return { claimed:false, code:"ACTIVE_CLAIM", existingClaim:previous };
  const epoch = previous ? previous.epoch + 1 : 1;
  const candidate = createPacketClaim({
    packetRef:"continuation:" + packetId, claimId:randomUUID(),
    handlerRef, epoch, acquiredAt:at.toISOString(),
    expiresAt:new Date(at.getTime() + leaseMs).toISOString(),
  });
  // Fully construct before publishing. Hard link gives cross-process CAS on
  // the epoch slot and exposes no partially written JSON to readers.
  const temporary = path.join(dir, "." + randomUUID() + ".tmp");
  fs.writeFileSync(temporary, JSON.stringify(candidate) + "\n", {flag:"wx",encoding:"utf8"});
  try {
    try {
      fs.linkSync(temporary, epochFile(dir, epoch));
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      return { claimed:false, code:"CLAIM_RACE_LOST",
        existingClaim:currentPacketClaim(root, packetId) };
    }
  } finally {
    fs.unlinkSync(temporary);
  }
  // In normal clocks no newer epoch can exist before this publication; if
  // time was simulated or another contender advanced, revalidate anyway.
  const verdict = validatePacketClaim(root, packetId, candidate, {now:at});
  if (!verdict.ok) return { claimed:false, code:verdict.code, existingClaim:currentPacketClaim(root,packetId) };
  return { claimed:true, code:previous ? "RECLAIMED" : "GRANTED", claim:candidate };
}

export function validatePacketClaim(root, packetId, witness, { now = new Date() } = {}) {
  if (!witness || typeof witness !== "object") return {ok:false,code:"CLAIM_WITNESS_REQUIRED"};
  const current = currentPacketClaim(root, packetId);
  if (!current) return {ok:false,code:"NO_ACTIVE_CLAIM"};
  if (current.status === "settlement_prepared") return {ok:false,code:"STALE_CLAIM"};
  return validateCurrentPacketClaim({active_claim:current}, {
    claimId:witness.claim_id, handlerRef:witness.handler_ref,
    epoch:witness.epoch, now,
  });
}

/**
 * Planning-time fence only. For terminal writes, check this and perform
 * an independent versioned compare-and-set at the effect boundary.
 */
export function packetClaimFence(root, packetId, witness, options = {}) {
  const result = validatePacketClaim(root, packetId, witness, options);
  return { ...result, can_prepare:result.ok, may_execute_effect:false,
    cop_authority_verified:false, effect_cas_verified:false };
}

/**
 * One atomic epoch slot is shared between reclaim and terminal settlement.
 * The prepared record carries enough data for deterministic crash recovery.
 * Not an authority check: the caller supplies independently admitted work.
 */
export function prepareTerminalEpoch(root, packetId, witness, settlement, {
  now = new Date(), checkBaseline,
} = {}) {
  const verdict = validatePacketClaim(root, packetId, witness, { now });
  if (!verdict.ok) return {ok:false,code:verdict.code};
  if (typeof checkBaseline !== "function" || checkBaseline() !== true)
    return {ok:false,code:"BASELINE_CHANGED"};
  const dir = claimDir(root, packetId);
  const record = {
    schema:"cogentia.cop-terminal-intent/v1",
    status:"settlement_prepared",
    epoch:witness.epoch + 1,
    claim_id:witness.claim_id,
    handler_ref:witness.handler_ref,
    predecessor_epoch:witness.epoch,
    packet_ref:witness.packet_ref,
    prepared_at:new Date(now).toISOString(),
    settlement,
  };
  const temporary=path.join(dir,"." + randomUUID() + ".tmp");
  fs.writeFileSync(temporary,JSON.stringify(record)+"\n",{flag:"wx",encoding:"utf8"});
  try {
    // The shared next-epoch slot is exclusive with expiry-based reclaim.
    if (!validatePacketClaim(root,packetId,witness,{now:new Date()}).ok ||
        checkBaseline() !== true)
      return {ok:false,code:"STALE_CLAIM_OR_BASELINE"};
    try {fs.linkSync(temporary,epochFile(dir,record.epoch));}
    catch(e) {
      if (e.code!=="EEXIST") throw e;
      return {ok:false,code:"TERMINAL_RACE_LOST",latest:currentPacketClaim(root,packetId)};
    }
    return {ok:true,code:"SETTLEMENT_PREPARED",record};
  }finally{fs.unlinkSync(temporary);}
}
