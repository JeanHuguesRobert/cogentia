/** Ordinary browser completion. Uses an already-governed browser action transport.
 * No COP packet, continuation result submit, second scheduler or browser protocol.
 */
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const count=x=>Math.max(Number(x?.assistant_count)||0,
  Number(x?.transcript_assistant_count)||0);
const answer=x=>String(x?.last_answer||x?.transcript_answer||'').trim();

export function createChatgptBrowserTurnRunner({invoke,poll_ms=2500,max_observations=48,
  sleep=wait}={}){
  if(typeof invoke!=='function'||poll_ms<100||max_observations<1)
    throw Error('existing_governed_browser_transport_required');
  async function call(action,id,args){
    const result=await invoke(action,id,args);
    if(result?.ok!==true||result?.observation?.ok===false)
      throw Error('browser_'+action+'_failed');
    return result.observation;
  }
  return async function runTurn(question,{request_id}={}){
    if(typeof request_id!=='string'||!/^local_[a-f0-9]{32}$/.test(request_id)||
       typeof question!=='string'||question.length>4500)
      throw Error('invalid_local_browser_turn');
    const selected=await call('ensure_tab',request_id,{action:'ensure_tab'});
    const tab_id=selected.tab_id;
    if(!Number.isSafeInteger(tab_id)||tab_id<1)throw Error('chatgpt_tab_unavailable');
    const status=await call('status',request_id,{action:'status',tab_id});
    if(!status.stable_composer||!status.composer_blank||status.generating)
      throw Error('chatgpt_composer_busy');
    const baseline=await call('observe',request_id,{action:'observe',tab_id});
    const initialCount=count(baseline);
    const initialAnswer=answer(baseline);
    // The local job is marked "running" BEFORE this potentially irreversible
    // browser send; a process interruption must not blindly replay the send.
    const submitted=await call('submit',request_id,{action:'submit',tab_id,prompt:question});
    if(submitted.submitted!==true||
       submitted.delivery_state!=='ui_click_dispatched_not_model_result')
      throw Error('browser_delivery_unknown');
    for(let n=0;n<max_observations;n++){
      await sleep(poll_ms);
      const state=await call('observe',request_id+'_observe_'+n,{action:'observe',tab_id});
      const fresh=count(state)>initialCount ||
        (count(state)===0&&answer(state)&&answer(state)!==initialAnswer);
      if(fresh && state.generating===false && state.stable_composer===true && answer(state))
        return {answer:answer(state),tab_id,observed:true};
    }
    throw Error('browser_result_not_observed');
  };
}
