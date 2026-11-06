import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigationGateway} from '../ops/navigation-assistant-gateway.js';
import {WebSocket} from 'ws';
import {createHostedBrowserCapabilities} from './hosted-browser-capabilities.js';
import {SAFE_DOM_STRUCTURE_CODE} from './browser-safe-dom-structure.js';

test('fixed read-only structure omits passwords, user input, private text and links',async()=>{
 const gateway=createNavigationGateway({instance:'safe-structure-fixture'});
 await gateway.listen(0,['127.0.0.1']);
 const endpoint=`ws://127.0.0.1:${gateway._bound[0].address().port}/assistant`;
 let extension;
 try {
  extension=new WebSocket(endpoint.replace('/assistant','/extension'));
  await new Promise((resolve,reject)=>{extension.once('open',resolve);extension.once('error',reject)});
  extension.send(JSON.stringify({jsonrpc:'2.0',method:'browser.register',params:{browser_instance_id:'fracta2-hosted'}}));
  extension.on('message', data=>{
   const req=JSON.parse(data.toString());
   if(req.method!=='page.evaluate')return;
   assert.equal(req.params.tabId,51);
   assert.equal(req.params.code,SAFE_DOM_STRUCTURE_CODE);
   assert.ok(!req.params.code.includes('.value'));
   const response={jsonrpc:'2.0',id:req.id,result:{tab:{id:51,title:'Login',url:'https://bank.example.test/path?secret=DELIBERATELY_PRIVATE'},value:{title:'Login',origin:'https://bank.example.test',forms:1,total_fields:2,frames:0,truncated:false,fields:[{tag:'input',type:'password',required:true,autocomplete:'current-password',value:'DO_NOT_LEAK',name:'secret_name',placeholder:'DO_NOT_LEAK',outerHTML:'DO_NOT_LEAK'},{tag:'button',value:'DO_NOT_LEAK'}],secret:'DO_NOT_LEAK'}}};
   extension.send(JSON.stringify(response));
  });
  const cap=createHostedBrowserCapabilities({gateway:endpoint}).find(c=>c.name==='browser.hosted.inspect');
  assert.equal(cap.risk,'read_only');
  assert.ok(cap.inputSchema.properties.action.enum.includes('structure'));
  await assert.rejects(()=>cap.execute({action:'structure'}),e=>e.code==='BROWSER_TAB_ID_INVALID');
  const r=await cap.execute({action:'structure',tab_id:51});
  assert.equal(r.forms,1);
  assert.equal(r.fields[0].type,'password');
  assert.equal(r.fields[0].autocomplete,'current-password');
  assert.equal(r.fields[0].value,undefined);
  assert.ok(!JSON.stringify(r).includes('DO_NOT_LEAK'));
  assert.ok(!JSON.stringify(r).includes('/path?secret='));
  assert.equal(r.tab.url,'https://bank.example.test');
 }finally{extension?.close();await gateway.close()}
});
