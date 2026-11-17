/** Pure, descriptive classification of Continuation PRODUCERS and emitted work.
 * No migration, queue, implicit handler/admission or authority. Work kind,
 * producer, carrier and COP governance are separate dimensions. */

export const CONTINUATION_PRODUCTION_CLASSES=Object.freeze({
  judgment_boundary:Object.freeze({
    trigger:'semantic_or_normative_judgment_required',
    producer_mechanism:'typed_judgment_request_and_return_contract',
    completion:'typed_decision_returned_to_originator',
  }),
  data_dependency:Object.freeze({
    trigger:'input_result_not_yet_available',
    producer_mechanism:'typed_data_request_with_dependency_fingerprint',
    completion:'data_result_validated_and_original_calculation_reentered',
  }),
  external_capability_wait:Object.freeze({
    trigger:'required_capability_or_human_input_unavailable',
    producer_mechanism:'bounded_capability_or_clarification_request',
    completion:'evidence_of_required_input_or_explicit_refusal',
  }),
  checkpoint_resume:Object.freeze({
    trigger:'cooperative_yield_or_preemption',
    producer_mechanism:'checkpoint_plus_resumption_descriptor',
    completion:'replay_or_resume_from_verified_checkpoint',
  }),
  temporal_recurrence:Object.freeze({
    trigger:'due_time_or_recurrence',
    producer_mechanism:'scheduled_task_instance_or_next_due_checkpoint',
    completion:'run_receipt_plus_separately_scheduled_successor',
  }),
  composition:Object.freeze({
    trigger:'parent_child_fork_join_or_next_step',
    producer_mechanism:'parent_link_plus_child_return_contract',
    completion:'typed_child_result_reconciled_with_parent_policy',
  }),
  external_io:Object.freeze({
    trigger:'awaited_external_response_or_transport',
    producer_mechanism:'effect_intent_plus_correlated_reply_slot',
    completion:'verified_return_or_explicit_uncertain_effect',
  }),
});

/** Source-backed inventory: entries are production MECHANISMS, not distinct
 * capabilities, Packet kinds or permission scopes. Multiple call sites can
 * use the same implementation. */
export const CONTINUATION_PRODUCERS=Object.freeze([
  {id:'cogentia.local.emit',producer_class:'judgment_boundary',
    location:'scripts/cogentia.js',entry:'emitContinuation',
    carrier:'cogentia.continuation.v2',persistence:'primitive-sqlite',
    note:'CLI, daemon, MCP and ACP are ingress surfaces for the same emitter'},
  {id:'cogentia.acp-adapter',producer_class:'judgment_boundary',
    location:'scripts/continuation-acp-server.js',entry:'session/prompt',
    carrier:'cogentia.continuation.v2',persistence:'primitive-sqlite',
    note:'ACP owns transport of eventual result to original session, not a new continuation producer'},
  {id:'cogentia.frontmatter-migration',producer_class:'judgment_boundary',
    location:'scripts/migrate-frontmatter.js',entry:'emitContinuation',
    carrier:'cogentia.continuation.v1',persistence:'primitive-sqlite',
    note:'independent legacy emitter, lacks the generic v2 return contract'},
  {id:'cogentia.semantic-query',producer_class:'data_dependency',
    location:'scripts/cogentia.js',entry:'semantic-search',
    carrier:'cogentia.continuation.v2',persistence:'primitive-sqlite',
    note:'embedding result does not by itself resume the search'},
  {id:'cogentia.embedding-index',producer_class:'data_dependency',
    location:'scripts/cogentia.js',entry:'embeddings-index',
    carrier:'cogentia.continuation.v2',persistence:'primitive-sqlite'},
  {id:'cogentia.missing-capability',producer_class:'external_capability_wait',
    location:'scripts/cogentia.js',entry:'emitCapabilityContinuation',
    carrier:'cogentia.continuation.v2',persistence:'primitive-sqlite'},
  {id:'cogentia.clarification',producer_class:'external_capability_wait',
    location:'scripts/cogentia.js',entry:'emitClarificationContinuation',
    carrier:'cogentia.continuation.v2',persistence:'primitive-sqlite'},
  {id:'cogentia.sleep-cycle',producer_class:'checkpoint_resume',
    location:'scripts/lib/corpus-sleep-cycle/sleep-cycle-engine.js',
    entry:'emitSleepCycleContinuation',carrier:'cogentia.continuation.v1',
    persistence:'primitive-sqlite'},
  {id:'cogentia.primitive',producer_class:'checkpoint_resume',
    location:'scripts/lib/primitive-continuations.mjs',
    entry:'createPrimitiveContinuationStore',carrier:'primitive-continuation-snapshot/v1',
    persistence:'primitive-sqlite',note:'substrate, not a mandated COP handler'},
  {id:'cogentia.exploration-frontier',producer_class:'composition',
    location:'scripts/lib/continuation-frontier-f2a.js',
    entry:'projectFrontier',carrier:'cogentia.f2a_fact/v1',
    persistence:'cop-event-or-pure-fact',
    note:'frontier projection is not an automatic producer/dispatcher'},
  {id:'cogentia.weekly-consolidation',producer_class:'temporal_recurrence',
    location:'scripts/lib/consolidation.js',entry:'runWeeklyConsolidation',
    carrier:'cogentia.local-mission',persistence:'primitive-sqlite',
    note:'scheduled successor is a mission record, not automatically an executable continuation'},
  {id:'cogentia.conversation-bridge',producer_class:'external_io',
    location:'scripts/lib/openai-conversation-bridge.mjs',
    entry:'createOpenAiConversationBridge',carrier:'primitive-continuation-snapshot/v1',
    persistence:'primitive-sqlite',note:'no implicit COP governance'},
  {id:'inseme.cogitor-fork-join',producer_class:'composition',
    location:'../inseme/packages/cop-kernel/src/cogitorCooperation.js',
    entry:'createForkedCogitorContinuation',
    carrier:'cop/continuation descriptor',persistence:'in-memory-or-packet'},
  {id:'inseme.kernel-continuation',producer_class:'checkpoint_resume',
    location:'../inseme/packages/cop-kernel/src/continuation.js',
    entry:'createContinuationDescriptor',carrier:'cop/continuation descriptor',
    persistence:'in-memory-or-packet'},
  {id:'cogentia.cps-judgment-assignment',producer_class:'composition',
    location:'scripts/lib/chatgpt-cps-assignment.js',
    entry:'prepareAssignedChatgptCpsContinuation',
    carrier:'cop/continuation',persistence:'cop-event-journal',
    note:'COP mandate, PacketClaim and budget at admitted execution boundary'},
  {id:'cogentia.legacy-cps-promotion',producer_class:'composition',
    location:'scripts/lib/legacy-public-judgment-cps.js',
    entry:'preparePublicLegacyJudgmentCps',carrier:'cop/continuation',
    persistence:'cop-event-journal',
    note:'adapter links existing local judgment to new governed child, not the original producer'},
].map(row=>Object.freeze(row)));

