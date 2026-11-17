/** Phase P1: class-specific PREPARATION of a Continuation production proposal.
 *
 * Intentionally NOT a new queue, state-machine authority, provider interface,
 * packet schema, COP event or implicit continuation emitter. The original
 * producers decide when to call their existing local/Packet materializer.
 * No COP dependency. No model, file, network or system effects.
 */
import {createHash} from 'node:crypto';
import {CONTINUATION_PRODUCTION_CLASSES} from './continuation-producer-taxonomy.mjs';

const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=512;
const bounded=x=>typeof x==='string'&&x.trim().length>0&&x.length<=4500;
const plain=x=>x&&typeof x==='object'&&!Array.isArray(x)&&
  (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const strings=x=>Array.isArray(x)&&x.length>0&&x.length<=32&&x.every(text)&&
  new Set(x).size===x.length;
const fail=status=>({ok:false,status});
/** Orthogonal to why work was suspended: HOW control could resume.
 * This classifies references; it does not execute or claim them.
 * Machine return addresses/JS closures are intentionally NOT persistent
 * JSON targets: they belong to the in-process runtime and are not portable.
 */
export const RESUMPTION_TARGET_KINDS=Object.freeze([
  'task_step','process_command','handler',
]);
export function validateResumptionTarget(target){
  if(!plain(target))return false;
  if(target.kind==='task_step')return text(target.task_ref)&&
    text(target.step_ref)&&
    (target.packet_ref===undefined||text(target.packet_ref));
  if(target.kind==='process_command')return text(target.program_ref)&&
    Array.isArray(target.argv)&&target.argv.length<=64&&
    target.argv.every(v=>typeof v==='string'&&v.length<=4096)&&
    (target.cwd_ref===undefined||text(target.cwd_ref))&&
    (target.env_ref===undefined||text(target.env_ref));
  if(target.kind==='handler')return text(target.handler_ref);
  return false;
}
const digest=value=>createHash('sha256').update(stable(value)).digest('hex');
// Canonical hashing: JS object insertion order is not task identity.
function canonical(x){
  if(Array.isArray(x))return x.map(canonical);
  if(plain(x))return Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]));
  return x;
}
function stable(value){return JSON.stringify(canonical(value))}
const specs=Object.freeze({
  judgment_boundary:({question,expected_response})=>
    bounded(question)&&plain(expected_response)&&Object.keys(expected_response).length>0,
  data_dependency:({dependency_ref,input_fingerprint,expected_response})=>
    text(dependency_ref)&&text(input_fingerprint)&&plain(expected_response)&&
    Object.keys(expected_response).length>0,
  external_capability_wait:({required_capabilities,missing_input_ref,question})=>
    (strings(required_capabilities)||text(missing_input_ref))&&bounded(question),
  checkpoint_resume:({checkpoint_ref,resume_handler_ref},{resumption_target}={})=>
    text(checkpoint_ref)&&(text(resume_handler_ref)||
      resumption_target!==null&&validateResumptionTarget(resumption_target)),
  temporal_recurrence:({due_at,mission_ref})=>
    typeof due_at==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:/.test(due_at)&&
    Number.isFinite(Date.parse(due_at))&&text(mission_ref),
  composition:({parent_ref,child_refs,join_policy})=>
    text(parent_ref)&&strings(child_refs)&&['all','allSettled','race','any',
      'quorum','fallback','sequence','none'].includes(join_policy),
  external_io:({effect_intent_ref,correlation_ref,delivery_state})=>
    text(effect_intent_ref)&&text(correlation_ref)&&
    ['awaiting','uncertain'].includes(delivery_state),
});

/** All class preparers return the same shell, but validate class-specific
 * data; neither identity nor provider authority is inferred from content.
 * Result is suitable for preview/review, NOT automatically for dispatch.
 */
export function prepareContinuationProduction({producer_ref,producer_class,
  origin_ref,trigger_ref,idempotency_key,work_ref,privacy='restricted',
  resumption_context,return_contract,class_input,resumption_target=null}={}){
  if(!text(producer_ref)||!text(origin_ref)||!text(trigger_ref)||
     !text(idempotency_key)||!text(work_ref))return fail('producer_identity_required');
  if(!Object.hasOwn(CONTINUATION_PRODUCTION_CLASSES,producer_class)||
     !Object.hasOwn(specs,producer_class))return fail('unknown_production_class');
  if(!['public','restricted','private'].includes(privacy))
    return fail('invalid_privacy_classification');
  if(!plain(resumption_context)||
     !['local','inline','referential','materializable'].includes(resumption_context.mode)||
     (resumption_context.mode==='local'&&!text(resumption_context.state_ref))||
     (resumption_context.mode==='inline'&&resumption_context.state===undefined)||
     (['referential','materializable'].includes(resumption_context.mode)&&
       !text(resumption_context.state_ref)))return fail('resumption_context_incomplete');
  if(resumption_target!==null&&!validateResumptionTarget(resumption_target))
    return fail('resumption_target_invalid');
  // A local step cursor or successor program can be a genuine continuation
  // without a consumer awaiting a result. The original legacy path remains
  // strict; externally delegated work still needs an explicit result owner.
  const selfDirected=['checkpoint_resume','temporal_recurrence'].includes(producer_class);
  if(return_contract==null){
    if(resumption_target===null||!selfDirected)
      return fail('return_contract_incomplete');
  }else if(!plain(return_contract)||!text(return_contract.owner_ref)||
     !text(return_contract.result_slot_ref)||
     !['pull','event','direct'].includes(return_contract.delivery)||
     !['caller_decides','reenter_on_validated_result'].includes(
       return_contract.after_delivery))return fail('return_contract_incomplete');
  if(!plain(class_input)||!specs[producer_class](class_input,{resumption_target}))
    return fail('class_specific_fields_incomplete');
  let fingerprint;
  try{
    // Reject unportable/cyclic/infinite values rather than hiding them under
    // JSON.stringify's lossy undefined/NaN/special-object normalization.
    const source={producer_ref,producer_class,origin_ref,trigger_ref,
      idempotency_key,work_ref,privacy,resumption_context,return_contract,class_input,
      resumption_target};
    const raw=stable(source);
    if(raw.length>18000||raw.length<10||!JSON.parse(raw))return fail('proposal_size_invalid');
    const isSerializable=(v,seen=new WeakSet())=>{
      if(v===null||typeof v==='string'||typeof v==='boolean')return true;
      if(typeof v==='number')return Number.isFinite(v);
      if(typeof v!=='object'||seen.has(v))return false;
      if(!plain(v)&&!Array.isArray(v))return false;
      seen.add(v);
      const okay=(Array.isArray(v)?v:Object.values(v)).every(x=>isSerializable(x,seen));
      seen.delete(v);return okay;
    };
    if(!isSerializable(source))return fail('proposal_not_json_serializable');
    fingerprint=digest(source);
  }catch{return fail('proposal_not_json_serializable')}
  const identity_ref='continuation-proposal:sha256:'+digest({producer_ref,
    producer_class,origin_ref,idempotency_key});
  return {ok:true,status:'prepared_only',proposal:{
    profile:'cogentia.continuation-production-proposal/v0',
    identity_ref,request_fingerprint:fingerprint,
    producer_ref,producer_class,origin_ref,trigger_ref,idempotency_key,
    work_ref,privacy,resumption_context,return_contract,class_input,
    resumption_target,carrier_not_chosen:true,source_materialized:false,
    provider_dispatched:false,cop_authority_granted:false,
  },external_effects:0};
}
