/**
 * Experimental Core recipe for a Worker already installed on a controlled page.
 * Uses the existing gateway session/lease, never creates one or grants authority.
 * The caller must independently admit every RPC and own the COP task claim.
 * A tab lease is not a distributed Worker claim; copied checkpoints may coexist.
 */
export function bindBrowserWorkerContext({session,browserId,expectedUrl,workerId,maxCandidates=32}={}){
  if(typeof session?.call!=='function'||typeof session?.withTabLease!=='function'||
     typeof browserId!=='string'||!browserId||browserId.length>200||
     typeof workerId!=='string'||!workerId||workerId.length>200||
     typeof expectedUrl!=='string'||expectedUrl.length>4096||
     !Number.isSafeInteger(maxCandidates)||maxCandidates<1||maxCandidates>100)
    throw Error('worker_context_invalid');
  let url;
  try{url=new URL(expectedUrl)}catch{throw Error('worker_url_invalid')}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)
    throw Error('worker_url_invalid');
  const scope={browser_instance_id:browserId};
  async function evaluate(peer,tabId,code){
    const reply=await peer.call('page.evaluate',{...scope,tabId,expectedUrl,code});
    if(reply?.tab?.id!==tabId||reply?.tab?.url!==expectedUrl)
      throw Error('worker_target_receipt_mismatch');
    return reply.value;
  }
  async function locate(){
    const inventory=await session.call('tabs.list',scope);
    if(!Array.isArray(inventory?.tabs))throw Error('worker_inventory_invalid');
    const candidates=inventory.tabs.filter(t=>t.url===expectedUrl);
    if(candidates.length>maxCandidates)throw Error('worker_discovery_budget_exceeded');
    const matches=[];
    for(const tab of candidates){
      if(!Number.isSafeInteger(tab.id)||tab.id<1)throw Error('worker_tab_invalid');
      if(await evaluate(session,tab.id,'globalThis.worker?.id ?? null')===workerId)
        matches.push(tab.id);
    }
    if(matches.length!==1)throw Error('worker_identity_absent_or_ambiguous');
    return {browserId,tabId:matches[0],workerId};
  }
  async function invoke({tabId,method,args=[]}={}){
    if(!Number.isSafeInteger(tabId)||tabId<1||
       !['snapshot','assign','step'].includes(method)||!Array.isArray(args)||args.length>1)
      throw Error('worker_invocation_invalid');
    if((method==='snapshot'&&args.length!==0)||(method==='assign'&&args.length!==1))
      throw Error('worker_invocation_invalid');
    const serialized=JSON.stringify(args);
    if(serialized.length>12000)throw Error('worker_arguments_too_large');
    // Recheck identity and exact URL in the same execution as the method.
    // No implicit active tab and no automatic replay after a transport failure.
    const code=`(() => {
      const w=globalThis.worker;
      if(location.href!==${JSON.stringify(expectedUrl)}||w?.id!==${JSON.stringify(workerId)})
        throw Error('worker_context_changed');
      return {workerId:w.id,value:w[${JSON.stringify(method)}](...JSON.parse(${JSON.stringify(serialized)}))};
    })()`;
    if(code.length>16000)throw Error('worker_arguments_too_large');
    return session.withTabLease(browserId,tabId,async peer=>{
      const result=await evaluate(peer,tabId,code);
      if(result?.workerId!==workerId||!Object.hasOwn(result,'value'))
        throw Error('worker_execution_receipt_mismatch');
      return result.value;
    });
  }
  return Object.freeze({locate,invoke});
}
