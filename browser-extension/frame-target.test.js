import test from 'node:test';import assert from 'node:assert/strict';
import {verifyFrameTarget} from './frame-target.js';
const tree={frame:{id:'top',url:'https://bank.example/page'},childFrames:[{frame:{id:'loginFrame',url:'https://login.bank.example/secure?token=PRIVATE'}}]};
test('explicit frame selector rejects stale origin, unknown IDs and root substitution',()=>{
 assert.deepEqual(verifyFrameTarget(tree,{frameId:'loginFrame',expectedOrigin:'https://login.bank.example'}),{frameId:'loginFrame',origin:'https://login.bank.example'});
 for(const args of [{frameId:'missing',expectedOrigin:'https://login.bank.example'},
  {frameId:'loginFrame',expectedOrigin:'https://bank.example'},
  {frameId:'loginFrame',expectedOrigin:'https://login.bank.example/secure'},
  {frameId:'loginFrame',expectedOrigin:'http://login.bank.example'}]){
   assert.throws(()=>verifyFrameTarget(tree,args));
  }
});
