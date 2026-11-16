import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createConversationLocalStore} from './lib/conversation-local-store.mjs';
import {createOpenAiConversationBridge} from './lib/openai-conversation-bridge.mjs';

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
