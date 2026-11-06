import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileAmbiguousEffect as reconcile} from './effect-outcome-reconciliation.js';
const target='github:JeanHuguesRobert/cogentia:issue:291';
const payload='## Verified report\nDOM structure read-only; no bank authentication performed.';
const observation={target,body:payload,id:6686737480,url:'https://github.com/JeanHuguesRobert/cogentia/issues/291#issuecomment-6686737480'};
const args={target,payload,observed:[observation]};
test('reported safety block after actual write is verified, never re-posted',()=>{
 const r=reconcile(args);
 assert.equal(r.status,'EFFECT_VERIFIED');assert.equal(r.retry_allowed,false);
 assert.equal(r.evidence[0].id,6686737480);
});
test('ambiguous, missing, incomplete and duplicate states never authorize blind retry',()=>{
 for(const patch of [
  {observed:[]},
  {observed:[{...observation,body:payload+' '} ]},
  {observed:[{...observation,target:'github:wrong'}]},
  {observed:[observation,{...observation,id:6686737481}]},
  {read_ok:false},
  {observation_complete:false},
  {target:null},
  {payload:''},
 ]) {
  const r=reconcile({...args,...patch});
  assert.equal(r.status,'OUTCOME_UNKNOWN',JSON.stringify(patch));
  assert.equal(r.retry_allowed,false);
 }
});
test('different issue and comment bodies do not cross-verify',()=>{
 assert.equal(reconcile({...args,target:'github:JeanHuguesRobert/cogentia:issue:299'}).status,'OUTCOME_UNKNOWN');
 assert.equal(reconcile({...args,payload:'another comment'}).status,'OUTCOME_UNKNOWN');
});
