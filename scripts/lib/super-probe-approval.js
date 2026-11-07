/** One-shot Principal SSHSIG proposal, NOT a grant or executable authority. */
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {canonicalProposalBytes,proposalHash} from './john-root-mandate.js';
import {sshFingerprint} from './john-sshsig-approval.js';
export const SUPER_PROBE_KIND='cogentia.super-one-shot-proposal/v1';
export const SUPER_PROBE_MANDATE='mandate:jhn:super-read-probe-v1';
export const SUPER_PROBE_NAMESPACE='cogentia-super-probe-v1';
export const SUPER_PROBE_EFFECT_HASH='sha256:eab4081a5a62a1c34fcb8a3abc67e283c58ed7df5f632665bf7307374b4af11a';
export function verifySuperProbeApproval({proposal:p,signature,trustedPublicKey,expectedFingerprint,now=new Date()}={}){
 const deny=error=>({ok:false,error});
 if(!p||!signature||!trustedPublicKey||!expectedFingerprint)return deny('approval_missing');
 try{if(sshFingerprint(trustedPublicKey)!==expectedFingerprint)return deny('principal_key_mismatch');}catch{return deny('principal_key_invalid');}
 if(Object.keys(p).sort().join(',')!=='actor_ref,budget_limits,effect,kind,mandate_ref,max_delegation_depth,principal_ref,single_use,valid_from,valid_until,version'||
    Object.keys(p.effect||{}).sort().join(',')!=='action_class,command,execution_mode,payload_hash,provider,target,timeout_ms')return deny('probe_schema_invalid');
 if(p.kind!==SUPER_PROBE_KIND||p.mandate_ref!==SUPER_PROBE_MANDATE||p.principal_ref!=='principal:jhn'||
    p.actor_ref!=='agent:jhn'||p.version!=='v1'||p.single_use!==true||p.max_delegation_depth!==0||
    p.effect?.payload_hash!==SUPER_PROBE_EFFECT_HASH||p.effect?.action_class!=='host.process.run'||
    p.effect?.target!=='node:fracta2'||p.effect?.provider!=='unix-process'||
    p.effect?.execution_mode!=='super'||p.effect?.command!=='id -u; sudo -n id -u'||
    p.effect?.timeout_ms!==10000||p.budget_limits?.max_steps!==1||
    Object.keys(p.budget_limits||{}).length!==1)return deny('probe_scope_invalid');
 const start=Date.parse(p.valid_from),end=Date.parse(p.valid_until),time=+new Date(now);
 if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end||time<start||time>=end||end-start>8*24*60*60*1000)return deny('probe_expired');
 if(typeof signature!=='string'||signature.length>8192||!signature.startsWith('-----BEGIN SSH SIGNATURE-----'))return deny('signature_invalid');
 const tmp=mkdtempSync(join(tmpdir(),'super-probe-sshsig-'));
 try{
  const sig=join(tmp,'signature'),allowed=join(tmp,'allowed');
  writeFileSync(sig,signature,{mode:0o600});writeFileSync(allowed,'principal:jhn '+trustedPublicKey.trim()+'\n',{mode:0o600});
  const r=spawnSync('ssh-keygen',['-Y','verify','-f',allowed,'-I','principal:jhn','-n',SUPER_PROBE_NAMESPACE,'-s',sig],{input:canonicalProposalBytes(p),timeout:5000});
  return r.status===0?{ok:true,proposal_hash:proposalHash(p),issuer_fingerprint:expectedFingerprint}:deny('signature_invalid');
 }finally{rmSync(tmp,{recursive:true,force:true});}
}