// Legacy `kind` names are domain-specific task types, not automatically
// runtime classifications. Never classify an unknown kind from title/question.
const LEGACY_KINDS=Object.freeze({
  'index.document_role_judgment':'judgment_boundary',
  'guide_answer_judgment':'judgment_boundary',
  'semantic-search':'data_dependency',
  'embeddings-index':'data_dependency',
  'capability-delegation':'external_capability_wait',
  'clarification':'external_capability_wait',
  'corpus_sleep_cycle_continuation':'checkpoint_resume',
  'cognitive_packet_journey':'temporal_recurrence',
  'concept-from-issue':'judgment_boundary',
  'readme_semantic_review':'judgment_boundary',
});

/** Resolver command != executable resumption: old CLI `continuation resolve`
 * is only a write to the result slot. Never advertise it as a runnable handler. */
export function continuationResumeEvidence(row){
  if(typeof row?.resumeTo==='string'&&row.resumeTo.trim())
    return 'named_handler_unverified';
  const command=row?.resume?.command;
  if(typeof command==='string'&&/\bcontinuation\s+(?:resolve|resume)\s+/.test(command))
    return 'return_slot_only';
  if(typeof command==='string'&&command.trim())
    return 'local_command_unverified';
  return 'no_executable_resume_contract';
}

export function classifyStoredContinuation(row){
  if(!row||typeof row!=='object')return {ok:false,status:'invalid_continuation'};
  const kind=typeof row.kind==='string'&&row.kind.trim()?row.kind:
    typeof row.context?.kind==='string'?row.context.kind:'unknown';
  const producer_class=Object.hasOwn(LEGACY_KINDS,kind)?LEGACY_KINDS[kind]:null;
  return {ok:true,kind,producer_class,
    status:producer_class?'classified_by_legacy_kind':'needs_producer_evidence',
    resume_evidence:continuationResumeEvidence(row),
    // `cogentia.continuation.v2` is an operational carrier, not an authority
    // grant. Actual origin can differ (v1 migration and other producers).
    origin_verified:false};
}

export function summarizeStoredContinuationProducers(rows){
  if(!Array.isArray(rows))throw new TypeError('rows must be an array');
  const classes={},statuses={},resumption={},kinds={};
  for(const row of rows){
    const p=classifyStoredContinuation(row);
    if(!p.ok)continue;
    classes[p.producer_class||'unclassified']=(classes[p.producer_class||'unclassified']||0)+1;
    kinds[p.kind]=(kinds[p.kind]||0)+1;
    resumption[p.resume_evidence]=(resumption[p.resume_evidence]||0)+1;
    statuses[row.status||'unknown']=(statuses[row.status||'unknown']||0)+1;
  }
  return {profile:'cogentia.continuation-producer-audit/v1',read_only:true,
    total:rows.length,by_class:classes,by_kind:kinds,by_status:statuses,
    by_resumption_contract:resumption,
    classification_basis:'legacy_kind_only; no verified individual producer provenance',
    external_effects:0};
}
