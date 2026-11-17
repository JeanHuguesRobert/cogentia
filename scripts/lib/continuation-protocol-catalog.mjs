/** Optional, versioned catalogue of commonly understood Continuation forms.
 *
 * This is a vocabulary and a pure validation/discovery helper, NOT a new
 * mandatory registry, a COP admission gate, a dispatch table or a queue.
 * An unknown or self-describing Continuation remains representable. A known
 * protocol is not proof of an installed executor or authority to cause effects.
 */
import {validateResumptionTarget} from './continuation-production-recipes.mjs';

const nonempty=x=>typeof x==='string'&&x.trim().length>0&&x.length<=4096;
const ref=x=>nonempty(x)&&x.length<=512;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const refs=x=>Array.isArray(x)&&x.length>0&&x.length<=128&&x.every(ref);
const protoId=x=>typeof x==='string'&&/^[a-z][a-z0-9.-]{2,100}\/v[1-9][0-9]*$/.test(x);
const frozen=(x,seen=new WeakSet())=>{
  if(Array.isArray(x)||object(x)){
    if(seen.has(x))throw new TypeError('cyclic protocol metadata');
    seen.add(x);
    for(const v of Object.values(x))frozen(v,seen);
    seen.delete(x);
    return Object.freeze(x);
  }
  if(typeof x==='number'&&!Number.isFinite(x))
    throw new TypeError('nonportable protocol metadata');
  if(typeof x==='function'||typeof x==='symbol'||typeof x==='bigint'||
    x===undefined)throw new TypeError('non-JSON protocol metadata');
  return x;
};

/** Existing implementations are explicitly identified, not generalized. */
export const KNOWN_CONTINUATION_PROTOCOLS=frozen([
  {
    protocol_id:'cop.packet-task-step-cursor/v1',
    title:'Packet-local next COPStep',
    semantics:'Resume from a versioned next-Step cursor; changes the packet history, not a native instruction pointer.',
    payload_example:{kind:'task_step',packet_ref:'packet:example',task_ref:'task:example',
      step_ref:'step:compute',expected_version:1},
    implementation_stage:'cursor_implemented_no_step_executor',
    source:'../inseme/packages/cop-core/src/packet-task-step-cursor.js',
    entrypoint:'advancePacketTaskStep',
    completion:'Atomic cursor advance after independently verified Step completion.',
    effect_boundary:'Step execution is separate and may require a COP claim, mandate and effect receipt.',
    validator:'task_step',
  },
  {
    protocol_id:'cogentia.process-command/v1',
    title:'Next program or script with arguments',
    semantics:'Invoke a new program with argv and context; does not restore a prior Bash process stack.',
    payload_example:{kind:'process_command',program_ref:'program:script',argv:['--resume','checkpoint:one'],cwd_ref:'repo:one'},
    implementation_stage:'descriptor_only_no_process_executor',
    source:'scripts/lib/continuation-production-recipes.mjs',
    entrypoint:'validateResumptionTarget',
    completion:'A separately admitted executor must produce a verifiable process result.',
    effect_boundary:'Validation neither launches nor authorizes process execution.',
    validator:'process_command',
  },
  {
    protocol_id:'cogentia.handler-resume/v1',
    title:'Resume through a named handler',
    semantics:'Name a handler and reconstructible context, rather than a VM-local closure.',
    payload_example:{kind:'handler',handler_ref:'handler:continue',context_ref:'checkpoint:one'},
    implementation_stage:'descriptor_only_execution_requires_handler_resolution',
    source:'scripts/lib/continuation-production-recipes.mjs',
    entrypoint:'validateResumptionTarget',
    completion:'Handler-specific result or continuation; no completion implied by reference.',
    effect_boundary:'A recognized handler name is not a COP permission or proof of locality.',
    validator:'handler',
  },
  {
    protocol_id:'cogentia.typed-judgment/v1',
    title:'Typed judgment request (including a prompt)',
    semantics:'Request an interpretation or decision under a constrained response contract; provider-neutral in principle.',
    payload_example:{question:'Is this a useful public index?',
      expected_response:{required:['decision','reason']},return_ref:'continuation:parent/resolution'},
    implementation_stage:'specialized_public_document_cps_adapter',
    source:'scripts/lib/legacy-public-judgment-cps.js',
    entrypoint:'preparePublicLegacyJudgmentCps',
    completion:'Validate result and provenance, then reconcile it to the originating continuation.',
    effect_boundary:'Sending a prompt to an external LLM is a separately admitted, budgeted effect.',
    validator:'typed_judgment',
  },
  {
    protocol_id:'cogentia.open-objective/v1',
    title:'Open cognitive objective',
    semantics:'Describe a result to seek without prescribing steps or a particular next handler.',
    payload_example:{objective:'Determine the next useful investigation',context_ref:'packet:research'},
    implementation_stage:'descriptive_only_no_generic_interpreter',
    source:'research/cognitive_packets.md',
    entrypoint:null,
    completion:'An actor may refine the objective, propose a plan or return evidence; no automatic success assumption.',
    effect_boundary:'Formulating an objective does not authorize research, disclosure or external effects.',
    validator:'open_objective',
  },
  {
    protocol_id:'cop.packet-parent-continuation/v1',
    title:'Fork and reconcile dependent child packets',
    semantics:'Compose children through typed parent/child links and a join policy.',
    payload_example:{parent_ref:'packet:parent',child_refs:['packet:child'],join_policy:'all'},
    implementation_stage:'packet_parent_join_implemented',
    source:'../inseme/packages/cop-core/src/packet-parent-continuations.js',
    entrypoint:'registerParentJoin',
    completion:'A returned child result must be correlated, then reconciled under the parent join policy.',
    effect_boundary:'Linking or joining does not authorize independently effectful child execution.',
    validator:'packet_join',
  },
  {
    protocol_id:'cop.continuation-result/v1',
    title:'Correlate a returned continuation result',
    semantics:'Recognize a correlated result as an observed fact; returning is not automatically resolving.',
    payload_example:{continuation_id:'ctn_example_123',result_status:'answered',result_ref:'event:result'},
    implementation_stage:'result_observer_implemented',
    source:'../inseme/packages/cop-core/src/continuation-result.js',
    entrypoint:'observeContinuationResult',
    completion:'Validation and parent notification are separate from any later resume, resolution or assimilation.',
    effect_boundary:'Receipt recognition grants no new COP mandate.',
    validator:'returned_result',
  },
  {
    protocol_id:'cogentia.await-dependency/v1',
    title:'Wait for data, capacity or a future condition',
    semantics:'Suspend work until the referenced dependency is evidenced, without presuming a fixed timing.',
    payload_example:{dependency_ref:'resource:unavailable',
      resume_when:'dependency_available',context_ref:'checkpoint:one'},
    implementation_stage:'documented_pattern_no_generic_wake_executor',
    source:'scripts/lib/continuation-producer-taxonomy.mjs',
    entrypoint:'CONTINUATION_PRODUCTION_CLASSES',
    completion:'Revalidate the dependency, then enter the original calculation, not merely deposit a value.',
    effect_boundary:'Dependency availability is distinct from permission to use it.',
    validator:'dependency',
  },
].map(x=>frozen({...x,payload_example:frozen(x.payload_example)})));

