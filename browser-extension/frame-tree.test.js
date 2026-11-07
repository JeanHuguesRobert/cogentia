import test from 'node:test';
import assert from 'node:assert/strict';
import {projectFrameTree} from './frame-tree.js';
test('frame projection preserves opaque IDs and origins, hides page URLs and query secrets',()=>{
 const r=projectFrameTree({frame:{id:'top_12',url:'https://bank.example/private?token=NO_LEAK'},childFrames:[
  {frame:{id:'sub_9',url:'https://login.bank.example/auth?secret=NO_LEAK2',securityOrigin:'https://login.bank.example'}},
  {frame:{id:'frame2',url:'about:blank'}}
 ]});
 assert.equal(r.frame_count,3);
 assert.equal(r.contains_cross_origin_frames,true);
 assert.deepEqual(r.frames[1],{frame_id:'sub_9',parent_frame_id:'top_12',depth:1,origin:'https://login.bank.example',is_top_level:false});
 assert.doesNotMatch(JSON.stringify(r),/NO_LEAK|\/private|\/auth|secret|token/);
});
test('reject duplicate or suspicious frame id, bounded count',()=>{
 assert.throws(()=>projectFrameTree({frame:{id:'bad id',url:'https://x.test'}}),/invalid/);
 assert.throws(()=>projectFrameTree({frame:{id:'same'},childFrames:[{frame:{id:'same'}}]}),/invalid/);
 const r=projectFrameTree({frame:{id:'top'},childFrames:Array.from({length:40},(_,i)=>({frame:{id:'f'+i}}))},4);
 assert.equal(r.truncated,true);assert.equal(r.frames.length,4);
});
