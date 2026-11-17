/**
 * Operational Cogentia continuation repository on host-local SQLite.
 * Does not require COP, MCP, a hosted browser, a global index or GitHub.
 *
 * Unlike a snapshot import, saving an already-loaded continuation is a
 * conditional, revision-bound mutation. An unversioned overwrite fails closed.
 * Archived JSON originals are imported separately and never used as live state.
 */
import {homedir,hostname} from 'node:os';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {createPrimitiveContinuationStore} from './primitive-continuations.mjs';

const REVISION=Symbol.for('cogentia.continuation.sqlite_revision');
const LOCATOR=Symbol.for('cogentia.continuation.sqlite_locator');
const installed=new Map();
const sha=s=>createHash('sha256').update(s).digest('hex');
const isId=x=>typeof x==='string'&&/^[a-zA-Z0-9_.:-]{1,200}$/.test(x);
const plain=x=>x?.body?.source_format==='json-continuation'&&x.body.original
  ?x.body.original:x?.body;
export function continuationDatabasePath(registryRoot){
  if(typeof registryRoot!=='string'||!registryRoot.trim())throw Error('registry_root_required');
  if(process.env.COGENTIA_CONTINUATIONS_DB){
    if(!resolve(process.env.COGENTIA_CONTINUATIONS_DB))throw Error('invalid_continuations_db');
    return resolve(process.env.COGENTIA_CONTINUATIONS_DB);
  }
  const root=resolve(registryRoot);
  return join(homedir(),'.local','state','cogentia','continuations',
    sha(root.toLowerCase()).slice(0,20)+'.sqlite');
}
function decorate(record,row,location){
  if(!record||typeof record!=='object')throw Error('invalid_continuation_record');
  Object.defineProperty(record,REVISION,{value:row.revision,writable:true,configurable:true});
  Object.defineProperty(record,LOCATOR,{value:location,writable:false,configurable:true});
  return record;
}
export function createContinuationSqliteRepository({registryRoot,dbPath=null}={}){
  const filename=dbPath?resolve(dbPath):continuationDatabasePath(registryRoot);
  const root=resolve(registryRoot);
  const rootKey=sha(root.toLowerCase()).slice(0,20);
  const store=createPrimitiveContinuationStore(filename);
  const unpack=row=>{
    if(!row)return null;
    const original=plain(row);
    // Isolate application mutation from the SQLite row's parsed body.
    return decorate(structuredClone(original),row,filename);
  };
  function load(id){
    if(!isId(id))throw Error('invalid_continuation_id');
    const row=store.get(id);
    return row?unpack(row):null;
  }
  function save(document,{allowUnversionedCreate=true}={}){
    if(!document||typeof document!=='object'||!isId(document.id)||
       typeof document.status!=='string'||!document.status.trim())
      throw Error('invalid_continuation_document');
    const current=store.get(document.id);
    if(!current){
      if(!allowUnversionedCreate||document[REVISION]!==undefined)
        throw Error('stale_continuation_create');
      const created=store.create({id:document.id,
        kind:document.kind||'legacy_continuation',scope:'registry:'+rootKey,
        status:document.status,body:structuredClone(document),
        origin_ref:'registry:'+rootKey});
      if(!created.ok)throw Error('continuation_identity_conflict');
      decorate(document,created.row,filename);
      return {ok:true,row:created.row,created:true};
    }
    // No optimistic version => no authorization to overwrite an observed
    // object. This is a concurrency invariant, not a governance mandate.
    if(document[LOCATOR]!==filename || document[REVISION]!==current.revision)
      throw Error('continuation_revision_conflict');
    const body=current.body?.source_format==='json-continuation'
      ?{...current.body,original:structuredClone(document)}
      :structuredClone(document);
    const result=store.compareAndSwap(document.id,current.revision,{
      status:document.status,body,verb:'save_continuation',
      detail:{registry_root_hash:rootKey}});
    if(!result.ok)throw Error('continuation_revision_conflict');
    decorate(document,result.row,filename);
    return {ok:true,row:result.row,created:false};
  }
  function list({limit=10000}={}){
    return store.list({limit}).filter(row=>row.kind!=='conversation_turn')
      .map(unpack);
  }
  function inspect(id){return store.get(id)}
  return {path:filename,registry_root:root,host:hostname(),load,save,list,
    inspect,snapshot:id=>store.snapshot(id),sources:id=>store.sources(id),
    remember:(id,slot,inputHash,result)=>store.remember(id,slot,inputHash,result),
    attachSource:(id,sourceRef,sourceHash,payload)=>store.attachSource(id,sourceRef,sourceHash,payload),
    close:()=>store.close()};
}
export function continuationRepository(registryRoot){
  const filename=continuationDatabasePath(registryRoot);
  const old=installed.get(filename);
  if(old)return old;
  const repo=createContinuationSqliteRepository({registryRoot,dbPath:filename});
  installed.set(filename,repo);
  return repo;
}
