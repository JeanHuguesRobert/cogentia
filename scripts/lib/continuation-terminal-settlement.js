/**
 * Experimental terminal settlement of a canonical continuation under COP v1.
 * No MCP/CLI production entrypoint. Caller must supply a trusted and
 * independently verified authorization adapter.
 *
 * Two-phase, crash-recoverable protocol:
 * 1. Validate claim, independent admissibility, and baseline revision.
 * 2. Atomically publish next-epoch settlement intent (competes with reclaim).
 * 3. Atomically replace canonical continuation and publish a completion receipt.
 *
 * Unmediated writes to the same continuation file cannot be fenced by this
 * filesystem-only protocol. Do not expose this as an effect authorization.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { PacketClaimEvent, projectPacketCoordination, isClaimExpired } from "../../../inseme/packages/cop-core/src/packet-coordination.js";
import { LATENT_SOVEREIGN_KIND } from "./latent-sovereign.js";
import {
  currentPacketClaim, validatePacketClaim, prepareTerminalEpoch,
} from "./continuation-packet-claim.js";

const sha = (value) => createHash("sha256").update(value).digest("hex");
const safeId = (id) => {
  if (typeof id !== "string" || !/^ctn_[a-z0-9_]{8,}$/i.test(id))
    throw new Error("invalid continuation id");
  return id;
};
const continuationPath = (root,id) =>
  path.join(root,".cogentia","continuations",safeId(id)+".json");
const receiptPath = (root,id) =>
  path.join(root,".cogentia","resolvers","settlements",safeId(id)+".json");

function atomicPublish(file, data) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const temp=path.join(path.dirname(file),"."+randomUUID()+".tmp");
  fs.writeFileSync(temp,data,{flag:"wx",encoding:"utf8"});
  try { fs.renameSync(temp,file); }
  finally { if(fs.existsSync(temp)) fs.unlinkSync(temp); }
}
function completeReceipt(root, id, intent) {
  const file=receiptPath(root,id);
  if (fs.existsSync(file)) {
    const old=JSON.parse(fs.readFileSync(file,"utf8"));
    return {ok:old.result_sha256===intent.settlement.result_sha256,
      code:"RECEIPT_ALREADY_PRESENT",receipt:old};
  }
  const receipt={
    schema:"cogentia.continuation-settlement-receipt/v1",
    type:PacketClaimEvent.COMPLETED, continuation_id:id,
    claim:intent.settlement.claim,
    claim_id:intent.claim_id,handler_ref:intent.handler_ref,
    epoch:intent.predecessor_epoch,settlement_epoch:intent.epoch,
    baseline_sha256:intent.settlement.baseline_sha256,
    result_sha256:intent.settlement.result_sha256,
    result_ref:intent.settlement.result_ref,
    completed_at:new Date().toISOString(),delivery_confirmed:false,
  };
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const tmp=path.join(path.dirname(file),"."+randomUUID()+".tmp");
  fs.writeFileSync(tmp,JSON.stringify(receipt)+"\n",{flag:"wx"});
  try {
    try {fs.linkSync(tmp,file);}
    catch(e) {
      if(e.code!=="EEXIST") throw e;
      const old=JSON.parse(fs.readFileSync(file,"utf8"));
      return {ok:old.result_sha256===receipt.result_sha256,code:"RECEIPT_ALREADY_PRESENT",receipt:old};
    }
  }finally{fs.unlinkSync(tmp);}
  return {ok:true,code:"COMPLETED",receipt};
}
export function recoverClaimedResolution(root,id) {
  safeId(id);
  const intent=currentPacketClaim(root,id);
  if (!intent || intent.status!=="settlement_prepared" ||
      intent.schema!=="cogentia.cop-terminal-intent/v1")
    return {ok:false,code:"NO_PREPARED_SETTLEMENT"};
  const file=continuationPath(root,id);
  const current=fs.readFileSync(file,"utf8");
  const currentHash=sha(current);
  const desired=intent.settlement.desired_json;
  const desiredHash=sha(desired);
  if (desiredHash!==intent.settlement.result_sha256)
    return {ok:false,code:"CORRUPT_SETTLEMENT_INTENT"};
  if (currentHash!==desiredHash && currentHash!==intent.settlement.baseline_sha256)
    return {ok:false,code:"BASELINE_CHANGED_AFTER_PREPARE"};
  if (currentHash!==desiredHash) atomicPublish(file,desired);
  const receipt=completeReceipt(root,id,intent);
  return {...receipt, result_ref:intent.settlement.result_ref,
    recovered:currentHash!==desiredHash};
}

/**
 * The authority adapter is deliberately injected and must return a trusted
 * {ok:true} result. Do not wire an untrusted JSON request as that adapter.
 */
