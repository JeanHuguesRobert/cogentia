import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createChatgptLocalStore} from './lib/chatgpt-openai-local-store.mjs';
import {createChatgptOpenAiBridge,normalizeOpenAiRequest} from './lib/chatgpt-openai-cps-bridge.mjs';
import {createChatgptBrowserTurnRunner} from './lib/chatgpt-openai-browser-runner.mjs';
import {createChatgptOpenAiCpsHttpServer} from './lib/chatgpt-openai-cps-http.mjs';

const key='local-test-provider-secret-long-enough';
const input=text=>({model:'chatgpt-browser',messages:[{role:'user',content:text}]});
function withStore(fn){
  const dir=mkdtempSync(join(tmpdir(),'chatgpt-provider-'));
  const store=createChatgptLocalStore(join(dir,'jobs.sqlite'));
  return Promise.resolve().then(()=>fn(store,dir)).finally(()=>{
    store.close();rmSync(dir,{recursive:true,force:true});
  });
}

test('text-only OpenAI input is bounded; no COP/MCP required',()=>{
  assert.equal(normalizeOpenAiRequest(input('Bonjour')).ok,true);
  assert.equal(normalizeOpenAiRequest(input('x'.repeat(4500))).error,'browser_prompt_too_long');
  assert.equal(normalizeOpenAiRequest({...input('Bonjour'),tools:[{type:'function'}]}).error,'feature_unsupported');
  assert.equal(normalizeOpenAiRequest({model:'bad',...input('ok'),model:'other'}).error,'model_unsupported');
});

test('ordinary request returns UI result and stores it locally (without COP)',()=>withStore(async(store)=>{
  let count=0;
  const complete=createChatgptOpenAiBridge({store,runTurn:async()=>{count++;return {answer:'Réponse'};}});
  const a=await complete(input('Question'),{client_request_id:'a1'});
  const b=await complete(input('Question'),{client_request_id:'a1'});
  assert.equal(a.status,200);assert.equal(b.status,200);
  assert.equal(a.body.choices[0].message.content,'Réponse');
  assert.equal(count,1);
  assert.match(store.path,/jobs\.sqlite$/);
  assert.equal(store.get(a.body._provider.local_request_id).status,'done');
}));

test('same idempotency key with changed payload is refused',()=>withStore(async(store)=>{
  const complete=createChatgptOpenAiBridge({store,runTurn:async()=>({answer:'ok'})});
  assert.equal((await complete(input('un'),{client_request_id:'same'})).status,200);
  const second=await complete(input('deux'),{client_request_id:'same'});
  assert.equal(second.status,409);
  assert.equal(second.body.error.code,'request_id_conflict');
}));

test('reentrant call suspends locally and resumes without duplicating the original turn',()=>withStore(async(store)=>{
  let release;
  const pending=new Promise(r=>release=r);
  const calls=[];
  const complete=createChatgptOpenAiBridge({store,runTurn:async(_q,{request_id})=>{
    calls.push(request_id);
    if(calls.length===1)await pending;
    return {answer:'ok'};
  }});
  const first=complete(input('outer'),{client_request_id:'outer'});
  await new Promise(r=>setTimeout(r,0));
  const nested=await complete(input('inner'),{client_request_id:'inner',
    call_chain:'chatgpt-browser,cogentia-mcp'});
  assert.equal(nested.status,409);
  assert.equal(nested.body.error.code,'local_continuation_required');
  assert.equal(nested.body.error.continuation.reason,'recursive_call');
  assert.equal(calls.length,1);
  release();
  assert.equal((await first).status,200);
  const resumed=await complete(input('inner'),{client_request_id:'inner'});
  assert.equal(resumed.status,200);assert.equal(calls.length,2);
}));

test('unmarked concurrent call still cannot recursively enter occupied browser',()=>withStore(async(store)=>{
  let release;const pending=new Promise(r=>release=r);
  const complete=createChatgptOpenAiBridge({store,runTurn:async()=>{await pending;return {answer:'ok'};}});
  const first=complete(input('one'),{client_request_id:'one'});
  await new Promise(r=>setTimeout(r,0));
  const second=await complete(input('two'),{client_request_id:'two'});
  assert.equal(second.status,409);
  assert.equal(second.body.error.continuation.reason,'browser_busy');
  release();await first;
}));

test('after a crash, running state remains uncertain (never blind replay)',()=>withStore(async(store,dir)=>{
  const row=store.enqueue({key:'k1',hash:'h1',question:'Q'}).row;
  assert.equal(store.claim(row.id).ok,true);
  // A new process reconstructs local state from disk; interrupted delivery is unknown.
  const second=createChatgptLocalStore(join(dir,'jobs.sqlite'));
  try{
    assert.equal(second.get(row.id).status,'uncertain');
    let invoked=0;
    const complete=createChatgptOpenAiBridge({store:second,runTurn:async()=>{invoked++;return {answer:'bad'};}});
    const result=await complete(input('any'),{client_request_id:'new'});
    assert.equal(result.status,409);assert.equal(invoked,0);
  }finally{second.close();}
}));

test('browser runner reads new response without invoking MCP result submit',async()=>{
  const events=[];
  const runner=createChatgptBrowserTurnRunner({poll_ms:100,max_observations:2,sleep:async()=>{},
    invoke:async(action,key,args)=>{
      events.push(action);
      if(action==='ensure_tab')return {ok:true,observation:{tab_id:42}};
      if(action==='status')return {ok:true,observation:{stable_composer:true,composer_blank:true,generating:false}};
      if(action==='submit')return {ok:true,observation:{submitted:true,delivery_state:'ui_click_dispatched_not_model_result'}};
      if(action==='observe'&&key==='local_1234567890abcdef1234567890abcdef')
        return {ok:true,observation:{assistant_count:1,last_answer:'Old'}};
      return {ok:true,observation:{assistant_count:2,last_answer:'New',generating:false,stable_composer:true}};
    }});
  const v=await runner('hello',{request_id:'local_1234567890abcdef1234567890abcdef'});
  assert.equal(v.answer,'New');assert.deepEqual(events,['ensure_tab','status','observe','submit','observe']);
});

test('HTTP bearer, local status and buffered SSE',()=>withStore(async(store)=>{
  const complete=createChatgptOpenAiBridge({store,runTurn:async()=>({answer:'Bonjour'})});
  const server=createChatgptOpenAiCpsHttpServer({complete,key,localStatus:id=>store.get(id)});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
    const base='http://127.0.0.1:'+server.address().port;
    const unauthorized=await fetch(base+'/v1/chat/completions',{method:'POST',body:'{}'});
    assert.equal(unauthorized.status,401);
    const res=await fetch(base+'/v1/chat/completions',{method:'POST',headers:{
      'Content-Type':'application/json',Authorization:'Bearer '+key,
      'X-Client-Request-Id':'client-1'},body:JSON.stringify({...input('Bonjour'),stream:true})});
    assert.equal(res.status,200);
    const data=await res.text();assert.match(data,/Bonjour/);assert.match(data,/data: \[DONE\]/);
    const localId=store.enqueue({key:'client-1',hash:'different',question:'x'});
    assert.equal(localId.ok,false);
  }finally{await new Promise(r=>server.close(r));}
}));
