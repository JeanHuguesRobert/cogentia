import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createConversationLocalStore} from './lib/conversation-local-store.mjs';
import {createOpenAiConversationBridge} from './lib/openai-conversation-bridge.mjs';
import {createOpenAiConversationHttpServer} from './lib/chatgpt-openai-http.mjs';

test('ChatGPT and Claude adapter scopes share SQLite without shared scheduling locks',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'conversation-adapters-'));
  const path=join(dir,'state.sqlite');
  const a=createConversationLocalStore(path,{adapter:'chatgpt-browser'});
  const b=createConversationLocalStore(path,{adapter:'claude-browser'});
  try{
    const first=a.enqueue({key:'req1',hash:'hash1',question:'chat'});
    const second=b.enqueue({key:'req1',hash:'hash1',question:'claude'});
    assert.equal(first.ok,true);
    assert.equal(second.ok,true);
    assert.notEqual(first.row.id,second.row.id);
    assert.equal(a.claim(first.row.id).ok,true);
    assert.equal(b.claim(second.row.id).ok,true);
    assert.equal(a.get(second.row.id),null);
    assert.equal(b.claim(first.row.id).reason,'not_found');
    assert.equal(b.uncertain(first.row.id),null);
    a.finish(first.row.id,'A');
    b.finish(second.row.id,'B');
    assert.equal(a.get(first.row.id).answer,'A');
    assert.equal(b.get(second.row.id).answer,'B');
  }finally{a.close();b.close();rmSync(dir,{recursive:true,force:true})}
});

test('non-Cogentia conversational provider runs and defers recursion by adapter lineage',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'conversation-noncop-'));
  const store=createConversationLocalStore(join(dir,'state.sqlite'),{adapter:'grok-browser'});
  try{
    let invoked=0;
    const complete=createOpenAiConversationBridge({store,model:'grok-browser',
      lineageToken:'grok-browser',renderPrompt:parts=>'GROK '+JSON.stringify(parts),
      runTurn:async()=>{invoked++;return {answer:'Réponse générique'}}});
    const input={model:'grok-browser',messages:[{role:'user',content:'Salut'}]};
    const nested=await complete(input,{client_request_id:'nested',call_chain:'upstream,grok-browser'});
    assert.equal(nested.status,409);
    assert.equal(nested.body.error.continuation.reason,'recursive_call');
    assert.equal(invoked,0);
    const result=await complete(input,{client_request_id:'nested'});
    assert.equal(result.status,200);
    assert.equal(result.body.model,'grok-browser');
    assert.equal(result.body.choices[0].message.content,'Réponse générique');
    assert.equal(invoked,1);
  }finally{store.close();rmSync(dir,{recursive:true,force:true})}
});

test('provider-neutral HTTP endpoint serves another model without Cogentia',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'http-provider-noncop-'));
  const store=createConversationLocalStore(join(dir,'http.sqlite'),{adapter:'claude-browser'});
  const key='test-secret-for-claude-browser-adapter';
  const complete=createOpenAiConversationBridge({store,model:'claude-browser',
    lineageToken:'claude-browser',runTurn:async()=>({answer:'Claude answer'})});
  const server=createOpenAiConversationHttpServer({complete,key,model:'claude-browser',
    localStatus:id=>store.get(id)});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
    const url='http://127.0.0.1:'+server.address().port;
    const headers={Authorization:'Bearer '+key,'Content-Type':'application/json',
      'X-Client-Request-Id':'req-claude'};
    const listed=await fetch(url+'/v1/models',{headers});
    assert.equal((await listed.json()).data[0].id,'claude-browser');
    const request={model:'claude-browser',messages:[{role:'user',content:'Q'}]};
    const defer=await fetch(url+'/v1/chat/completions',{method:'POST',headers:{
      ...headers,'X-Continuation-Call-Chain':'client,claude-browser'
    },body:JSON.stringify(request)});
    assert.equal(defer.status,409);
    assert.equal((await defer.json()).error.code,'local_continuation_required');
    const finish=await fetch(url+'/v1/chat/completions',{method:'POST',headers,
      body:JSON.stringify(request)});
    assert.equal(finish.status,200);
    assert.equal((await finish.json()).choices[0].message.content,'Claude answer');
  }finally{
    await new Promise(r=>server.close(r));
    store.close();rmSync(dir,{recursive:true,force:true});
  }
});
