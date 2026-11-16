/**
 * Primitive continuations: local, durable, versioned and transportable work.
 * No COP, MCP, GitHub, browser, principal or network dependency.
 * An event is evidence of a local transition, not a distributed consensus proof.
 */
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';

const json=value=>JSON.stringify(value);
const hash=value=>createHash('sha256').update(json(value)).digest('hex');
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_.:-]{1,200}$/.test(id);
const validString=s=>typeof s==='string'&&s.trim().length>0;
const parse=raw=>raw===null||raw===undefined?null:JSON.parse(raw);
const hasOwn=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);

export function createPrimitiveContinuationStore(path){
  if(!validString(path))throw Error('continuation_db_path_required');
  const filename=resolve(path);
  mkdirSync(dirname(filename),{recursive:true,mode:0o700});
  const db=new DatabaseSync(filename);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
  db.exec(`CREATE TABLE IF NOT EXISTS primitive_continuations(
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, scope TEXT NOT NULL,
    idempotency_key TEXT UNIQUE, request_hash TEXT,
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
  const insert=db.prepare('INSERT OR IGNORE INTO primitive_continuations(id,kind,scope,idempotency_key,request_hash,status,revision,body_json,origin_ref) VALUES(?,?,?,?,?,?,0,?,?)');
  const event=db.prepare('INSERT INTO primitive_transitions(continuation_id,revision,verb,old_status,new_status,detail_json) VALUES(?,?,?,?,?,?)');
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
    return transaction(()=>{
      const first=idempotency_key?byKey.get(idempotency_key):select.get(id);
      if(first){
        const row=unpack(first);
        return row.id===id&&row.kind===kind&&row.scope===scope&&
          row.idempotency_key===idempotency_key&&row.request_hash===request_hash&&
          row.origin_ref===origin_ref&&hash(row.body)===hash(body)
          ?{ok:true,row,existing:true}:{ok:false,code:'continuation_identity_conflict',current:row};
      }
      const inserted=insert.run(id,kind,scope,idempotency_key,request_hash,status,json(body),origin_ref);
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
  function snapshot(id){
    const row=get(id);
    if(!row)return null;
    const content={format:'primitive-continuation-snapshot/v1',
      continuation:{id:row.id,kind:row.kind,scope:row.scope,
        idempotency_key:row.idempotency_key,request_hash:row.request_hash,
        status:row.status,revision:row.revision,body:row.body,origin_ref:row.origin_ref},
      slots:slotsFor.all(id).map(s=>({slot:s.slot,input_hash:s.input_hash,result:parse(s.result_json)})),
      sources:sources(id)};
    return {...content,sha256:hash(content)};
  }
  function importSnapshot(envelope,{scope=null}={}){
    if(!envelope||envelope.format!=='primitive-continuation-snapshot/v1')throw Error('invalid_snapshot');
    const {sha256,...content}=envelope;
    if(hash(content)!==sha256)throw Error('snapshot_checksum_mismatch');
    const c=content.continuation;
    if(!validId(c?.id)||!Number.isSafeInteger(c.revision)||c.revision<0||
       ![c.kind,c.scope,c.status].every(validString)||!Array.isArray(content.slots)||
       !Array.isArray(content.sources))
      throw Error('invalid_snapshot_continuation');
    const targetScope=scope||c.scope;
    if(!validString(targetScope))throw Error('invalid_snapshot_scope');
    return transaction(()=>{
      const existing=get(c.id);
      if(existing){
        const local=snapshot(c.id);
        return local?.sha256===sha256&&targetScope===existing.scope
          ?{ok:true,existing:true,row:existing}
          :{ok:false,code:'snapshot_conflict',current:existing};
      }
      const created=insert.run(c.id,c.kind,targetScope,c.idempotency_key,c.request_hash,
        c.status,json(c.body),c.origin_ref);
      if(created.changes!==1)return {ok:false,code:'snapshot_conflict'};
      if(c.revision!==0)db.prepare('UPDATE primitive_continuations SET revision=? WHERE id=?').run(c.revision,c.id);
      event.run(c.id,c.revision,'import',null,c.status,json({source_sha256:sha256}));
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
    claim,remember,snapshot,importSnapshot,recoverInterrupted,attachSource,sources,
    events:id=>eventsFor.all(id).map(r=>({...r,detail:parse(r.detail_json)})),
    list({status=null,kind=null,limit=200}={}){
      const rows=db.prepare('SELECT * FROM primitive_continuations WHERE (? IS NULL OR status=?) AND (? IS NULL OR kind=?) ORDER BY created_at,id LIMIT ?')
        .all(status,status,kind,kind,Math.max(1,Math.min(Number(limit)||200,10000)));
      return rows.map(unpack);
    },
    close(){db.close()},
  };
}
