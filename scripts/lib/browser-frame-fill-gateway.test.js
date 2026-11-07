import test from 'node:test';import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {createNavigationGateway} from '../ops/navigation-assistant-gateway.js';
import {createHostedBrowserCapabilities} from './hosted-browser-capabilities.js';
test('frame-specific nonsecret fill has pinned tab, frame and origin and redacted receipt',async()=>{
 const gate=createNavigationGateway({instance:'frame-fill-test'});await gate.listen(0,['127.0.0.1']);
 const url=`ws://127.0.0.1:${gate._bound[0].address().port}`;let ext;
 try{
  ext=new WebSocket(url+'/extension');await new Promise((a,b)=>{ext.once('open',a);ext.once('error',b)});
  ext.send(JSON.stringify({jsonrpc:'2.0',method:'browser.register',params:{browser_instance_id:'fracta2-hosted'}}));
  let calls=0;
  ext.on('message',raw=>{const req=JSON.parse(String(raw));if(req.method!=='page.form.fill')return;
   calls++;
   assert.equal(req.params.tabId,42);assert.equal(req.params.frameId,'frame_1');
   assert.equal(req.params.expectedFrameOrigin,'https://frame.example');
   assert.equal(req.params.text,'fictional-fixture');
   ext.send(JSON.stringify({jsonrpc:'2.0',id:req.id,result:{ok:true,insertedLength:17,tabId:42,fieldIndex:0,frameId:'frame_1',submitted:false}}));
  });
  const cap=createHostedBrowserCapabilities({gateway:url+'/assistant'}).find(x=>x.name==='browser.form.fill');
  const input={tab_id:42,field_index:0,expected_url:'https://parent.example',frame_id:'frame_1',expected_frame_origin:'https://frame.example',text:'fictional-fixture'};
  const result=await cap.execute(input);
  assert.equal(result.submitted,false);assert.equal(result.inserted_length,17);
  assert.doesNotMatch(JSON.stringify(result),/fictional-fixture/);
  await assert.rejects(()=>cap.execute({...input,expected_frame_origin:'https://frame.example/evil'}),e=>e.code==='BROWSER_FORM_FRAME_INVALID');
  assert.equal(calls,1);
 }finally{ext?.close();await gate.close()}
});
