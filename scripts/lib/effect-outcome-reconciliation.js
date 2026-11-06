/** Evidence-first reconciliation when an effectful call yields an ambiguous error.
 * This pure classifier NEVER replays an effect or grants authority.
 * Target and exact payload must be known before comparing remote receipts.
 */
import {createHash} from 'node:crypto';
export const payloadFingerprint = text=>'sha256:'+createHash('sha256').update(String(text)).digest('hex');
export function reconcileAmbiguousEffect({target,payload,observed,read_ok=true,observation_complete=true}={}) {
 const pending=(reason,evidence=[])=>({status:'OUTCOME_UNKNOWN',retry_allowed:false,reason,evidence});
 if(!target||typeof payload!=='string'||!payload.length)return pending('missing_exact_intent');
 if(!read_ok)return pending('remote_verification_unavailable');
 if(!observation_complete)return pending('remote_observation_incomplete');
 if(!Array.isArray(observed))return pending('remote_receipts_missing');
 const hash=payloadFingerprint(payload);
 const matches=observed.filter(item=>item&&item.target===target&&typeof item.body==='string'&&payloadFingerprint(item.body)===hash);
 const evidence=matches.map(item=>({id:item.id||null,url:item.url||null}));
 if(matches.length===1)return {status:'EFFECT_VERIFIED',retry_allowed:false,reason:'exact_remote_effect_found',evidence};
 if(matches.length>1)return pending('multiple_identical_remote_effects',evidence);
 // No exact match does not prove a failed write: eventual consistency, partial
 // effects, provider filtering and delayed delivery are all possible.
 return pending('exact_remote_effect_not_observed');
}
