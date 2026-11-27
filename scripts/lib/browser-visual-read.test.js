import test from 'node:test';
import assert from 'node:assert/strict';
import {readLoadedImage,validateVisualRead} from './browser-visual-read.js';
import {attachTransientImage,takeTransientImage} from './mcp-transient-image.js';
import {normalizeJohnReadArguments} from './john-read-argument-gate.js';
import {mcpToolResult} from './cogentia-mcp-core.js';
const input={action:'image',browser_instance_id:'fixture',tab_id:42,expected_url:'https://fixture.test/post',image_name:'picture.png'};
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPm0AAAAASUVORK5CYII=';
function fake({changed=false,large=false}={}){
 const calls=[];let seen=0;
 return {calls,send:async(method,args)=>{
  calls.push(method);
  if(method==='Runtime.evaluate')return {result:{objectId:'object'}};
  if(method==='Runtime.callFunctionOn')return {result:{value:{url:'https://fixture.test/picture.png',width:changed&&++seen>1?2:1,height:1}}};
  if(method==='Page.enable')return {};
  if(method==='Page.getResourceContent')return {base64Encoded:true,content:large?'a'.repeat(1500000):png};
  if(method==='Runtime.releaseObjectGroup')return {};
  throw Error('unexpected '+method);
 }};
}
test('visual selector is bounded and cannot request arbitrary URL or other tab',()=>{
 assert.equal(validateVisualRead(input),true);
 assert.deepEqual(normalizeJohnReadArguments('browser.hosted.inspect',input),input);
 for(const patch of [{image_name:'https://x.test/a.png'},{image_name:'../picture.png'},{tab_id:0},{expected_url:'http://fixture.test'},{extra:'bad'},{browser_instance_id:undefined}])
  assert.equal(validateVisualRead({...input,...patch}),false);
});
test('binary handoff stays outside enumerable and structured JSON results',async()=>{
 const {send,calls}=fake();let image;
 const receipt=await readLoadedImage({send,frameTree:{frame:{id:'frame',url:input.expected_url}},input,onImage:v=>image=v});
 assert.equal(receipt.retention,'transient');assert.equal(image.data,png);
 assert.ok(!JSON.stringify(receipt).includes(png));assert.equal(calls.at(-1),'Runtime.releaseObjectGroup');
 const response=attachTransientImage({ok:true,receipt},image);
 assert.ok(!JSON.stringify(response).includes(png));
 assert.ok(!JSON.stringify(mcpToolResult(response)).includes(png));
 assert.equal(takeTransientImage(response).data,png);assert.equal(takeTransientImage(response),undefined);
});
test('changed node, oversized resource, wrong frame fail without delivering binary',async()=>{
 for(const opts of [{changed:true},{large:true},{}]){
  const {send,calls}=fake(opts);let delivered=false;
  await assert.rejects(()=>readLoadedImage({send,frameTree:{frame:{id:'frame',url:opts.changed||opts.large?input.expected_url:'https://other.test'}},input,onImage:()=>delivered=true}));
  assert.equal(delivered,false);
  if(opts.changed||opts.large)assert.equal(calls.at(-1),'Runtime.releaseObjectGroup');
 }
});
