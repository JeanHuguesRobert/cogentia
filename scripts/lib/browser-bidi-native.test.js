import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTextAllowed,insertBidiNativeText,selectBidiFile} from './browser-bidi-native.js';
const context='root',expectedUrl='https://example.org/form';
test('native text excludes control/special keys and bounds Unicode input',async()=>{
 assert.equal(nativeTextAllowed('Corte été — à'),true);
 for(const text of ['', 'a\n', '\uE007','\u0000','\ud800','e\u0301','a'.repeat(129)]){
  assert.equal(nativeTextAllowed(text),false);
  await assert.rejects(()=>insertBidiNativeText({context,expectedUrl,text,send:()=>assert.fail('no dispatch')}));
 }
});
test('native typing aborts before next key after focus change, no replay',async()=>{
 const calls=[];let checks=0;
 const send=async(method,params)=>{
  calls.push(method);
  if(method==='browsingContext.getTree')return {contexts:[{context,url:expectedUrl}]};
  if(method==='script.getRealms')return {realms:[{realm:'r',context}]};
  if(method==='script.evaluate')return {type:'success',realm:'r',result:{type:'object',handle:'h'}};
  if(method==='script.callFunction')return {type:'success',realm:'r',result:{type:'boolean',value:++checks===1}};
  if(method==='input.performActions'){
   assert.deepEqual(params.actions[0].actions,[{type:'keyDown',value:'A'},{type:'keyUp',value:'A'}]);return {};
  }
  if(method==='script.disown')return {};
  assert.fail(method);
 };
 await assert.rejects(()=>insertBidiNativeText({send,context,expectedUrl,text:'AB'}),e=>e.code==='BROWSER_BIDI_NATIVE_FOCUS_CHANGED');
 assert.equal(calls.filter(m=>m==='input.performActions').length,1);
 assert.equal(calls.at(-1),'script.disown');
});
test('file selection binds native node and verifies same realm; failure is not replayed',async()=>{
 let count=0,checks=0;
 const send=async(method,params)=>{
  if(method==='browsingContext.getTree')return {contexts:[{context,url:expectedUrl}]};
  if(method==='script.getRealms')return {realms:[{realm:'r',context}]};
  if(method==='script.evaluate')return {type:'success',realm:'r',result:{type:'node',sharedId:'node'}};
  if(method==='script.callFunction'){
   assert.deepEqual(params.arguments,[{sharedId:'node'}]);
   return {type:'success',realm:'r',result:{value:++checks===1}};
  }
  if(method==='input.setFiles'){
   count++;assert.deepEqual(params,{context,element:{sharedId:'node'},files:['/fixture/sample']});return {};
  }
  assert.fail(method);
 };
 await assert.rejects(()=>selectBidiFile({send,context,expectedUrl,fileIndex:0,file:{resolved:'/fixture/sample',bytes:4}}),e=>e.code==='BROWSER_UPLOAD_BROWSER_FILE_UNVERIFIED');
 assert.equal(count,1);
});
