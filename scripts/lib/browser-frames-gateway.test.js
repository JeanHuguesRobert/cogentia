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
   if(req.method==='tabs.list')ext.send(JSON.stringify({jsonrpc:'2.0',id:req.id,result:{tabs:[{id:42,url:'https://bank.example/login?session=SENSITIVE',title:'Bank login'}]}}));
   if(req.method==='page.frames.list'){
    assert.equal(req.params.tabId,42);assert.equal(req.params.expectedUrl,'https://bank.example/login?session=SENSITIVE');
    ext.send(JSON.stringify({jsonrpc:'2.0',id:req.id,result:{tab_id:42,frame_count:2,truncated:false,contains_cross_origin_frames:true,frames:[
      {frame_id:'top',parent_frame_id:null,depth:0,is_top_level:true,origin:'https://bank.example'},
      {frame_id:'login',parent_frame_id:'top',depth:1,is_top_level:false,origin:'https://auth.bank.example'}
    ]}}));
   }
  });
  const cap=createHostedBrowserCapabilities({gateway:url+'/assistant'}).find(x=>x.name==='browser.hosted.inspect');
  const out=await cap.execute({action:'frames',tab_id:42});
  assert.deepEqual(seen,['tabs.list','page.frames.list']);
  assert.equal(out.frames[1].frame_id,'login');
  assert.equal(out.frames[1].origin,'https://auth.bank.example');
  assert.doesNotMatch(JSON.stringify(out),/SENSITIVE|session=|Bank login/);
 }finally{ext?.close();await gate.close()}
});
