import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {canonicalProposalBytes,proposalHash,ROOT_MANDATE_KIND,RESERVED_ACTIONS} from './john-root-mandate.js';
export const SSHSIG_NAMESPACE='cogentia-john-root-v1';
export function sshFingerprint(publicLine){
 const [kind,blob]=String(publicLine||'').trim().split(/\s+/);
 if(kind!=='ssh-rsa'||!blob||!/^[A-Za-z0-9+/=]+$/.test(blob))throw Error('invalid_ssh_public_key');
 return 'SHA256:'+createHash('sha256').update(Buffer.from(blob,'base64')).digest('base64').replace(/=+$/,'');
}
export function verifyRootSshsig({proposal:p,approval:a,trustedPublicKey,expectedFingerprint,now=new Date()}={}){
 const fail=error=>({ok:false,error});
 if(!p||!a||!trustedPublicKey||!expectedFingerprint)return fail('signature_context_missing');
 let fingerprint;try{fingerprint=sshFingerprint(trustedPublicKey);}catch{return fail('invalid_trusted_public_key');}
 if(fingerprint!==expectedFingerprint)return fail('trusted_fingerprint_mismatch');
 if(p.kind!==ROOT_MANDATE_KIND||p.mandate_id!=='mandate:jhn:john-root'||p.version!=='v1'||p.principal_ref!=='principal:jhn'||p.logical_agent_ref!=='agent:jhn')return fail('invalid_root_identity');
 if(!Array.isArray(p.scope?.allowed_actions)||!p.scope.allowed_actions.length||p.scope.allowed_actions.some(x=>typeof x!=='string'||x.includes('*'))||!Array.isArray(p.scope.forbidden_actions)||RESERVED_ACTIONS.some(x=>!p.scope.forbidden_actions.includes(x))||p.scope.allowed_actions.some(x=>p.scope.forbidden_actions.includes(x)))return fail('invalid_scope');
 if(!Number.isSafeInteger(p.max_delegation_depth)||p.max_delegation_depth<0||!p.budget_limits||!Object.keys(p.budget_limits).length||Object.values(p.budget_limits).some(x=>!Number.isSafeInteger(x)||x<0))return fail('invalid_budget');
 const start=Date.parse(p.valid_from),end=Date.parse(p.valid_until),t=+new Date(now);
 if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end||t<start||t>=end)return fail('mandate_outside_validity');
 if(a.kind!=='cogentia.principal-sshsig/v1'||a.principal_ref!==p.principal_ref||a.payload_hash!==proposalHash(p)||a.key_fingerprint!==fingerprint)return fail('signature_binding_mismatch');
 if(typeof a.signature!=='string'||a.signature.length>8192||!a.signature.startsWith('-----BEGIN SSH SIGNATURE-----'))return fail('signature_invalid');
 const dir=mkdtempSync(join(tmpdir(),'john-sshsig-'));
 try{
  const sig=join(dir,'approval.sig'),allowed=join(dir,'allowed_signers');
  writeFileSync(sig,a.signature,{mode:0o600});writeFileSync(allowed,'principal:jhn '+trustedPublicKey.trim()+'\n',{mode:0o600});
  const result=spawnSync('ssh-keygen',['-Y','verify','-f',allowed,'-I','principal:jhn','-n',SSHSIG_NAMESPACE,'-s',sig],{input:canonicalProposalBytes(p),timeout:5000});
  return result.status===0?{ok:true,proposal_hash:proposalHash(p),issuer_fingerprint:fingerprint,signature_scheme:'sshsig'}:fail('signature_invalid');
 }finally{rmSync(dir,{recursive:true,force:true});}
}
