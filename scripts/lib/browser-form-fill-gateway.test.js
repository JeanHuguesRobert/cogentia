import test from 'node:test';import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {createNavigationGateway} from '../ops/navigation-assistant-gateway.js';
import {createHostedBrowserCapabilities} from './hosted-browser-capabilities.js';
test('generic form fill goes through one scoped gateway RPC with redacted receipt',async()=>{
 const gate=createNavigationGateway({instance:'form-fill-fixture'});await gate.listen(0,['127.0.0.1']);
 const url=`ws://127.0.0.1:${gate._bound[0].address().port}`;let ext;
 try{
  ext=new WebSocket(url+'/extension');await new Promise((yes,no)=>{ext.once('open',yes);ext.once('error',no)});
  ext.send(JSON.stringify({jsonrpc:'2.0',method:'browser.register',params:{browser_instance_id:'fracta2-hosted'}}));
  let calls=0;
  ext.on('message',raw=>{const req=JSON.parse(String(raw));if(req.method!=='page.form.fill')return;
   calls++;assert.equal(req.params.tabId,42);assert.equal(req.params.expectedUrl,'https://example.org/form');
   assert.equal(req.params.fieldIndex,0);assert.equal(req.params.text,'Example text');
   ext.send(JSON.stringify({jsonrpc:'2.0',id:req.id,result:{ok:true,insertedLength:12,tabId:42,fieldIndex:0,submitted:false}}));
  });
  const cap=createHostedBrowserCapabilities({gateway:url+'/assistant'}).find(x=>x.name==='browser.form.fill');
  const response=await cap.execute({tab_id:42,field_index:0,expected_url:'https://example.org/form',text:'Example text'});
  assert.deepEqual(response,{ok:true,inserted_length:12,tab_id:42,field_index:0,submitted:false});
  assert.equal(calls,1);assert.ok(!JSON.stringify(response).includes('Example text'));
  await assert.rejects(()=>cap.execute({tab_id:42,field_index:0,expected_url:'http://example.org',text:'Example text'}),e=>e.code==='BROWSER_FORM_INPUT_INVALID');
  assert.equal(calls,1);
 }finally{ext?.close();await gate.close()}
});