const validators={
  task_step:x=>validateResumptionTarget(x)&&
    Number.isSafeInteger(x.expected_version)&&x.expected_version>=0&&ref(x.packet_ref),
  process_command:x=>validateResumptionTarget(x),
  handler:x=>validateResumptionTarget(x)&&ref(x.context_ref),
  typed_judgment:x=>nonempty(x.question)&&object(x.expected_response)&&
    Object.keys(x.expected_response).length>0&&ref(x.return_ref),
  open_objective:x=>nonempty(x.objective)&&ref(x.context_ref),
  packet_join:x=>ref(x.parent_ref)&&refs(x.child_refs)&&
    ['all','allSettled','any','race','quorum','sequence','fallback','then','catch','finally'].includes(x.join_policy),
  returned_result:x=>ref(x.continuation_id)&&ref(x.result_ref)&&
    ['answered','declined','failed','needs_input'].includes(x.result_status),
  dependency:x=>ref(x.dependency_ref)&&nonempty(x.resume_when)&&ref(x.context_ref),
};

/** Local catalogue composition, not process-global mutable registration.
 * Descriptive extensions need no code installation. No extension is treated
 * as an executable protocol merely because it appears here. */
export function createContinuationProtocolCatalog({extensions=[]}={}){
  if(!Array.isArray(extensions))throw new TypeError('extensions must be an array');
  const records=new Map(KNOWN_CONTINUATION_PROTOCOLS.map(p=>[p.protocol_id,p]));
  for(const ext of extensions){
    if(!object(ext)||!protoId(ext.protocol_id)||!nonempty(ext.title)||
       !nonempty(ext.semantics)||!object(ext.payload_example)||
       !nonempty(ext.completion)||records.has(ext.protocol_id))
      throw new TypeError('invalid or duplicate continuation protocol extension');
    // Extensions are documentation only. No dynamic dispatch/callback or
    // arbitrary validator is run on untrusted protocol descriptions.
    records.set(ext.protocol_id,frozen({protocol_id:ext.protocol_id,
      title:ext.title,semantics:ext.semantics,
      payload_example:frozen({...ext.payload_example}),
      completion:ext.completion,implementation_stage:'self_described_not_installed',
      source:typeof ext.source==='string'?ext.source:null,
      entrypoint:null,effect_boundary:'No execution authority inferred',validator:null}));
  }
  return Object.freeze({
    list:()=>[...records.values()],
    get:id=>records.get(id)||null,
    inspect:({protocol_id,payload}={})=>{
      const item=records.get(protocol_id);
      if(!item)return {ok:true,status:'unrecognized_protocol',known:false,
        interpretation_required:true,execution_authorized:false};
      const valid=item.validator&&object(payload)?Boolean(validators[item.validator](payload)):null;
      return {ok:true,status:valid===true?'recognized_valid_description':
        valid===false?'known_protocol_payload_invalid':'description_requires_interpreter',
        known:true,protocol_id,implementation_stage:item.implementation_stage,
        payload_valid:valid,execution_authorized:false};
    },
  });
}
