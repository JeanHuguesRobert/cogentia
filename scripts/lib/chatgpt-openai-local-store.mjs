/** Local provider request memory. One SQLite file on the machine hosting the provider.
 * No COP, no GitHub issues, no networked queue, no mandate model.
 */
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';

export function createChatgptLocalStore(path){
  if(typeof path!=='string'||!path.trim())throw Error('local_provider_db_path_required');
  const filename=resolve(path);
  mkdirSync(dirname(filename),{recursive:true,mode:0o700});
  const db=new DatabaseSync(filename);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec('CREATE TABLE IF NOT EXISTS requests('+
    'id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, request_hash TEXT NOT NULL,'+
    'question TEXT NOT NULL, status TEXT NOT NULL, answer TEXT, reason TEXT,'+
    'created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,'+
    'updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  // Do not automatically replay a possibly submitted browser turn after a crash.
  db.prepare("UPDATE requests SET status='uncertain',reason='process_restarted',updated_at=CURRENT_TIMESTAMP WHERE status='running'").run();
  const get=db.prepare('SELECT * FROM requests WHERE id=?');
  const byKey=db.prepare('SELECT * FROM requests WHERE request_key=?');
  const insert=db.prepare("INSERT OR IGNORE INTO requests(id,request_key,request_hash,question,status) VALUES(?,?,?,?,'queued')");
  const active=db.prepare("SELECT id FROM requests WHERE status IN ('running','uncertain') LIMIT 1");
  const mark=db.prepare('UPDATE requests SET status=?,answer=?,reason=?,updated_at=CURRENT_TIMESTAMP WHERE id=?');
  const claimRow=db.prepare("UPDATE requests SET status='running',reason=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('queued','deferred')");
  const deferRow=db.prepare("UPDATE requests SET status='deferred',reason=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('queued','deferred')");
  return {
    path:filename,
    get(id){return get.get(id)||null},
    enqueue({key,hash,question}){
      if(!key||!hash||!question)throw Error('invalid_local_request');
      const previous=byKey.get(key);
      if(previous)return previous.request_hash===hash?{ok:true,row:previous,existing:true}:
        {ok:false,error:'request_id_conflict'};
      const id='local_'+randomUUID().replaceAll('-','');
      insert.run(id,key,hash,question);
      const row=byKey.get(key);
      return row?.request_hash===hash?{ok:true,row,existing:row.id!==id}:
        {ok:false,error:'request_id_conflict'};
    },
    claim(id){
      db.exec('BEGIN IMMEDIATE');
      try{
        const row=get.get(id);
        if(!row){db.exec('COMMIT');return {ok:false,reason:'not_found'};}
        if(row.status==='done'||row.status==='running'||row.status==='uncertain'){
          db.exec('COMMIT');return {ok:false,reason:row.status};
        }
        const other=active.get();
        if(other&&other.id!==id){
          deferRow.run('browser_busy',id);
          db.exec('COMMIT');return {ok:false,reason:'browser_busy',blocking_ref:other.id};
        }
        const updated=claimRow.run(id);
        db.exec('COMMIT');
        return updated.changes===1?{ok:true,row:get.get(id)}:{ok:false,reason:'state_changed'};
      }catch(e){db.exec('ROLLBACK');throw e}
    },
    defer(id,reason='awaiting_resumption'){deferRow.run(reason,id);return get.get(id)},
    finish(id,answer){
      if(typeof answer!=='string'||!answer.trim())throw Error('empty_browser_answer');
      mark.run('done',answer,null,id);return get.get(id);
    },
    uncertain(id,reason='unknown_browser_delivery'){
      mark.run('uncertain',null,reason,id);return get.get(id);
    },
    close(){db.close()}
  };
}
