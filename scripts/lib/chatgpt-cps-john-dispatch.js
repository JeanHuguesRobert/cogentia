/**
 * Thin authenticated MCP transport to the EXISTING John governed browser
 * capability. No new browser primitive, scheduler, provider or credential
 * broker. Call only AFTER a separate CPS mandate/channel/budget admission.
 * Never inspect assistant Output; successful UI click != MCP model result.
 */
const LOCAL_MCP='http://127.0.0.1:8791/mcp';
const validId=x=>typeof x==='string'&&/^ctn_[a-zA-Z0-9_]{3,120}$/.test(x);
const fail=code=>({ok:false,submitted:false,error:code});

export function createGovernedJohnBrowserAction({
  token,fetchImpl=globalThis.fetch,mcpUrl=LOCAL_MCP,
}={}){
  // Do not use a remote URL or an attacker-supplied MCP endpoint.
  if(mcpUrl!==LOCAL_MCP||typeof token!=='string'||!token||
     typeof fetchImpl!=='function')
    throw new TypeError('authenticated_local_john_browser_transport_required');
  async function invoke(action,continuation_id,argumentsValue,recovery_attempt=0){
    if(![0,1].includes(recovery_attempt))return fail('invalid_recovery_attempt');
    const suffix=recovery_attempt?'--recovery-1':'';
    const request_id=validId(continuation_id)
      ?`jhn-cps-${action}-${continuation_id}${suffix}`
      :`jhn-openai-${action}-${continuation_id}${suffix}`;
    if(!/^[a-zA-Z0-9_.:-]{1,120}$/.test(request_id))
      return fail('invalid_browser_request_id');
    const req={version:'john.request.v1',request_id,
      principal:{id:'principal:jhn'},mandate:{id:'mandate:chatgpt-corpus-coding',version:'1'},
      budget:{id:'budget:mandate:jhn:john-root'},
      capability:'browser.chatgpt.turn',exposure:'bounded',
      execution_budget:{max_steps:3,max_tool_calls:1,max_subagents:0,
        max_external_effects:0,max_internal_effects:1,max_elapsed_ms:30000},
      handler:{id:'governed.step_reasoner',kind:'governed_reasoner',
        allowed_capabilities:['browser.chatgpt.turn']},
      input:{prompt:action==='submit'?argumentsValue.prompt:
        'Vérifier seulement le composeur ChatGPT, ne soumettre aucun message.',
        arguments:argumentsValue},
    };
    let response;
    try{response=await fetchImpl(LOCAL_MCP,{method:'POST',
      signal:AbortSignal.timeout(35000),headers:{
        'Content-Type':'application/json',Authorization:'Bearer '+token,
        'X-Cogentia-Actor':'agent:jhn',
        'X-Cogentia-Mandate':'mandate:chatgpt-corpus-coding'},
      body:JSON.stringify({jsonrpc:'2.0',id:request_id,method:'tools/call',
        params:{name:'cogentia_john_run',arguments:{request:req}}})});}
    catch{return fail('john_transport_ambiguous')}
    if(!response?.ok)return fail('john_http_rejected');
    let json;
    try{json=await response.json()}
    catch{return fail('john_reply_unparseable')}
    const projected=json?.result?.structuredContent||json?.result;
    const data=projected?.data;
    if(projected?.ok!==true||data?.ok!==true||
       data?.canonical_accounting?.settled_steps==null)
      return fail('john_cop_receipt_missing');
    let observation;
    try{observation=JSON.parse(data.text||'{}')}
    catch{return fail('john_observation_unparseable')}
    return {ok:true,request_id,observation};
  }
  return invoke;
}
export function createCpsGovernedJohnBrowserDispatch({
  token,tab_id,fetchImpl=globalThis.fetch,mcpUrl=LOCAL_MCP,
}={}){
  if(tab_id!==undefined&&(!Number.isSafeInteger(tab_id)||tab_id<1))
    throw new TypeError('authenticated_local_john_browser_transport_required');
  const invoke=createGovernedJohnBrowserAction({token,fetchImpl,mcpUrl});
  return async function governedDispatch({continuation_id,prompt,recovery_attempt=0}={}){
    if(!validId(continuation_id)||![0,1].includes(recovery_attempt)||
       typeof prompt!=='string'||!prompt||prompt.length>6000)
      return fail('canonical_prompt_missing');
    // Non-extractive composer readiness observation. A failure cannot be used
    // to justify a blind second submission after a possibly ambiguous click.
    // No fixed tab identifier is required: the existing browser.chatgpt.turn
    // ensure_tab operation selects only an unmarked empty root tab or
    // creates a new one, under the same governed John/mandate channel.
    let targetTab=tab_id;
    if(targetTab===undefined){
      const selection=await invoke('ensure_tab',continuation_id,{action:'ensure_tab'},recovery_attempt);
      if(!selection.ok)return selection;
      targetTab=selection.observation.tab_id;
      if(!Number.isSafeInteger(targetTab)||targetTab<1)
        return fail('governed_tab_not_available');
    }
    const status=await invoke('status',continuation_id,{action:'status',tab_id:targetTab},recovery_attempt);
    if(!status.ok)return status;
    if(status.observation.stable_composer!==true||
       status.observation.composer_blank!==true||
       status.observation.generating!==false)
      return fail('composer_not_ready');
    const sent=await invoke('submit',continuation_id,{action:'submit',tab_id:targetTab,prompt},recovery_attempt);
    if(!sent.ok)return sent;
    if(sent.observation.submitted!==true||
       sent.observation.delivery_state!=='ui_click_dispatched_not_model_result')
      return fail('browser_dispatch_unconfirmed');
    return {ok:true,submitted:true,continuation_id,
      execution_receipt_ref:'john:'+sent.request_id};
  };
}
