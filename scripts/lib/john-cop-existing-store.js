/** #299: attach to an EXISTING canonical Inseme SQLite event log in read-only
 * mode for independent discovery/authority evaluation. Never initializes,
 * migrates or creates authority; write admission needs a separate reviewed path.
 */
import {DatabaseSync} from 'node:sqlite';
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
  const store=Object.freeze({
   kind:'canonical-inseme-readonly',
   listTopic:id=>byTopic.all(id).map(row=>JSON.parse(row.envelope)),
   replay:()=>replay.all().map(row=>JSON.parse(row.envelope)),
   append:()=>({ok:false,error:'read_only_cop_store'}),
  });
  return {ok:true,store,close:()=>db.close()};
 }catch{
  try{db?.close();}catch{}
  return refuse('cop_store_unavailable');
 }
}
