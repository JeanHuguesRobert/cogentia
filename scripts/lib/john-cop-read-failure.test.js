import test from 'node:test';import assert from 'node:assert/strict';
import {classifyJohnReadExecution} from './john-cop-read-failure.js';
test('cause is preserved only as a safe typed code, not sensitive detail',()=>{
 const events=[{type:'john.accounting.settled',data:{observed_steps:2}},{type:'john.run.failed',data:{data:{code:'capability_failed',handler_error:{code:'BROWSER_ACTION_NOT_ALLOWED',detail:'secret=NEVER'}}}}];
 const r=classifyJohnReadExecution(events);
 assert.deepEqual(r,{ok:false,error:'canonical_execution_failed',failure_code:'BROWSER_ACTION_NOT_ALLOWED'});
 assert.doesNotMatch(JSON.stringify(r),/NEVER/);
});
test('invalid request and missing terminal events are distinct',()=>{
 assert.equal(classifyJohnReadExecution([{type:'john.run.failed',data:{code:'invalid_request'}}]).failure_code,'invalid_request');
 assert.equal(classifyJohnReadExecution([{type:'john.accounting.settled'}]).error,'canonical_execution_receipt_unconfirmed');
 assert.equal(classifyJohnReadExecution([{type:'john.run.completed'}]).ok,true);
});
test('unsafe error strings are never exposed',()=>{
 const r=classifyJohnReadExecution([{type:'john.run.failed',data:{data:{code:'https://bank.example/?token=private'}}}]);
 assert.equal(r.failure_code,'handler_failed');
});
