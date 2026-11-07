/** #299 failure classifier for already settled canonical reads. No secret text. */
export function classifyJohnReadExecution(events){
 if(!Array.isArray(events))return {ok:false,error:'canonical_execution_receipt_unconfirmed'};
 const failed=events.find(e=>e?.type==='john.run.failed');
 if(failed){
  const cause=failed.data?.data?.handler_error?.code||failed.data?.data?.code||failed.data?.code;
  return {ok:false,error:'canonical_execution_failed',
    failure_code:typeof cause==='string'&&/^[A-Za-z][A-Za-z0-9_]{0,80}$/.test(cause)?cause:'handler_failed'};
 }
 if(!events.some(e=>e?.type==='john.run.completed'))return {ok:false,error:'canonical_execution_receipt_unconfirmed'};
 return {ok:true};
}
