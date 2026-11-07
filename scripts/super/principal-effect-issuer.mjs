/**
 * Root-side issuance predicate for independently signed COP effects.
 * This is NOT an MCP tool, nor an executable issuer until a root-owned install
 * connects it to the protected COP store and account/budget reservation.
 * Approval is verified against a trusted, independently pinned SSH key.
 */
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const PREFIX='cogentia-super-effect-v1';
const sha=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
export const canonical = value => value===null?'null':typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?'['+value.map(canonical).join(',')+']':'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
export const signedEffectDigest = proposal => sha(canonical(proposal));
const deny=reason=>({ok:false,error:reason,grants_authority:false});
export function verifySignedEffectApproval({proposal,signature,trustedPublicKey,now=new Date(),verifySignature}={}){
 if(!proposal||typeof proposal!=='object'||Array.isArray(proposal))return deny('proposal_required');
 const keys=['actor_ref','budget_reservation_id','effect','expires_at','issuer_evidence','kind','mandate_ref','mandate_version','principal_ref','recovery_ref','risk_control','single_use'];
 if(Object.keys(proposal).sort().join(',')!==keys.join(','))return deny('proposal_schema_invalid');
 if(proposal.kind!=='cogentia.super-effect-proposal/v1'||proposal.principal_ref!=='principal:jhn'||
    proposal.actor_ref!=='agent:jhn'||!/^mandate:[\w:.-]+$/.test(proposal.mandate_ref||'')||
    !/^v\d+$/.test(proposal.mandate_version||'')||proposal.single_use!==true||
    typeof proposal.budget_reservation_id!=='string'||!proposal.budget_reservation_id||
    typeof proposal.recovery_ref!=='string'||!proposal.recovery_ref||
    !['B','C'].includes(proposal.risk_control)||typeof proposal.issuer_evidence!=='string'||!proposal.issuer_evidence)
    return deny('authority_scope_invalid');
 const e=proposal.effect;
 const effectKeys=['action_class','command','execution_mode','payload_hash','provider','target','timeout_ms'];
 if(!e||Object.keys(e).sort().join(',')!==effectKeys.join(',')||e.action_class!=='host.process.run'||
    e.execution_mode!=='super'||e.provider!=='unix-process'||e.target!=='node:fracta2'||
    typeof e.command!=='string'||!e.command.trim()||e.command.length>32768||
    !Number.isInteger(e.timeout_ms)||e.timeout_ms<1||e.timeout_ms>120000)return deny('effect_scope_invalid');
 const effectPayload={capability:'host.process.run',target:e.target,command:e.command,args:[],timeout_ms:e.timeout_ms,execution_mode:'super',provider:e.provider};
 if(e.payload_hash!==sha(canonical(effectPayload)))return deny('effect_hash_invalid');
 const expiry=Date.parse(proposal.expires_at),ts=+new Date(now);
 if(!Number.isFinite(expiry)||expiry<=ts||expiry-ts>10*60*1000)return deny('expiration_invalid');
 if(!trustedPublicKey||typeof signature!=='string'||signature.length>8192||!signature.startsWith('-----BEGIN SSH SIGNATURE-----'))return deny('approval_missing');
 // The trusted key path and fingerprints are pinned outside agent-writable storage.
 // A caller-provided key is suitable only in the offline verification tests.
 const hash=signedEffectDigest(proposal);
 let verified=false;
 if(verifySignature){verified=verifySignature({bytes:Buffer.from(canonical(proposal)),signature,trustedPublicKey,namespace:PREFIX})===true;}
 else{
  const dir=mkdtempSync(join(tmpdir(),'cop-root-issuer-'));
  try{
   const sig=join(dir,'approval.sig'),allowed=join(dir,'allowed');
   writeFileSync(sig,signature,{mode:0o600});writeFileSync(allowed,'principal:jhn '+trustedPublicKey.trim()+'\n',{mode:0o600});
   const r=spawnSync('ssh-keygen',['-Y','verify','-f',allowed,'-I','principal:jhn','-n',PREFIX,'-s',sig],{input:Buffer.from(canonical(proposal)),timeout:5000});
   verified=r.status===0;
  }finally{rmSync(dir,{recursive:true,force:true});}
 }
 if(!verified)return deny('principal_signature_invalid');
 return {ok:true,proposal_hash:hash,effect_hash:e.payload_hash,principal_ref:proposal.principal_ref,
   mandate_ref:proposal.mandate_ref,mandate_version:proposal.mandate_version,
   budget_reservation_id:proposal.budget_reservation_id,grants_authority:false,
   next:'independent_cop_mandate_budget_reservation_and_root_only_grant_issuance'};
}
