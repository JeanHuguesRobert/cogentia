/**
 * Primitive continuations: local, durable, versioned and transportable work.
 * No COP, MCP, GitHub, browser, principal or network dependency.
 * An event is evidence of a local transition, not a distributed consensus proof.
 */
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';

const json=value=>JSON.stringify(value);
const hash=value=>createHash('sha256').update(json(value)).digest('hex');
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_.:-]{1,200}$/.test(id);
const validString=s=>typeof s==='string'&&s.trim().length>0;
const parse=raw=>raw===null||raw===undefined?null:JSON.parse(raw);

export function createPrimitiveContinuationStore(path){
  if(!validString(path))throw Error('continuation_db_path_required');
  const filename=resolve(path);
  mkdirSync(dirname(filename),{recursive:true,mode:0o700});
  const db=new DatabaseSync(filename);
  // Continuations can contain private work context: local file permissions
  // must not follow a permissive host default umask.
  try{chmodSync(filename,0o600)}catch(e){db.close();throw e}
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
  db.exec(`CREATE TABLE IF NOT EXISTS primitive_continuations(
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, scope TEXT NOT NULL,
    idempotency_key TEXT UNIQUE, request_hash TEXT,
    creation_hash TEXT NOT NULL,
    status TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0,
    body_json TEXT NOT NULL, origin_ref TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS primitive_scope_status ON primitive_continuations(scope,status);
  CREATE TABLE IF NOT EXISTS primitive_transitions(
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    continuation_id TEXT NOT NULL REFERENCES primitive_continuations(id),
    revision INTEGER NOT NULL, verb TEXT NOT NULL, old_status TEXT,
    new_status TEXT NOT NULL, detail_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(continuation_id,revision)
  );
  CREATE TABLE IF NOT EXISTS primitive_sources(
    continuation_id TEXT NOT NULL REFERENCES primitive_continuations(id),
    source_ref TEXT NOT NULL, source_hash TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(continuation_id,source_ref)
  );
  CREATE TABLE IF NOT EXISTS primitive_slots(
    continuation_id TEXT NOT NULL REFERENCES primitive_continuations(id),
    slot TEXT NOT NULL, input_hash TEXT NOT NULL, result_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(continuation_id,slot)
  );`);
  const select=db.prepare('SELECT * FROM primitive_continuations WHERE id=?');
  const byKey=db.prepare('SELECT * FROM primitive_continuations WHERE idempotency_key=?');
  const insert=db.prepare('INSERT OR IGNORE INTO primitive_continuations(id,kind,scope,idempotency_key,request_hash,creation_hash,status,revision,body_json,origin_ref) VALUES(?,?,?,?,?,?,?,0,?,?)');
  const event=db.prepare('INSERT INTO primitive_transitions(continuation_id,revision,verb,old_status,new_status,detail_json) VALUES(?,?,?,?,?,?)');
  const eventWithTime=db.prepare('INSERT INTO primitive_transitions(continuation_id,revision,verb,old_status,new_status,detail_json,created_at) VALUES(?,?,?,?,?,?,?)');
  const update=db.prepare('UPDATE primitive_continuations SET status=?,body_json=?,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND revision=?');
  const blocker=db.prepare("SELECT id,status FROM primitive_continuations WHERE scope=? AND status IN ('running','uncertain') AND id<>? LIMIT 1");
  const slotSelect=db.prepare('SELECT input_hash,result_json FROM primitive_slots WHERE continuation_id=? AND slot=?');
  const slotInsert=db.prepare('INSERT OR IGNORE INTO primitive_slots(continuation_id,slot,input_hash,result_json) VALUES(?,?,?,?)');
  const slotsFor=db.prepare('SELECT slot,input_hash,result_json FROM primitive_slots WHERE continuation_id=? ORDER BY slot');
  const eventsFor=db.prepare('SELECT * FROM primitive_transitions WHERE continuation_id=? ORDER BY revision');
  const sourcesFor=db.prepare('SELECT source_ref,source_hash,payload_json FROM primitive_sources WHERE continuation_id=? ORDER BY source_ref');
  const sourceGet=db.prepare('SELECT source_hash,payload_json FROM primitive_sources WHERE continuation_id=? AND source_ref=?');
  const sourceInsert=db.prepare('INSERT OR IGNORE INTO primitive_sources(continuation_id,source_ref,source_hash,payload_json) VALUES(?,?,?,?)');
  const unpack=row=>row?{...row,body:parse(row.body_json)}:null;
  const get=id=>unpack(select.get(id));
  const transaction=fn=>{
    db.exec('BEGIN IMMEDIATE');
    try{const result=fn();db.exec('COMMIT');return result}
    catch(e){db.exec('ROLLBACK');throw e}
  };
  const transitionWithin=(id,expectedRevision,{status,body,verb='transition',detail={}})=>{
    const old=get(id);
    if(!old)return {ok:false,code:'not_found'};
    if(old.revision!==expectedRevision)return {ok:false,code:'revision_conflict',current:old};
    const nextStatus=status??old.status;
    const nextBody=body===undefined?old.body:body;
    if(!validString(nextStatus))throw Error('invalid_continuation_status');
    const changed=update.run(nextStatus,json(nextBody),id,expectedRevision);
    if(changed.changes!==1)return {ok:false,code:'revision_conflict',current:get(id)};
    event.run(id,expectedRevision+1,verb,old.status,nextStatus,json(detail));
    return {ok:true,row:get(id)};
  };
  function create({id,kind='primitive',scope='local',idempotency_key=null,request_hash=null,status='suspended',body={},origin_ref=null}={}){
    if(!validId(id)||![kind,scope,status].every(validString)||
      (idempotency_key!==null&&!validString(idempotency_key))||
      (request_hash!==null&&!validString(request_hash)))throw Error('invalid_continuation');
    const creationHash=hash({id,kind,scope,idempotency_key,request_hash,status,body,origin_ref});
    return transaction(()=>{
      const first=idempotency_key?byKey.get(idempotency_key):select.get(id);
      if(first){
        const row=unpack(first);
        return row.id===id&&row.kind===kind&&row.scope===scope&&
          row.idempotency_key===idempotency_key&&row.request_hash===request_hash&&
          row.origin_ref===origin_ref&&row.creation_hash===creationHash
          ?{ok:true,row,existing:true}:{ok:false,code:'continuation_identity_conflict',current:row};
      }
      const inserted=insert.run(id,kind,scope,idempotency_key,request_hash,creationHash,status,json(body),origin_ref);
      if(inserted.changes!==1)return {ok:false,code:'continuation_identity_conflict'};
      event.run(id,0,'create',null,status,json({origin_ref}));
      return {ok:true,row:get(id),existing:false};
    });
  }
  function compareAndSwap(id,expectedRevision,change){
    if(!validId(id)||!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw Error('invalid_expected_revision');
    return transaction(()=>transitionWithin(id,expectedRevision,change));
  }
  function claim(id,{ready=['queued','deferred','suspended'],busy=['running','uncertain']}={}){
    if(!validId(id))throw Error('invalid_continuation_id');
    return transaction(()=>{
      const row=get(id);
      if(!row)return {ok:false,code:'not_found'};
      if(!ready.includes(row.status))return {ok:false,code:row.status,row};
      const blocked=blocker.get(row.scope,id);
      if(blocked&&busy.includes(blocked.status))return {ok:false,code:'resource_busy',blocking_ref:blocked.id,row};
      return transitionWithin(id,row.revision,{status:'running',verb:'claim',detail:{scope:row.scope}});
    });
  }
  function remember(id,slot,inputHash,result){
    if(!validId(id)||!validString(slot)||!validString(inputHash))throw Error('invalid_memo_slot');
    return transaction(()=>{
      if(!select.get(id))return {ok:false,code:'not_found'};
      const old=slotSelect.get(id,slot);
      if(old)return old.input_hash===inputHash
        ?{ok:true,existing:true,result:parse(old.result_json)}
        :{ok:false,code:'slot_input_conflict',previous_input_hash:old.input_hash};
      slotInsert.run(id,slot,inputHash,json(result));
      return {ok:true,existing:false,result};
    });
  }
  function attachSource(id,sourceRef,sourceHash,payload){
    if(!validId(id)||!validString(sourceRef)||!validString(sourceHash))throw Error('invalid_source_reference');
    return transaction(()=>{
      if(!select.get(id))return {ok:false,code:'not_found'};
      const previous=sourceGet.get(id,sourceRef);
      if(previous)return previous.source_hash===sourceHash&&previous.payload_json===json(payload)
        ?{ok:true,existing:true}:{ok:false,code:'source_version_conflict'};
      sourceInsert.run(id,sourceRef,sourceHash,json(payload));
      return {ok:true,existing:false};
    });
  }
  function sources(id){
    return sourcesFor.all(id).map(s=>({source_ref:s.source_ref,source_hash:s.source_hash,
      payload:parse(s.payload_json)}));
  }
  function snapshotContent(id){
    const row=get(id);
    if(!row)return null;
    const content={format:'primitive-continuation-snapshot/v1',
      continuation:{id:row.id,kind:row.kind,scope:row.scope,
        idempotency_key:row.idempotency_key,request_hash:row.request_hash,
        creation_hash:row.creation_hash,status:row.status,revision:row.revision,body:row.body,origin_ref:row.origin_ref},
      slots:slotsFor.all(id).map(s=>({slot:s.slot,input_hash:s.input_hash,result:parse(s.result_json)})),
      sources:sources(id),
      history:eventsFor.all(id).map(e=>({revision:e.revision,verb:e.verb,
        old_status:e.old_status,new_status:e.new_status,
        detail:parse(e.detail_json),created_at:e.created_at}))};
    return content;
  }
  function snapshot(id){
    // One coherent read-view, without imposing a global work lock.
    db.exec('BEGIN');
    try{
      const content=snapshotContent(id);
      db.exec('COMMIT');
      return content?{...content,sha256:hash(content)}:null;
    }catch(e){db.exec('ROLLBACK');throw e}
  }
  function validatedSnapshot(envelope,{scope=null}={}){
    if(!envelope||envelope.format!=='primitive-continuation-snapshot/v1')throw Error('invalid_snapshot');
    const {sha256,...content}=envelope;
    if(hash(content)!==sha256)throw Error('snapshot_checksum_mismatch');
    const c=content.continuation;
    if(!validId(c?.id)||!Number.isSafeInteger(c.revision)||c.revision<0||
       ![c.kind,c.scope,c.status].every(validString)||!Array.isArray(content.slots)||
       !Array.isArray(content.sources)||!Array.isArray(content.history)||
       !validString(c.creation_hash))
      throw Error('invalid_snapshot_continuation');
    const targetScope=scope||c.scope;
    if(!validString(targetScope))throw Error('invalid_snapshot_scope');
    if(content.history.length!==c.revision+1||
       content.history.some((h,i)=>h?.revision!==i||
         !validString(h.verb)||!validString(h.new_status)||!validString(h.created_at)))
      throw Error('invalid_snapshot_history');
    return {c,content,sha256,targetScope};
  }
  function importSnapshot(envelope,{scope=null}={}){
    const {c,content,sha256,targetScope}=validatedSnapshot(envelope,{scope});
    return transaction(()=>{
      const existing=get(c.id);
      if(existing){
        const local=snapshotContent(c.id);
        const scoped={...content,continuation:{...content.continuation,scope:targetScope}};
        return local&&hash(local)===hash(scoped)&&targetScope===existing.scope
          ?{ok:true,existing:true,row:existing}
          :{ok:false,code:'snapshot_conflict',current:existing};
      }
      const created=insert.run(c.id,c.kind,targetScope,c.idempotency_key,c.request_hash,
        c.creation_hash,c.status,json(c.body),c.origin_ref);
      if(created.changes!==1)return {ok:false,code:'snapshot_conflict'};
      if(c.revision!==0)db.prepare('UPDATE primitive_continuations SET revision=? WHERE id=?').run(c.revision,c.id);
      for(const h of content.history)
        eventWithTime.run(c.id,h.revision,h.verb,h.old_status,h.new_status,
          json(h.detail),h.created_at);
      for(const s of content.sources){
        if(!validString(s.source_ref)||!validString(s.source_hash))throw Error('invalid_snapshot_source');
        sourceInsert.run(c.id,s.source_ref,s.source_hash,json(s.payload));
      }
      for(const s of content.slots){
        if(!validString(s.slot)||!validString(s.input_hash))throw Error('invalid_snapshot_slot');
        slotInsert.run(c.id,s.slot,s.input_hash,json(s.result));
      }
      return {ok:true,existing:false,row:get(c.id)};
    });
  }
  /**
   * Causal merge of a newer portable snapshot into an already-existing
   * LOCAL continuation. This is a state reconciliation, NOT a distributed
   * ownership transfer or authority grant. Never replays external effects.
   *
   * A matching causal prefix can advance the local state by CAS; incompatible
   * branches are retained as content-addressed evidence, not overwritten.
   */
  function reconcileSnapshot(envelope,{scope=null,preserveDivergence=true}={}){
    const {c,content,sha256}=validatedSnapshot(envelope);
    if(scope!==null&&!validString(scope))throw Error('invalid_snapshot_scope');
    return transaction(()=>{
      const existing=get(c.id);
      if(!existing)return {ok:false,code:'not_found'};
      if(scope!==null&&scope!==existing.scope)
        return {ok:false,code:'local_scope_mismatch',current:existing};
      const divergent=reason=>{
        if(!preserveDivergence)return {ok:false,code:reason,current:existing};
        const ref='divergent-snapshot:sha256:'+sha256;
        const prior=sourceGet.get(c.id,ref);
        if(!prior)sourceInsert.run(c.id,ref,sha256,json(envelope));
        return {ok:false,code:reason,preserved:true,
          already_preserved:!!prior,source_ref:ref,current:existing};
      };
      if(existing.creation_hash!==c.creation_hash||existing.kind!==c.kind||
         existing.idempotency_key!==c.idempotency_key||
         existing.request_hash!==c.request_hash||
         existing.origin_ref!==c.origin_ref)
        return divergent('snapshot_identity_conflict');
      const local=snapshotContent(c.id);
      const overlap=Math.min(local.history.length,content.history.length);
      if(!local.history.slice(0,overlap).every((event,i)=>
         json(event)===json(content.history[i])))
        return divergent('causal_divergence');
      if(c.revision<existing.revision)
        return {ok:false,code:'stale_snapshot',current:existing};
      if(c.revision===existing.revision&&
         (c.status!==existing.status||json(c.body)!==json(existing.body)))
        return divergent('snapshot_state_conflict');
      // Verify the union of memo slots and historical source records BEFORE
      // changing state. Identical keys with incompatible dependencies never
      // overwrite one another.
      for(const slot of content.slots){
        if(!validString(slot.slot)||!validString(slot.input_hash))
          throw Error('invalid_snapshot_slot');
        const old=slotSelect.get(c.id,slot.slot);
        if(old&&(old.input_hash!==slot.input_hash||
           old.result_json!==json(slot.result)))
          return divergent('memo_slot_conflict');
      }
      for(const source of content.sources){
        if(!validString(source.source_ref)||!validString(source.source_hash))
          throw Error('invalid_snapshot_source');
        const old=sourceGet.get(c.id,source.source_ref);
        if(old&&(old.source_hash!==source.source_hash||
           old.payload_json!==json(source.payload)))
          return divergent('snapshot_source_conflict');
      }
      if(c.revision>existing.revision){
        const changed=db.prepare(`UPDATE primitive_continuations
          SET status=?,body_json=?,revision=?,updated_at=CURRENT_TIMESTAMP
          WHERE id=? AND revision=?`)
          .run(c.status,json(c.body),c.revision,c.id,existing.revision);
        if(changed.changes!==1)
          return {ok:false,code:'revision_conflict',current:get(c.id)};
        for(const ev of content.history.slice(existing.revision+1))
          eventWithTime.run(c.id,ev.revision,ev.verb,ev.old_status,
            ev.new_status,json(ev.detail),ev.created_at);
      }
      let mergedSlots=0,mergedSources=0;
      for(const slot of content.slots){
        const put=slotInsert.run(c.id,slot.slot,slot.input_hash,json(slot.result));
        mergedSlots+=put.changes;
      }
      for(const source of content.sources){
        const put=sourceInsert.run(c.id,source.source_ref,source.source_hash,
          json(source.payload));
        mergedSources+=put.changes;
      }
      return {ok:true,advanced:c.revision>existing.revision,
        existing:c.revision===existing.revision,
        from_revision:existing.revision,row:get(c.id),
        merged_slots:mergedSlots,merged_sources:mergedSources};
    });
  }
  function recoverInterrupted({kind='primitive',scope=null,from='running',to='uncertain'}={}){
    if(![kind,from,to].every(validString))throw Error('invalid_recovery_filter');
    return transaction(()=>{
      const rows=db.prepare('SELECT id,revision FROM primitive_continuations WHERE kind=? AND status=? AND (? IS NULL OR scope=?)').all(kind,from,scope,scope);
      for(const row of rows){
        transitionWithin(row.id,row.revision,{status:to,verb:'recover_interrupted',
          detail:{reason:'previous_runner_outcome_unknown'}});
      }
      return rows.length;
    });
  }
  return {path:filename,get,getByKey:key=>unpack(byKey.get(key)),create,compareAndSwap,
    claim,remember,snapshot,importSnapshot,reconcileSnapshot,recoverInterrupted,attachSource,sources,
    events:id=>eventsFor.all(id).map(r=>({...r,detail:parse(r.detail_json)})),
    list({status=null,kind=null,limit=200}={}){
      const rows=db.prepare('SELECT * FROM primitive_continuations WHERE (? IS NULL OR status=?) AND (? IS NULL OR kind=?) ORDER BY created_at,id LIMIT ?')
        .all(status,status,kind,kind,Math.max(1,Math.min(Number(limit)||200,10000)));
      return rows.map(unpack);
    },
    close(){db.close()},
  };
}
