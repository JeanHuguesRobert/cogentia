/** #299: attach to an EXISTING canonical Inseme SQLite event log in read-only
 * mode for independent discovery/authority evaluation. Never initializes,
 * migrates or creates authority; write admission needs a separate reviewed path.
 */
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {validateCopEventEnvelope} from '../../../inseme/packages/cop-core/src/cop-event-envelope.js';
import {validateFractalogActRecord,FRACTALOG_ACT_RECORD_SCHEMA} from '../../../inseme/packages/cop-core/src/fractalog.js';
import {realpathSync,statSync} from 'node:fs';
const refuse=error=>({ok:false,error,store:null});
export function openExistingJohnCopStore(filename){
 if(typeof filename!=='string'||!filename.trim())return refuse('cop_store_path_not_configured');
 let db;
 try{
  const path=realpathSync(filename);
  if(!statSync(path).isFile())return refuse('cop_store_not_regular_file');
  db=new DatabaseSync(path,{readOnly:true,timeout:1000});
  const names=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name));
  if(!names.has('cop_events')||!names.has('cop_topic_commitments')){
   db.close();return refuse('canonical_cop_schema_missing');
  }
  const byTopic=db.prepare('SELECT envelope FROM cop_events WHERE topic=? ORDER BY seq');
  const replay=db.prepare('SELECT envelope FROM cop_events ORDER BY topic,seq');
  const readHead=db.prepare('SELECT seq,head FROM cop_topic_commitments WHERE topic=?');
  const auditRows=db.prepare('SELECT seq,envelope FROM cop_events WHERE topic=? ORDER BY seq');
  // Same byte-chain and canonical validation as Inseme's writer audit.
  // A read snapshot prevents a concurrent append from racing head vs rows;
  // never open the writer (which can perform schema maintenance) for audit.
  function auditTopicCommitment(id){
   db.exec('BEGIN');
   try{
    const head=readHead.get(id),errors=[];
    let seq=0,hash='';
    for(const row of auditRows.iterate(id)){
     seq++;
     if(row.seq!==seq)errors.push('sequence_gap_or_reordering_at:'+seq);
     let event;
     try{event=JSON.parse(row.envelope)}catch{errors.push('malformed_envelope_at:'+seq);continue}
     if(event.topic?.id!==id||event.topic?.seq!==row.seq)
      errors.push('topic_binding_mismatch_at:'+seq);
     if(!validateCopEventEnvelope(event,{requirePositiveSeq:true}).ok)
      errors.push('invalid_envelope_at:'+seq);
     if(event.payload?.schema===FRACTALOG_ACT_RECORD_SCHEMA&&!validateFractalogActRecord(event.payload).ok)
      errors.push('fractalog_document_hash_mismatch_at:'+seq);
     hash='sha256:'+createHash('sha256').update(hash).update(row.envelope).digest('hex');
    }
    if(!head)errors.push('commitment_missing');
    else if(head.seq!==seq||head.head!==hash)errors.push('commitment_mismatch');
    return {topic:id,ok:errors.length===0,events:seq,head:hash||null,committed_head:head?.head||null,errors};
   }finally{db.exec('ROLLBACK')}
  }
  const store=Object.freeze({
   kind:'canonical-inseme-readonly',
   listTopic:id=>byTopic.all(id).map(row=>JSON.parse(row.envelope)),
   replay:()=>replay.all().map(row=>JSON.parse(row.envelope)),
   auditTopicCommitment,
   append:()=>({ok:false,error:'read_only_cop_store'}),
  });
  return {ok:true,store,close:()=>db.close()};
 }catch{
  try{db?.close();}catch{}
  return refuse('cop_store_unavailable');
 }
}
