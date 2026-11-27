import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import {createNavigationGateway} from '../ops/navigation-assistant-gateway.js';
import {createHostedBrowserCapabilities} from './hosted-browser-capabilities.js';
import {validElementTarget,compileUidStructure} from './browser-element-target.js';
import {compileNonSecretFormFill} from './browser-form-script.js';

const epoch='a'.repeat(32),url='https://example.org/form';
const target={browser_instance_id:'fracta2-hosted',tab_id:42,frame_id:'top',document_epoch:epoch,uid:epoch+':1'};
test('UID target compiler requires exact identity and never uses ordinal fallback',()=>{
 assert.equal(validElementTarget(target),true);
 assert.equal(validElementTarget({...target,uid:'b'.repeat(32)+':1'}),false);
 const args={elementTarget:target,expectedUrl:url,text:'example'};
 const script=compileNonSecretFormFill(args);
 assert.ok(script.includes('resolveElementUid'));
 assert.ok(!script.includes('querySelectorAll'));
 assert.throws(()=>compileNonSecretFormFill({...args,fieldIndex:0}));
 assert.throws(()=>compileNonSecretFormFill({...args,iframeIndex:0,expectedFrameOrigin:'https://example.org'}));
 assert.throws(()=>compileNonSecretFormFill({...args,expectedUrl:'http://127.0.0.1:1234/probe'}));
 assert.ok(compileUidStructure(url).length<16000);
});
test('existing inspect and form capabilities exchange UID target and redacted receipt through gateway',async()=>{
 const gate=createNavigationGateway({instance:'uid-form-fixture'});
 await gate.listen(0,['127.0.0.1']);
 const base='ws://127.0.0.1:'+gate._bound[0].address().port;
 let ext,mode='inspect',calls=0;
 try{
  ext=new WebSocket(base+'/extension');
  await new Promise((yes,no)=>{ext.once('open',yes);ext.once('error',no)});
  ext.send(JSON.stringify({jsonrpc:'2.0',id:1,method:'browser.register',params:{browser_instance_id:'fracta2-hosted'}}));
  await new Promise(yes=>ext.once('message',yes));
  ext.on('message',data=>{
   const req=JSON.parse(String(data));assert.equal(req.method,'page.evaluate');
   assert.equal(req.params.tabId,42);assert.equal(req.params.expectedUrl,url);calls++;
   let value;
   if(mode==='inspect'){
    assert.equal(req.params.code,compileUidStructure(url));
    value={fields:[{tag:'input',type:'text',value:'PRIVATE'}],element_uids:[target.uid],document_epoch:epoch};
   }else{
    assert.ok(req.params.code.includes('resolveElementUid'));
    value=mode==='stale'?{ok:false,reason:'element_uid_stale'}:
     {ok:true,submitted:false,insertedLength:7,uid:mode==='wrong-receipt'?epoch+':2':target.uid,document_epoch:epoch};
   }
   ext.send(JSON.stringify({jsonrpc:'2.0',id:req.id,result:{tab:{id:42,url},value}}));
  });
  const caps=createHostedBrowserCapabilities({gateway:base+'/assistant'});
  const inspect=caps.find(c=>c.name==='browser.hosted.inspect');
  const fill=caps.find(c=>c.name==='browser.form.fill');
  const read=await inspect.execute({action:'structure',tab_id:42,expected_url:url,include_element_identity:true});
  assert.deepEqual(read.fields[0].element_target,target);
  assert.ok(!JSON.stringify(read).includes('PRIVATE'));
  const args={tab_id:42,expected_url:url,element_target:target,text:'example'};
  mode='fill';
  assert.deepEqual(await fill.execute(args),{ok:true,inserted_length:7,tab_id:42,element_target:target,submitted:false});
  await assert.rejects(()=>fill.execute({...args,field_index:0}),e=>e.code==='BROWSER_ELEMENT_TARGET_INVALID');
  await assert.rejects(()=>fill.execute({...args,element_target:{...target,browser_instance_id:'other'}}),e=>e.code==='BROWSER_ELEMENT_TARGET_INVALID');
  assert.equal(calls,2);
  mode='stale';
  await assert.rejects(()=>fill.execute(args),e=>e.code==='BROWSER_ELEMENT_TARGET_STALE');
  mode='wrong-receipt';
  await assert.rejects(()=>fill.execute(args),e=>e.code==='BROWSER_FORM_INSERTION_UNCONFIRMED');
  assert.equal(calls,4);
 }finally{ext?.close();await gate.close()}
});

test('non-default instance is never silently replaced by the configured browser',async()=>{
 const gate=createNavigationGateway({instance:'missing-provider-fixture'});
 await gate.listen(0,['127.0.0.1']);
 try{
  const caps=createHostedBrowserCapabilities({gateway:'ws://127.0.0.1:'+gate._bound[0].address().port+'/assistant'});
  const inspect=caps.find(c=>c.name==='browser.hosted.inspect'),fill=caps.find(c=>c.name==='browser.form.fill');
  const browser_instance_id='missing-firefox';
  await assert.rejects(()=>inspect.execute({action:'tabs',browser_instance_id}),e=>e.code==='BROWSER_INSTANCE_UNSUPPORTED');
  await assert.rejects(()=>fill.execute({browser_instance_id,tab_id:42,expected_url:url,text:'test',
    element_target:{...target,browser_instance_id}}),e=>e.code==='BROWSER_INSTANCE_UNSUPPORTED');
 }finally{await gate.close()}
});
