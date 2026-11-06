import test from 'node:test';import assert from 'node:assert/strict';
import {decideFractaExecutionRoute as decide} from './fracta-execution-route.js';
test('unprivileged code path works without asking principal',()=>{
 assert.equal(decide({normal:{reachable:true}}).route,'normal');
});
test('NoNewPrivs with broker means discover authority rather than ask for sudo',()=>{
 const state=decide({requires_root:true,normal:{reachable:true,sudo_allowed:false,no_new_privs:true},super_broker:{reachable:true}});
 assert.equal(state.route,'super_prepare');assert.equal(state.executable,false);
});
test('broker is not permission; only exact verified funded grant permits super',()=>{
 const basis={requires_root:true,super_broker:{reachable:true}};
 for(const missing of ['issuer_verified','payload_bound','budget_reserved','not_expired']){
  const grant={issuer_verified:true,payload_bound:true,budget_reserved:true,not_expired:true,[missing]:false};
  assert.equal(decide({...basis,grant}).executable,false);
 }
 assert.equal(decide({...basis,grant:{issuer_verified:true,payload_bound:true,budget_reserved:true,not_expired:true}}).route,'super');
});
test('independent signature remains a principal-only action',()=>{
 assert.equal(decide({principal_signature_required:true,normal:{reachable:true},super_broker:{reachable:true}}).route,'principal_signature');
});
