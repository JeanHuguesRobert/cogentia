import test from 'node:test';
import assert from 'node:assert/strict';
import {executeBidiFrameEvaluate} from './browser-frame-bidi-evaluate.js';
const expectedUrl='https://parent.example/form',expectedOrigin='https://frame.example';
const root={context:'root',url:expectedUrl,children:[{context:'frame',url:expectedOrigin+'/input',children:[]}]};
function fixture({tree=root,lateRealm=false}={}){
 let effects=0;
 const send=async(method,params)=>{
  if(method==='browsingContext.getTree')return {contexts:[tree]};
  if(method==='script.getRealms')return {realms:[{realm:lateRealm?'different':'r1',context:'frame',sandbox:'cogentia-governed-evaluate'}]};
  assert.equal(method,'script.evaluate');
  if(params.target.context){assert.equal(params.target.context,'frame');return {type:'success',realm:'r1'}}
  assert.deepEqual(params.target,{realm:'r1'});effects++;
  return {type:'success',realm:'r1',result:{type:'string',value:'{"ok":true}'}};
 };
 return {send,effects:()=>effects};
}
const args={rootContext:'root',expectedUrl,frameId:'frame',expectedOrigin,scriptForUrl:url=>{
 assert.equal(url,expectedOrigin+'/input');return '({ok:true})';
}};
test('BiDi frame evaluation binds the child context and exact realm',async()=>{
 const f=fixture();
 assert.deepEqual(await executeBidiFrameEvaluate({...args,send:f.send}),{value:{ok:true},frameId:'frame',origin:expectedOrigin,realm:'r1'});
 assert.equal(f.effects(),1);
});
test('wrong root, frame or origin is rejected before script dispatch',async()=>{
 for(const patch of [{rootContext:'other'},{frameId:'root'},{frameId:'other'},{expectedOrigin:'https://elsewhere.example'}]){
  const f=fixture();
  await assert.rejects(()=>executeBidiFrameEvaluate({...args,...patch,send:f.send}));
  assert.equal(f.effects(),0);
 }
});
test('a changed realm after dispatch gives an unconfirmed result, never retry',async()=>{
 const f=fixture({lateRealm:true});
 await assert.rejects(()=>executeBidiFrameEvaluate({...args,send:f.send}),/bidi_frame_result_unconfirmed/);
 assert.equal(f.effects(),1);
});
