import test from 'node:test';import assert from 'node:assert/strict';
import {executeFrameEvaluate} from './browser-frame-evaluate.js';
const frameTree={frame:{id:'root',url:'https://parent.example'},childFrames:[{frame:{id:'child',url:'https://child.example/form'}}]};
test('generic CDP executor selects independent frame context and accepts library JS',async()=>{
 const calls=[];
 const send=async (method,params)=>{
  calls.push({method,params});
  if(method==='Page.getFrameTree')return {frameTree};
  if(method==='Page.createIsolatedWorld')return {executionContextId:17};
  if(method==='Runtime.evaluate')return {result:{value:{ok:true}}};
 };
 const result=await executeFrameEvaluate({send,frameId:'child',expectedOrigin:'https://child.example',script:'(()=>({ok:true}))()'});
 assert.equal(result.value.ok,true);
 assert.deepEqual(calls.map(x=>x.method),['Page.getFrameTree','Page.createIsolatedWorld','Page.getFrameTree','Runtime.evaluate']);
 assert.equal(calls.at(-1).params.contextId,17);
});
test('frame mismatch must deny before arbitrary script executes',async()=>{
 const calls=[];const send=async method=>{calls.push(method);return {frameTree}};
 await assert.rejects(()=>executeFrameEvaluate({send,frameId:'child',expectedOrigin:'https://wrong.example',script:'danger()'}),/mismatch/);
 assert.deepEqual(calls,['Page.getFrameTree']);
});
test('frame navigation between initial check and evaluation fails closed',async()=>{
 let n=0;const calls=[];
 const send=async (method)=>{calls.push(method);if(method==='Page.getFrameTree'){
  n++;return {frameTree:n===1?frameTree:{frame:{id:'root',url:'https://parent.example'},childFrames:[{frame:{id:'child',url:'https://wrong.example'}}]}};
 }if(method==='Page.createIsolatedWorld')return {executionContextId:17};};
 await assert.rejects(()=>executeFrameEvaluate({send,frameId:'child',expectedOrigin:'https://child.example',script:'danger()'}),/mismatch/);
 assert.ok(!calls.includes('Runtime.evaluate'));
});
