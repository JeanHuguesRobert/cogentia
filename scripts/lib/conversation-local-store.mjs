/** Provider-neutral conversational session storage on the primitive SQLite
 * continuation kernel. No COP/MCP/runtime dependency, per-adapter scope.
 */
import {randomUUID} from 'node:crypto';
import {createPrimitiveContinuationStore} from './primitive-continuations.mjs';

export function createConversationLocalStore(path,{adapter='chatgpt-browser',recoverInterrupted=true}={}){
  if(typeof adapter!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(adapter))
    throw Error('invalid_conversational_adapter');
  const scope='conversation:'+adapter;
  const project=r=>r&&r.scope===scope?{
  id:r.id,request_key:r.idempotency_key?.slice(adapter.length+1),request_hash:r.request_hash,
  question:r.body.question,status:r.status,answer:r.body.answer??null,
  reason:r.body.reason??null,created_at:r.created_at,updated_at:r.updated_at,
  revision:r.revision,
}:null;
  const store=createPrimitiveContinuationStore(path);
  // Recovery is explicit at this adapter entry, never a primitive side effect.
  // A single live adapter process per scope is currently assumed.
  if(recoverInterrupted)store.recoverInterrupted({kind:'conversation_turn',scope});
  function mutate(id,status,verb,{answer,reason}={}){
    const old=store.get(id);
    if(!old)return null;
    const data={...old.body};
    if(answer!==undefined)data.answer=answer;
    if(reason!==undefined)data.reason=reason;
    const res=store.compareAndSwap(id,old.revision,{status,body:data,verb});
    if(!res.ok)throw Error('concurrent_browser_turn_update');
    return project(res.row);
  }
  return {
    path:store.path,
    get:id=>project(store.get(id)),
    enqueue({key,hash,question}){
      if(typeof key!=='string'||!key||typeof hash!=='string'||!hash||
        typeof question!=='string'||!question)throw Error('invalid_local_request');
      const previous=store.getByKey(adapter+':'+key);
      if(previous)return previous.request_hash===hash
        ?{ok:true,row:project(previous),existing:true}
        :{ok:false,error:'request_id_conflict'};
      const id='local_'+randomUUID().replaceAll('-','');
      const created=store.create({id,kind:'conversation_turn',scope,
        idempotency_key:adapter+':'+key,request_hash:hash,status:'queued',
        body:{question,answer:null,reason:null}});
      if(created.ok)return {ok:true,row:project(created.row),existing:false};
      // A second concurrent caller may have won the unique idempotency key.
      const winner=store.getByKey(adapter+':'+key);
      if(winner?.request_hash===hash)return {ok:true,row:project(winner),existing:true};
      return {ok:false,error:'request_id_conflict'};
    },
    claim(id){
      const result=store.claim(id,{ready:['queued','deferred']});
      if(result.ok)return {ok:true,row:project(result.row)};
      if(result.code==='resource_busy'){
        const old=store.get(id);
        if(old&&['queued','deferred'].includes(old.status))
          mutate(id,'deferred','defer',{reason:'browser_busy'});
      }
      return {ok:false,reason:result.code==='resource_busy'?'browser_busy':result.code,
        blocking_ref:result.blocking_ref};
    },
    defer(id,reason='awaiting_resumption'){
      const r=store.get(id);
      if(!r)return null;
      return ['queued','deferred'].includes(r.status)
        ?mutate(id,'deferred','defer',{reason}):project(r);
    },
    finish(id,answer){
      if(typeof answer!=='string'||!answer.trim())throw Error('empty_browser_answer');
      const r=store.get(id);
      if(!r||!['running','uncertain'].includes(r.status))
        throw Error('browser_turn_not_running');
      return mutate(id,'done','finish',{answer,reason:null});
    },
    uncertain(id,reason='unknown_browser_delivery'){
      const r=store.get(id);
      if(!r)return null;
      return r.status==='running'
        ?mutate(id,'uncertain','uncertain',{answer:null,reason}):project(r);
    },
    snapshot:id=>store.snapshot(id),
    close:()=>store.close(),
  };
}
