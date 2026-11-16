/**
 * Local SQLite implementation of canonical COP PacketClaim epochs.
 * COP authority is checked by the caller, NEVER inferred from a claim.
 * A short SQLite transaction fences competing epoch creation locally.
 */
import {randomUUID} from 'node:crypto';
import {
  createPacketClaim,isClaimExpired,validateCurrentPacketClaim,
} from '../../../inseme/packages/cop-core/src/packet-coordination.js';
import {
  currentClaimEpoch,appendClaimEpoch,
} from './continuation-claim-sqlite.mjs';

const validId=(s,field)=>{
  if(typeof s!=='string'||!/^[a-zA-Z0-9_.:-]{1,160}$/.test(s)||s.includes('..'))
    throw Error('invalid '+field);
  return s;
};
const boundedLease=leaseMs=>{
  if(!Number.isInteger(leaseMs)||leaseMs<100||leaseMs>86400000)
    throw Error('leaseMs must be an integer between 100 and 86400000');
  return leaseMs;
};
export function currentPacketClaim(root,packetId){
  return currentClaimEpoch(root,validId(packetId,'packetId'));
}
export function acquirePacketClaim(root,packetId,handlerRef,{
  leaseMs=300000,now=new Date(),
}={}){
  validId(packetId,'packetId');validId(handlerRef,'handlerRef');boundedLease(leaseMs);
  const at=new Date(now);
  if(!Number.isFinite(at.getTime()))throw Error('invalid now');
  return appendClaimEpoch(root,packetId,previous=>{
    if(previous?.status==='settlement_prepared')
      return {ok:false,claimed:false,code:'TERMINAL_SETTLEMENT_PENDING',existingClaim:previous};
    if(previous&&!isClaimExpired(previous,at))
      return {ok:false,claimed:false,code:'ACTIVE_CLAIM',existingClaim:previous};
    const claim=createPacketClaim({
      packetRef:'continuation:'+packetId,claimId:randomUUID(),
      handlerRef,epoch:previous?previous.epoch+1:1,
      acquiredAt:at.toISOString(),
      expiresAt:new Date(at.getTime()+leaseMs).toISOString(),
    });
    return {ok:true,claimed:true,code:previous?'RECLAIMED':'GRANTED',claim,record:claim};
  });
}
export function validatePacketClaim(root,packetId,witness,{now=new Date()}={}){
  if(!witness||typeof witness!=='object')
    return {ok:false,code:'CLAIM_WITNESS_REQUIRED'};
  const current=currentPacketClaim(root,packetId);
  if(!current)return {ok:false,code:'NO_ACTIVE_CLAIM'};
  if(current.status==='settlement_prepared')return {ok:false,code:'STALE_CLAIM'};
  return validateCurrentPacketClaim({active_claim:current},{
    claimId:witness.claim_id,handlerRef:witness.handler_ref,
    epoch:witness.epoch,now,
  });
}
export function packetClaimFence(root,packetId,witness,options={}){
  const result=validatePacketClaim(root,packetId,witness,options);
  return {...result,can_prepare:result.ok,may_execute_effect:false,
    cop_authority_verified:false,effect_cas_verified:false};
}
export function prepareTerminalEpoch(root,packetId,witness,settlement,{
  now=new Date(),checkBaseline,
}={}){
  validId(packetId,'packetId');
  if(!witness||typeof witness!=='object')return {ok:false,code:'CLAIM_WITNESS_REQUIRED'};
  if(typeof checkBaseline!=='function')return {ok:false,code:'BASELINE_CHANGED'};
  const at=new Date(now);
  if(!Number.isFinite(at.getTime()))throw Error('invalid now');
  return appendClaimEpoch(root,packetId,previous=>{
    if(!previous)return {ok:false,code:'NO_ACTIVE_CLAIM'};
    if(previous.status==='settlement_prepared')return {ok:false,code:'STALE_CLAIM'};
    const verdict=validateCurrentPacketClaim({active_claim:previous},{
      claimId:witness.claim_id,handlerRef:witness.handler_ref,
      epoch:witness.epoch,now:at,
    });
    if(!verdict.ok)return {ok:false,code:verdict.code};
    if(checkBaseline()!==true)return {ok:false,code:'BASELINE_CHANGED'};
    const record={
      schema:'cogentia.cop-terminal-intent/v1',
      status:'settlement_prepared',
      epoch:witness.epoch+1,
      claim_id:witness.claim_id,
      handler_ref:witness.handler_ref,
      predecessor_epoch:witness.epoch,
      packet_ref:witness.packet_ref,
      prepared_at:at.toISOString(),settlement,
    };
    return {ok:true,code:'SETTLEMENT_PREPARED',record};
  });
}
