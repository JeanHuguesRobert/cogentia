/**
 * Transport-neutral review/intent contract for CLI, MCP Apps and future A2A.
 * NEVER a mandate issuer. The record is an expression of intended decision;
 * principal identity, issuer approval, COP budget and execution are separate.
 */
import {mandateProposalHash} from './cop-proposal-digest.js';
const IDENT=/^[a-z][a-z0-9._:-]{1,159}$/;
const SHA=/^sha256:[a-f0-9]{64}$/;
const error=reason=>Object.assign(new Error('COP consent packet refused'),{code:reason});
export function copReviewPacket(proposal,{source='unspecified',source_verified=false}={}) {
  if(!proposal||typeof proposal!=='object'||Array.isArray(proposal)||
     proposal.kind!=='cop.mandate-amendment.proposal/v1'||
     !IDENT.test(proposal.mandate_ref||'')||
     proposal.principal_ref!=='principal:jhn'||
     !/^v[1-9][0-9]*$/.test(proposal.previous_version||'')||
     !/^v[1-9][0-9]*$/.test(proposal.new_version||'')||
     !IDENT.test(proposal.logical_agent_ref||'')||
     typeof proposal.reason!=='string'||!proposal.reason.trim()||
     !proposal.scope||typeof proposal.scope!=='object'||Array.isArray(proposal.scope)||
     !Array.isArray(proposal.scope.allowed_actions)||
     proposal.scope.allowed_actions.some(x=>typeof x!=='string'||x.length>128))
    throw error('CONSENT_PROPOSAL_INVALID');
  const raw=JSON.stringify(proposal);
  if(raw.length>16384)throw error('CONSENT_PROPOSAL_TOO_LARGE');
  const hash=mandateProposalHash(proposal);
  const src=String(source).slice(0,250);
  return Object.freeze({ok:true,schema:'cogentia.cop_consent_review.v1',
    proposal:structuredClone(proposal),payload_hash:hash,
    source_ref:src,source_verified:source_verified===true,
    authority:'none',grants_mandate_authority:false,executes:false});
}
export function copConsentIntent(packet,decision,{channel='unspecified'}={}) {
  if(!packet||packet.schema!=='cogentia.cop_consent_review.v1'||
     !SHA.test(packet.payload_hash||'')||
     !['approve','refuse'].includes(decision))throw error('CONSENT_DECISION_INVALID');
  const expected=copReviewPacket(packet.proposal,{source:packet.source_ref}).payload_hash;
  if(expected!==packet.payload_hash)throw error('CONSENT_PAYLOAD_MISMATCH');
  return Object.freeze({ok:true,schema:'cogentia.cop_consent_intent.v1',
    decision,payload_hash:expected,mandate_ref:packet.proposal.mandate_ref,
    expected_version:packet.proposal.previous_version,channel:String(channel).slice(0,64),
    principal_ref:'principal:jhn',authority:'none',human_authentication:'not_verified',
    issuer_verified:false,grants_mandate_authority:false,execution:false,
    next_step:'trusted_principal_step_up_and_canonical_COP_validation'});
}
