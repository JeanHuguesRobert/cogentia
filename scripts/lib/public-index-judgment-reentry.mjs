/**
 * CPKT-2026-010 / #336: one real, durable re-entry adapter for the existing
 * index.document_role_judgment producer. Not a scheduler or a second ledger.
 *
 * The resumed computation executes the SAME chunker as indexRebuild, but
 * records a candidate index artifact in the continuation's SQLite memo slot.
 * Publishing/updating the global search index remains a separate authorized Act.
 */
import {createHash} from 'node:crypto';
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';

export const PUBLIC_INDEX_REENTRY_HANDLER='handler:public-document-index-judgment/v1';
const sha=s=>createHash('sha256').update(s).digest('hex');
const allowed=new Set(['index','source','derived','archive','skip','private','public','needs_more_context']);
const indexable=new Set(['index','source','derived']);
const slot='reentry:public-document-index';
const pathSafe=s=>typeof s==='string'&&s.endsWith('.md')&&s.length<300&&
  !isAbsolute(s)&&s.split('/').every(v=>v&&v!=='.'&&v!=='..')&&
  !s.includes(String.fromCharCode(0))&&!s.includes(String.fromCharCode(92));
function source({continuation,repoRoot}){
  const rel=continuation.subject?.path;
  if(!pathSafe(rel))return {ok:false,status:'source_path_invalid'};
  try{
    const root=realpathSync(repoRoot);
    const full=realpathSync(resolve(root,rel));
    const inside=relative(root,full);
    if(!inside||inside==='..'||inside.startsWith('..'+sep)||
       isAbsolute(inside)||!statSync(full).isFile()||statSync(full).size>1_000_000)
      return {ok:false,status:'source_not_admitted'};
    const raw=readFileSync(full,'utf8');
    const digest=sha(raw);
    if(!continuation.context?.source_sha256||
       digest!==continuation.context.source_sha256)
      return {ok:false,status:'source_version_conflict'};
    return {ok:true,raw,digest};
  }catch{return {ok:false,status:'source_unavailable'}}
}
export function resumePublicIndexJudgment({continuation,repository,repoRoot,
  chunkMarkdown,emitFollowup}={}){
  const c=continuation;
  if(!c||c.kind!=='index.document_role_judgment'||
     c.resumption_target?.kind!=='handler'||
     c.resumption_target.handler_ref!==PUBLIC_INDEX_REENTRY_HANDLER||
     c.status!=='resolved'||!repository?.remember||
     !repoRoot||typeof chunkMarkdown!=='function')
    return {ok:false,status:'reentry_handler_unavailable'};
  const decision=c.resolution?.decision;
  const reason=c.resolution?.reason;
  if(!allowed.has(decision)||
     !c.expected_response?.allowed_decisions?.includes(decision)||
     typeof reason!=='string'||reason.trim().length<3)
    return {ok:false,status:'judgment_contract_invalid'};
  if(c.context?.boundary!==c.kind||typeof c.subject?.repo!=='string')
    return {ok:false,status:'origin_context_invalid'};
  // A terminal receipt is retrieved, not recalculated. Pure crash recovery
  // may recompute only while no durable re-entry completion was recorded.
  if(c.resolution?.return_state?.resumed===true){
    const previous=repository.snapshot(c.id)?.slots?.find(x=>x.slot===slot);
    if(!previous)return {ok:false,status:'missing_reentry_slot'};
    return {ok:true,status:'already_resumed',duplicate:true,
      artifact_ref:c.resolution.return_state.output_artifact_ref,
      receipt_ref:c.resolution.return_state.resume_receipt_ref,
      artifact:previous.result};
  }
  const original=source({continuation:c,repoRoot});
  if(!original.ok)return original;
  let artifact;
  if(decision==='needs_more_context'||decision==='public'){
    if(typeof emitFollowup!=='function')
      return {ok:false,status:'followup_emitter_unavailable'};
    const followup=emitFollowup({
      kind:c.kind,subject:c.subject,
      dedupe_key:'reentry:needs-context:'+c.id+':'+original.digest,
      title:'Additional evidence for '+c.subject.path,
      question:decision==='public'
        ?'Public visibility alone is NOT a document role. Classify '+c.subject.repo+
          '/'+c.subject.path+' as index, source, derived, archive, skip or needs_more_context; evidence: '+reason.slice(0,400)
        :'Provide verifiable additional context to classify '+c.subject.repo+
          '/'+c.subject.path+'; original reason: '+reason.slice(0,400),
      context:{boundary:c.kind,parent_continuation_ref:'continuation:'+c.id,
        source_sha256:original.digest,blocks_index:true},
      expected_response:decision==='public'?{...c.expected_response,
        allowed_decisions:c.expected_response.allowed_decisions.filter(d=>d!=='public')}
        :c.expected_response,
      resumption_target:c.resumption_target,
    });
    if(!followup?.continuation?.id||followup.continuation.id===c.id)
      return {ok:false,status:'followup_creation_unconfirmed'};
    artifact={profile:'cogentia.public-index-reentry/v1',
      status:'awaiting_additional_judgment',
      continuation_id:c.id,followup_ref:'continuation:'+followup.continuation.id,
      source_sha256:original.digest,decision};
  }else{
    // This is genuine post-Judgment work, not merely a status acknowledgement:
    // compute a reproducible candidate chunk projection using indexRebuild's
    // existing chunkMarkdown implementation and the original pinned document.
    const chunks=indexable.has(decision)
      ?chunkMarkdown(original.raw,c.context?.title||c.subject.path):[];
    if(!Array.isArray(chunks)||chunks.length>10000)
      return {ok:false,status:'invalid_index_projection'};
    artifact={profile:'cogentia.public-index-reentry/v1',status:'computed',
      continuation_id:c.id,repo:c.subject.repo,path:c.subject.path,
      source_sha256:original.digest,judgment:{decision,reason},
      index_eligible:indexable.has(decision),chunk_count:chunks.length,
      chunk_hashes:chunks.map(x=>sha([x.heading_path,x.start_line,x.end_line,x.text].join('\n')))};
  }
  const input_hash=sha(JSON.stringify({id:c.id,source_sha256:original.digest,
    target:c.resumption_target,decision,reason}));
  const memo=repository.remember(c.id,slot,input_hash,artifact);
  if(!memo.ok)return {ok:false,status:memo.code||'memo_conflict'};
  const artifact_ref='continuation:'+c.id+'/slot:'+slot;
  const receipt_ref=artifact_ref+'#sha256:'+sha(JSON.stringify(artifact));
  const current=repository.load(c.id);
  if(current.status!=='resolved'||current.resumption_target?.handler_ref!==PUBLIC_INDEX_REENTRY_HANDLER)
    return {ok:false,status:'reentry_revision_conflict'};
  if(current.resolution?.return_state?.resumed){
    return current.resolution.return_state.output_artifact_ref===artifact_ref
      ?{ok:true,status:'already_resumed',duplicate:true,artifact_ref,receipt_ref,artifact}
      :{ok:false,status:'reentry_receipt_conflict'};
  }
  current.resolution.return_state={
    ...current.resolution.return_state,result_available:true,delivered:true,
    resumed:true,output_artifact_ref:artifact_ref,resume_receipt_ref:receipt_ref,
  };
  current.history.push({at:new Date().toISOString(),event:'reentered',
    output_artifact_ref:artifact_ref,receipt_ref});
  try{repository.save(current)}catch(e){
    const latest=repository.load(c.id);
    if(latest.resolution?.return_state?.resume_receipt_ref===receipt_ref)
      return {ok:true,status:'already_resumed',duplicate:true,artifact_ref,receipt_ref,artifact};
    return {ok:false,status:'reentry_revision_conflict',error:e.message};
  }
  return {ok:true,status:'resumed',duplicate:memo.existing,
    artifact_ref,receipt_ref,artifact};
}
