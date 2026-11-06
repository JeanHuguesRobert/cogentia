/** #299: separately signed bounded form assistance, independent from root v1. */
import {writeFileSync,rmSync,mkdtempSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {RESERVED_ACTIONS,canonicalProposalBytes,proposalHash} from './john-root-mandate.js';
import {sshFingerprint} from './john-sshsig-approval.js';
export const FORM_ASSIST_KIND='cogentia.john-form-assist-proposal/v1';
export const FORM_ASSIST_MANDATE='mandate:jhn:form-assist';
export const FORM_ASSIST_NAMESPACE='cogentia-john-form-assist-v1';
export const FORM_ASSIST_CAPABILITY='browser.form.fill';
export function verifyFormAssistApproval({proposal:p,approval:a,trustedSshPublicKey,expectedFingerprint,now=new Date()}={}){
 const fail=error=>({ok:false,error});
 if(!p||!a||!trustedSshPublicKey||!expectedFingerprint)return fail('form_approval_missing');
 let fp;try{fp=sshFingerprint(trustedSshPublicKey);}catch{return fail('issuer_key_invalid');}
 if(fp!==expectedFingerprint)return fail('issuer_key_mismatch');
 if(p.kind!==FORM_ASSIST_KIND||p.mandate_id!==FORM_ASSIST_MANDATE||p.version!=='v1'||p.principal_ref!=='principal:jhn'||p.logical_agent_ref!=='agent:jhn')return fail('form_mandate_identity_invalid');
 if(JSON.stringify(p.scope?.allowed_actions)!==JSON.stringify([FORM_ASSIST_CAPABILITY])||
  !Array.isArray(p.scope?.forbidden_actions)||RESERVED_ACTIONS.some(x=>!p.scope.forbidden_actions.includes(x))||
  p.max_delegation_depth!==0||JSON.stringify(p.budget_limits)!==JSON.stringify({max_steps:512}))return fail('form_scope_budget_invalid');
 const start=Date.parse(p.valid_from),end=Date.parse(p.valid_until),t=+new Date(now);
 if(!Number.isFinite(start)||!Number.isFinite(end)||start>=end||t<start||t>=end)return fail('form_mandate_expired');
 if(a.kind!=='cogentia.principal-sshsig/v1'||a.principal_ref!=='principal:jhn'||a.payload_hash!==proposalHash(p)||a.key_fingerprint!==fp||typeof a.signature!=='string'||a.signature.length>8192)return fail('form_signature_binding_invalid');
 const dir=mkdtempSync(join(tmpdir(),'form-assist-sign-'));
 try{
  const sig=join(dir,'signature'),allowed=join(dir,'allowed');
  writeFileSync(sig,a.signature,{mode:0o600});writeFileSync(allowed,'principal:jhn '+trustedSshPublicKey.trim()+'\n',{mode:0o600});
  const result=spawnSync('ssh-keygen',['-Y','verify','-f',allowed,'-I','principal:jhn','-n',FORM_ASSIST_NAMESPACE,'-s',sig],{input:canonicalProposalBytes(p),timeout:5000});
  if(result.status!==0)return fail('form_signature_invalid');
  return {ok:true,proposal_hash:proposalHash(p),issuer_fingerprint:fp};
 }finally{rmSync(dir,{recursive:true,force:true});}
}
