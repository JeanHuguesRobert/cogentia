#!/usr/bin/env node
/**
 * Root-only, offline issuer for a signed, pre-funded COP super effect.
 * NEVER callable as an ordinary MCP tool. Runs only from a root-owned
 * deployment; no issuer authority from command-line flags, chat or bearer.
 *
 * A successful COP claim is not itself a broker grant. If the grant file write
 * fails after claim, the reservation is stranded and needs manual reconciling;
 * this intentionally fails closed rather than reissuing an uncertain act.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {claimSignedSuperEffect} from '../lib/principal-super-effect-claim.js';

const DEFAULT_ROOT='/var/lib/cogentia-super';
const DEFAULT_COP=DEFAULT_ROOT+'/canonical-authority.sqlite';
const DEFAULT_GRANTS=DEFAULT_ROOT+'/authorizations.json';
const DEFAULT_KEY='/etc/cogentia-super/principal-issuer.pub';
const refuse=error=>({ok:false,error,authorization_id:null});

export function isProtectedFile(filename,{mode='read',uid=0}={}){
 try {
  if(!path.isAbsolute(filename))return false;
  const parts=path.resolve(filename).split(path.sep).filter(Boolean);
  let current='/';
  for(let i=0;i<parts.length;i++){
   current=path.join(current,parts[i]);
   const s=fs.lstatSync(current);
   if(s.isSymbolicLink()||s.uid!==uid)return false;
   if(i===parts.length-1){
    if(!s.isFile()||(s.mode&0o022)!==0)return false;
    if(mode==='private'&&(s.mode&0o077)!==0)return false;
   }else if(!s.isDirectory()||(s.mode&0o022)!==0)return false;
  }
  return true;
 }catch{return false;}
}
export function isProtectedDirectory(dirname,{uid=0}={}){
 try{
  const parts=path.resolve(dirname).split(path.sep).filter(Boolean);
  let current='/';
  for(const part of parts){current=path.join(current,part);const s=fs.lstatSync(current);
   if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==uid||(s.mode&0o022)!==0)return false;
  }
  return true;
 }catch{return false;}
}

export function composeRootEffectGrant({proposal,claim,now=new Date()}={}){
 if(!claim?.ok||claim.phase!=='COP_CLAIMED_NOT_ISSUED'||!claim.proposal_hash||
    claim.mandate_ref!==proposal?.mandate_ref||claim.mandate_version!==proposal?.mandate_version||
    claim.budget_reservation_id!==proposal?.budget_reservation_id||claim.effect_hash!==proposal.effect?.payload_hash)
    return refuse('canonical_cop_claim_required');
 const expiry=Date.parse(proposal.expires_at),ts=+new Date(now);
 if(!Number.isFinite(expiry)||expiry<=ts||expiry-ts>600000)return refuse('grant_expiration_invalid');
 return {ok:true,grant:{
  kind:'cogentia.side_effect_authorization/v1',authorization_id:'sea_'+randomUUID(),
  principal:proposal.principal_ref,actor:proposal.actor_ref,
  mandate_ref:proposal.mandate_ref,mandate_version:proposal.mandate_version,
  budget_reservation_id:proposal.budget_reservation_id,
  authority_origin:'principal',status:'granted',action_class:'host.process.run',
  target:{node:proposal.effect.target,path:null},payload_hash:claim.effect_hash,
  single_use:true,consumed_at:null,granted_at:new Date(ts).toISOString(),
  expires_at:new Date(expiry).toISOString(),
  provenance:{cop_claim_event_id:claim.event_id,signed_proposal_hash:claim.proposal_hash},
 }};
}

function writeRootGrant({file,grant}){
 const original=fs.readFileSync(file);
 const state=JSON.parse(original.toString('utf8'));
 if(!state||typeof state.grants!=='object'||Array.isArray(state.grants))throw Error('grant_store_invalid');
 if(Object.values(state.grants).some(g=>g.budget_reservation_id===grant.budget_reservation_id ||
  g.provenance?.signed_proposal_hash===grant.provenance.signed_proposal_hash))throw Error('grant_already_issued');
 state.grants[grant.authorization_id]=grant;
 // Only a root-owned directory and process may use the common broker file.
 const tmp=path.join(path.dirname(file),'.principal-issue-'+randomUUID());
 try {
  const fd=fs.openSync(tmp,'wx',0o600);
  try{fs.writeFileSync(fd,JSON.stringify(state,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  // The issuer is called synchronously by the SAME root-owned broker process
  // that consumes grants. Do not add any second grant writer (including CLI).
  // This check detects, but cannot repair, an illicit external concurrent writer.
  if(!fs.readFileSync(file).equals(original))throw Error('grant_store_changed_concurrently');
  fs.renameSync(tmp,file);
  const d=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(d);}finally{fs.closeSync(d);}
 }finally{try{fs.unlinkSync(tmp);}catch(e){if(e.code!=='ENOENT')throw e;}}
}

export function issueRootApprovedEffect({proposal,signature,now=new Date(),
 copPath=DEFAULT_COP,grantsPath=DEFAULT_GRANTS,keyPath=DEFAULT_KEY}={}){
 if(process.geteuid?.()!==0)return refuse('root_required');
 // Code installed under root: test the actual module file, not a CLI-provided
 // path, and ensure the complete path is inaccessible to ubuntu writers.
 if(!isProtectedFile(fileURLToPath(import.meta.url)))return refuse('root_owned_issuer_code_required');
 if(!isProtectedFile(keyPath)||!isProtectedFile(copPath,{mode:'private'})||
    !isProtectedFile(grantsPath,{mode:'private'}))return refuse('root_owned_authority_store_required');
 let store;
 try {
  const key=fs.readFileSync(keyPath,'utf8');
  // Both the trusted key and issuer code are supplied by root-owned files.
  store=createSqliteCopEventStore(copPath);
  const claim=claimSignedSuperEffect({store,proposal,signature,trustedPublicKey:key,now,issuerVerified:true});
  if(!claim.ok)return refuse(claim.error);
  const built=composeRootEffectGrant({proposal,claim,now});
  if(!built.ok)return built;
  writeRootGrant({file:grantsPath,grant:built.grant});
  return {ok:true,phase:'ROOT_GRANT_ISSUED_NOT_EXECUTED',authorization_id:built.grant.authorization_id,
   mandate_ref:proposal.mandate_ref,claim_event_id:claim.event_id,
   payload_hash:built.grant.payload_hash,expires_at:built.grant.expires_at};
 }catch(e){return refuse('issuer_failed_after_possible_claim_'+(e?.code||e?.message||'unknown').replace(/[^a-zA-Z0-9_]/g,'_').slice(0,65));}
 finally{try{store?.close();}catch{}}
}

// Deliberately no standalone issuing CLI: only the single root broker mutates
// its grant store. A separate process would violate its reservation lock.
