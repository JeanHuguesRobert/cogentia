/** One-time independently signed Principal mandate bootstrap in protected COP. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {canonical,signedEffectDigest} from './principal-effect-issuer.mjs';
import {isProtectedFile} from './root-principal-effect-issue.mjs';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {createMemoryCopEventStore} from '../../../inseme/packages/cop-core/src/cop-event-spool.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant} from '../../../inseme/packages/cop-core/src/execution-budget.js';
const NS='cogentia-maintenance-mandate-v1';
const RESTART_SCOPE={allowed_actions:['service.restart'],execution_mode:'super',target:'node:fracta2',service:'mcp-cogentia.service'};
const deny=error=>({ok:false,error,grants_authority:false});
export function verifySignedMaintenanceMandate({proposal:p,signature,trustedPublicKey,now=new Date()}={}){
 if(!p||typeof p!=='object'||Array.isArray(p))return deny('proposal_required');
 const fields=['actor_ref','budget_limits','kind','mandate_id','max_delegation_depth','principal_ref','reason','scope','valid_from','valid_until','version'];
 if(Object.keys(p).sort().join(',')!==fields.join(','))return deny('proposal_schema_invalid');
 const scope=p.scope||{};
 if(p.kind!=='cogentia.maintenance-mandate-proposal/v1'||
   p.principal_ref!=='principal:jhn'||p.actor_ref!=='agent:jhn'||p.mandate_id!=='mandate:jhn:maintenance'||
   p.version!=='v1'||p.max_delegation_depth!==0||
   JSON.stringify(scope)!==JSON.stringify(RESTART_SCOPE)||
   Object.keys(p.budget_limits||{}).join(',')!=='max_steps'||
   !Number.isSafeInteger(p.budget_limits.max_steps)||p.budget_limits.max_steps<1||p.budget_limits.max_steps>12||
   typeof p.reason!=='string'||p.reason.trim().length<12)return deny('maintenance_mandate_scope_invalid');
 const from=Date.parse(p.valid_from),until=Date.parse(p.valid_until),ts=+new Date(now);
 if(!Number.isFinite(from)||!Number.isFinite(until)||from>ts||ts>=until||until-from>48*3600000)
   return deny('maintenance_mandate_validity_invalid');
 if(!trustedPublicKey||typeof signature!=='string'||signature.length>8192||!signature.startsWith('-----BEGIN SSH SIGNATURE-----'))return deny('signed_principal_approval_missing');
 const tmp=mkdtempSync(join(tmpdir(),'maintenance-mandate-'));
 try{
  const allowed=join(tmp,'allowed'),sig=join(tmp,'sig');
  writeFileSync(allowed,'principal:jhn '+trustedPublicKey.trim()+'\n',{mode:0o600});
  writeFileSync(sig,signature,{mode:0o600});
  const r=spawnSync('ssh-keygen',['-Y','verify','-f',allowed,'-I','principal:jhn','-n',NS,'-s',sig],
   {input:Buffer.from(canonical(p)),timeout:5000});
  if(r.status!==0)return deny('signed_principal_approval_invalid');
 }finally{rmSync(tmp,{recursive:true,force:true});}
 return {ok:true,proposal_hash:signedEffectDigest(p),principal_ref:p.principal_ref,grants_authority:false};
}
export function recordVerifiedMaintenanceMandate({store,proposal,proof}={}){
 if(!proof?.ok||!proof.proposal_hash||proof.proposal_hash!==signedEffectDigest(proposal)||!store?.appendBatch||!store?.listTopic)return deny('independent_approval_required');
 if(store.listTopic(`mandate:${proposal.mandate_id}`).length || store.listTopic(`execution-budget:budget:${proposal.mandate_id}`).length)return deny('maintenance_mandate_already_exists');
 const staged=createMemoryCopEventStore();
 recordMandateDeclaration(staged,{mandate_id:proposal.mandate_id,version:proposal.version,
  principal_ref:proposal.principal_ref,logical_agent_ref:proposal.actor_ref,
  scope:proposal.scope,valid_from:proposal.valid_from,valid_until:proposal.valid_until,
  metadata:{issuer:'independent_sshsig',proposal_hash:proof.proposal_hash,
   signature_namespace:NS,reason:proposal.reason,non_delegable:true}});
 recordExecutionBudgetGrant(staged,{budget_id:'budget:'+proposal.mandate_id,
  mandate_ref:proposal.mandate_id,principal_ref:proposal.principal_ref,
  limits:proposal.budget_limits,reason:proposal.reason});
 const written=store.appendBatch(staged.replay(),{maxBatchSize:2});
 if(!written.ok||written.results?.some(x=>x.duplicate))return deny('canonical_maintenance_mandate_append_failed');
 return {ok:true,phase:'ROOT_MAINTENANCE_MANDATE_RECORDED',mandate_ref:proposal.mandate_id,
   version:proposal.version,events:written.results.map(x=>x.event.event_id),grants_authority:false};
}
export function enrollMaintenanceMandate({proposal,signature,now=new Date()}={}){
 if(process.geteuid?.()!==0)return deny('root_required');
 if(!isProtectedFile(fileURLToPath(import.meta.url))||
    !isProtectedFile('/etc/cogentia-super/principal-issuer.pub')||
    !isProtectedFile('/var/lib/cogentia-super/canonical-authority.sqlite',{mode:'private'}))
   return deny('root_owned_issuer_required');
 let store;
 try{
  const key=fs.readFileSync('/etc/cogentia-super/principal-issuer.pub','utf8');
  const proof=verifySignedMaintenanceMandate({proposal,signature,trustedPublicKey:key,now});
  if(!proof.ok)return proof;
  store=createSqliteCopEventStore('/var/lib/cogentia-super/canonical-authority.sqlite');
  return recordVerifiedMaintenanceMandate({store,proposal,proof});
 }catch{return deny('canonical_maintenance_issuer_failed');}
 finally{try{store?.close();}catch{}}
}
