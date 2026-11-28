/** Transport-independent description of an admitted work order (#342/#341).
 * This is a value in the existing Packet creation, not an authority issuer,
 * a new work identity, a scheduler, or an independent source ledger.
 * Only a host-side verifier may supply the resolved context.
 */
import {hashPayload} from '../../../inseme/packages/cop-core/src/cop-event-envelope.js';

const REF=/^[A-Za-z0-9][A-Za-z0-9_.:/@-]{1,255}$/;
const ref=v=>typeof v==='string'&&REF.test(v);
const typed=(v,prefix)=>ref(v)&&v.startsWith(prefix)&&v.length>prefix.length;
const agent=v=>typed(v,'agent:')||typed(v,'logical-agent:');
const principal=v=>typed(v,'principal:');
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const validWindow=w=>object(w)&&Object.keys(w).length===2&&
 ['not_before','review_at'].every(k=>typeof w[k]==='string'&&
 Number.isFinite(Date.parse(w[k]))&&new Date(w[k]).toISOString()===w[k])&&
 Date.parse(w.review_at)>Date.parse(w.not_before);
const digest=v=>typeof v==='string'&&/^sha256:[a-f0-9]{64}$/.test(v);
const deny=error=>({ok:false,error,grants_authority:false});
// A work can bind one legacy capability or an exact set of capabilities.
export const workAuthorityAllows=(authority,capability)=>
 typeof capability==="string"&&(authority?.capability===capability ||
 Array.isArray(authority?.capabilities)&&authority.capabilities.includes(capability));
const validCapabilities=i=>(ref(i.capability)&&i.capabilities===undefined)||
 (i.capability===undefined&&Array.isArray(i.capabilities)&&i.capabilities.length>=1&&
 i.capabilities.length<=16&&i.capabilities.every(ref)&&new Set(i.capabilities).size===i.capabilities.length);
const budget=v=>object(v)&&Object.keys(v).length>0&&Object.keys(v).length<=16&&
 Object.entries(v).every(([k,n])=>/^max_[a-z0-9_]{1,64}$/.test(k)&&Number.isSafeInteger(n)&&n>=0);

/** Bind the request to independently verified commissioning and delivery.
 * Execution authority and funding must be evaluated by the calling COP host.
 * No user-provided "verified" property may be passed as context.
 */
export function buildWorkCommissioningContract({intent:i,context:c}={}){
 if(!object(i)||!object(c)||c.verified!==true)return deny('verified_work_context_required');
 if(c.temporal_window!==undefined&&!validWindow(c.temporal_window))return deny('invalid_work_temporal_window');
 if(!principal(i.principal_ref)||!agent(i.responsible_agent_ref)||
    typeof i.submission_key!=='string'||!(/^[A-Za-z0-9_.:-]{1,128}$/.test(i.submission_key))||
    !digest(i.request_hash)||!validCapabilities(i)||!typed(i.mandate_ref,'mandate:')||
    typeof i.mandate_version!=='string'||!(/^v?[1-9][0-9]*$/.test(i.mandate_version))||
    !typed(i.parent_budget_ref,'budget:')||!budget(i.allocation))
   return deny('invalid_work_intent');
 if(c.principal_ref!==i.principal_ref||c.request_hash!==i.request_hash||
    !ref(c.commissioning_ref)||
    !(agent(c.requesting_agent_ref)&&c.requesting_principal_ref==null||
      c.requesting_agent_ref==null&&c.requesting_principal_ref===i.principal_ref&&
      c.commissioned_by_principal_ref===i.principal_ref)||
    !ref(c.destination_ref)||!ref(c.recipient_ref)||
    !['public','restricted','sealed'].includes(c.result_visibility))
   return deny('work_context_mismatch');
 // A subject, Twin and provider account are separate identities. Null
 // means not supplied by the verifier, never inferred from the Principal.
 for(const k of ['subject_ref','twin_ref','provider_account_ref'])
   if(c[k]!=null&&!ref(c[k]))return deny('invalid_resolved_identity_context');
 const cp=c.commissioned_by_principal_ref??null,ca=c.commissioned_by_agent_ref??null;
 const parent=c.parent_work_ref??null;
 if(cp!==null){
   if(cp!==i.principal_ref||ca!==null||parent!==null)return deny('invalid_root_commissioner');
 }else if(!agent(ca)||ca===i.responsible_agent_ref||
    !(typed(parent,'packet:')||typed(parent,'continuation:')))
   return deny('invalid_delegated_commissioner');
 // The host is responsible for proving the parent relationship and the
 // recipient's entitlement. Naming a parent or recipient is not proof.
 const assignment={responsible_agent_ref:i.responsible_agent_ref,
   commissioned_by_principal_ref:cp,commissioned_by_agent_ref:ca,source_ref:c.commissioning_ref};
 const contract={schema:'cogentia.work-commissioning/v1',
   submission_key:i.submission_key,request_hash:i.request_hash,
   ...(c.temporal_window?{temporal_window:{...c.temporal_window}}:{}),
   principal_ref:i.principal_ref,requesting_agent_ref:c.requesting_agent_ref??null,
   ...(c.requesting_principal_ref?{requesting_principal_ref:c.requesting_principal_ref}:{}),
   subject_ref:c.subject_ref??null,twin_ref:c.twin_ref??null,
   assignment,parent_work_ref:parent,
   authority:{mandate_ref:i.mandate_ref,version:i.mandate_version,
     ...(i.capabilities?{capabilities:[...i.capabilities]}:{capability:i.capability})},
   funding:{parent_budget_ref:i.parent_budget_ref,allocation:{...i.allocation}},
   delivery:{destination_ref:c.destination_ref,recipient_ref:c.recipient_ref,
     provider_account_ref:c.provider_account_ref??null,
     visibility:c.result_visibility,mode:'retrieve_by_reference'}};
 return {ok:true,contract,contract_hash:hashPayload(contract),assignment,grants_authority:false};
}

export function compareWorkCommissioningContract(stored,current){
 if(stored?.schema!=='cogentia.work-commissioning/v1'||current?.ok!==true||
    current.contract?.schema!==stored.schema)return deny('work_contract_missing');
 if(hashPayload(stored)!==current.contract_hash||
    hashPayload(current.contract)!==current.contract_hash)return deny('work_contract_changed');
 return {ok:true,grants_authority:false};
}