export function resolveClaimedContinuation(root,id,{
  witness,expectedSha256,decision,reason="",payload={},authorize,
  beforeCanonicalWrite,
}={}) {
  safeId(id);
  if (typeof authorize!=="function") return {ok:false,code:"AUTHORITY_ADAPTER_REQUIRED"};
  const admission=authorize({continuation_id:id,witness,decision,payload});
  if (!admission || admission.ok!==true)
    return {ok:false,code:"NOT_ADMISSIBLE"};
  if (typeof expectedSha256!=="string" || !/^[a-f0-9]{64}$/.test(expectedSha256))
    return {ok:false,code:"EXPECTED_REVISION_REQUIRED"};
  if (typeof decision!=="string" || !decision.trim())
    return {ok:false,code:"DECISION_REQUIRED"};
  const current=validatePacketClaim(root,id,witness);
  if (!current.ok) return {ok:false,code:current.code};
  const file=continuationPath(root,id);
  const baseline=fs.readFileSync(file,"utf8");
  if (sha(baseline)!==expectedSha256) return {ok:false,code:"BASELINE_CHANGED"};
  const c=JSON.parse(baseline);
  if (c.id!==id || c.status!=="active") return {ok:false,code:"CONTINUATION_NOT_ACTIVE"};
  const resultRef=c.return_contract?.result_ref;
  if (typeof resultRef!=="string" || !resultRef)
    return {ok:false,code:"RETURN_SLOT_MISSING"};
  // No latent-sovereign side effect or foreign resource materialization here.
  if (c.kind===LATENT_SOVEREIGN_KIND)
    return {ok:false,code:"SIDE_EFFECT_KIND_UNSUPPORTED"};
  const now=new Date().toISOString();
  const desired={
    ...c,status:"resolved",updated_at:now,
    resolution:{resolved_at:now,decision,reason,payload,
      return_state:{result_available:true,delivered:false,result_ref:resultRef}},
    history:[...(c.history||[]),{at:now,event:"resolved",decision,reason}],
  };
  const desiredJson=JSON.stringify(desired,null,2)+"\n";
  const intent=prepareTerminalEpoch(root,id,witness,{
    baseline_sha256:expectedSha256,result_sha256:sha(desiredJson),
    desired_json:desiredJson,result_ref:resultRef,claim:witness,
  },{checkBaseline:()=>sha(fs.readFileSync(file,"utf8"))===expectedSha256});
  if (!intent.ok) return intent;
  if (typeof beforeCanonicalWrite==="function") beforeCanonicalWrite(intent.record);
  return recoverClaimedResolution(root,id);
}
export function continuationRevision(root,id) {
  return sha(fs.readFileSync(continuationPath(root,id),"utf8"));
}

/**
 * Read-only COP projection from persisted epoch records and terminal receipt.
 * A prepared-but-not-finalized settlement is never presented as completed.
 */
export function inspectContinuationPacketCoordination(root,id) {
  safeId(id);
  const dir=path.join(root,".cogentia","resolvers","claims-v1",id);
  const files=fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f=>/^\d{12}\.json$/.test(f)).sort() : [];
  const records=files.map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),"utf8")));
  const events=[];
  let seenClaim=false;
  for (const record of records) {
    if (record.schema!=="cop.packet-claim/v1") continue;
    events.push({
      type:seenClaim ? PacketClaimEvent.RECLAIMED : PacketClaimEvent.GRANTED,
      claim:record,
    });
    seenClaim=true;
  }
  const receiptFile=receiptPath(root,id);
  const receipt=fs.existsSync(receiptFile)
    ? JSON.parse(fs.readFileSync(receiptFile,"utf8")) : null;
  if (receipt) events.push(receipt);
  const projection=projectPacketCoordination(events);
  const latest=records.at(-1) || null;
  const status=receipt ? "completed"
    : latest?.status==="settlement_prepared" ? "settlement_prepared"
    : !latest ? "unclaimed"
    : isClaimExpired(latest) ? "expired" : "claimed";
  return {
    schema:"cogentia.cop-coordination-projection/v1",
    continuation_id:id,status,projection,events,
    receipt_ref:receipt ? "continuation:"+id+"/settlement-receipt" : null,
    delivery_confirmed:false,
  };
}
