import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {createNavigationGateway} from '../ops/navigation-assistant-gateway.js';
import {createHostedBrowserCapabilities} from './hosted-browser-capabilities.js';
test('frame metadata uses explicit tab and URL, no secrets or HTML',async()=>{
 const gate=createNavigationGateway({instance:'frames-fixture'});await gate.listen(0,['127.0.0.1']);
 const url=`ws://127.0.0.1:${gate._bound[0].address().port}`;let ext;
 try{
  ext=new WebSocket(url+'/extension');
  await new Promise((yes,no)=>{ext.once('open',yes);ext.once('error',no)});
  ext.send(JSON.stringify({jsonrpc:'2.0',method:'browser.register',params:{browser_instance_id:'fracta2-hosted'}}));
  const seen=[];
  ext.on('message',raw=>{
   const req=JSON.parse(String(raw));seen.push(req.method);
   if(req.method==='page.evaluate'){
    assert.equal(req.params.tabId,42);
    assert.ok(!req.params.code.includes('Input.insertText'));
    ext.send(JSON.stringify({jsonrpc:'2.0',id:req.id,result:{value:{origin:'https://bank.example',frames:[
      {iframe_index:0,origin:'https://auth.bank.example',same_origin:false}
    ]},tab:{id:42,url:'https://bank.example/login'}}}));
   }
  });
  const cap=createHostedBrowserCapabilities({gateway:url+'/assistant'}).find(x=>x.name==='browser.hosted.inspect');
  const out=await cap.execute({action:'frames',tab_id:42});
  assert.deepEqual(seen,['page.evaluate']);
  assert.equal(out.frame_identity,'dom_index_not_cdp_frame_id');
  assert.equal(out.frames[0].origin,'https://auth.bank.example');
  assert.doesNotMatch(JSON.stringify(out),/SENSITIVE|session=|Bank login/);
 }finally{ext?.close();await gate.close()}
});
