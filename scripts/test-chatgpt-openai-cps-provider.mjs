import test from 'node:test';
import assert from 'node:assert/strict';
import {createChatgptOpenAiBridge,normalizeOpenAiRequest,inspectCanonicalChatgptResult}
  from './lib/chatgpt-openai-cps-bridge.mjs';
import {createChatgptOpenAiCpsHttpServer} from './lib/chatgpt-openai-cps-http.mjs';
const key='long-test-only-secret-do-not-use-in-production';

test('bounded text messages; unsupported features fail explicitly',()=>{
  assert.equal(normalizeOpenAiRequest({messages:[{role:'user',content:'bonjour'}]}).ok,true);
  assert.equal(normalizeOpenAiRequest({messages:[{role:'user',content:'x'.repeat(4000)}]}).error,
    'browser_prompt_too_long');
  assert.equal(normalizeOpenAiRequest({messages:[{role:'user',content:'hi'}],
    tools:[{type:'function'}]}).error,'feature_unsupported_on_browser_provider');
  assert.equal(normalizeOpenAiRequest({model:'unknown',messages:[{role:'user',content:'bonjour'}]}).error,
    'model_unsupported');
  assert.equal(normalizeOpenAiRequest({prompt:'hello',stream:true},{legacy:true}).error,
    'legacy_stream_unsupported');
});

test('accepts only canonical returned MCP event',()=>{
  const store={listTopic:()=>[{payload:{profile:'cop.continuation-result/v1',phase:'returned',
    continuation_id:'ctn_x',candidate_result:{status:'answered',result:{answer:'Salut',packet_status:'completed'}}},
    idempotency_key:'returned-1'}]};
  assert.equal(inspectCanonicalChatgptResult(store,'ctn_x').answer,'Salut');
  assert.equal(inspectCanonicalChatgptResult({listTopic:()=>[]},'ctn_x').state,'pending');
  assert.equal(inspectCanonicalChatgptResult({listTopic:()=>[{payload:{
    profile:'cop.continuation-result/v1',phase:'observed',continuation_id:'ctn_x',
    candidate_result:{status:'answered',result:{answer:'INVALID'}}}}]},'ctn_x').state,'pending');
});

test('round-trip returns OpenAI completion while preserving parent packet status',async()=>{
  let question;
  const b=createChatgptOpenAiBridge({providerKey:key,
    assign:async v=>{question=v.question;return {ok:true,continuation_id:'ctn_test'};},
    inspect:async()=>({state:'answered',answer:'Réponse',packet_status:'continue',
      receipt_ref:'cop:receipt:1'})});
  const v=await b({model:'chatgpt-browser',messages:[{role:'user',content:'Pourquoi ?'}]});
  assert.match(question,/Pourquoi/);
  assert.equal(v.status,200);
  assert.equal(v.body.choices[0].message.content,'Réponse');
  assert.equal(v.body._cps.packet_status,'continue');
  assert.equal(v.body.usage,null);
});

test('timeout reports ambiguous pending result, never success',async()=>{
  const b=createChatgptOpenAiBridge({providerKey:key,
    assign:async()=>({ok:true,continuation_id:'ctn_pending'}),
    inspect:async()=>({state:'pending'}),timeout_ms:1000,poll_ms:50,
    now:(()=>{let t=0;return ()=>t+=200;})(),sleep:async()=>{}});
  const v=await b({messages:[{role:'user',content:'Long job'}]});
  assert.equal(v.status,504);
  assert.equal(v.body.error.code,'cps_result_pending');
  assert.equal(v.body.error.continuation_id,'ctn_pending');
});

test('retries with identical client request IDs get same durable assignment ref',async()=>{
  const refs=[];
  const b=createChatgptOpenAiBridge({providerKey:key,
    assign:async v=>{refs.push(v.task_ref);return {ok:true,continuation_id:'ctn_same'};},
    inspect:async()=>({state:'answered',answer:'OK'})});
  const req={messages:[{role:'user',content:'test'}]};
  await b(req,{client_request_id:'request-123'});
  await b(req,{client_request_id:'request-123'});
  assert.equal(refs[0],refs[1]);
});

test('authenticated HTTP returns buffered SSE after correlated completion',async()=>{
  const complete=async()=>({status:200,body:{id:'id1',object:'chat.completion',
    created:12,model:'chatgpt-browser',
    choices:[{index:0,message:{role:'assistant',content:'Bonjour'},finish_reason:'stop'}]}});
  const srv=createChatgptOpenAiCpsHttpServer({complete,key});
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));
  try{
    const url='http://127.0.0.1:'+srv.address().port+'/v1/chat/completions';
    const denied=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
    assert.equal(denied.status,401);
    const reply=await fetch(url,{method:'POST',
      headers:{'content-type':'application/json',authorization:'Bearer '+key},
      body:JSON.stringify({messages:[{role:'user',content:'Bonjour'}],stream:true})});
    assert.equal(reply.status,200);
    assert.match(reply.headers.get('content-type'),/text\/event-stream/);
    const txt=await reply.text();
    assert.match(txt,/Bonjour/);
    assert.match(txt,/data: \[DONE\]/);
  }finally{await new Promise(r=>srv.close(r));}
});

test('HTTP forwards client idempotency reference into canonical bridge',async()=>{
  let observed=null;
  const srv=createChatgptOpenAiCpsHttpServer({
    complete:async (_b,opts)=>{observed=opts.client_request_id;return {status:504,body:{
      error:{type:'server_error',code:'cps_result_pending'}}};},key});
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));
  try{
    const response=await fetch('http://127.0.0.1:'+srv.address().port+'/v1/chat/completions',
      {method:'POST',headers:{authorization:'Bearer '+key,'x-client-request-id':'retry-12',
        'content-type':'application/json'},
      body:JSON.stringify({messages:[{role:'user',content:'x'}]})});
    assert.equal(response.status,504);
    assert.equal(observed,'retry-12');
  }finally{await new Promise(r=>srv.close(r));}
});
