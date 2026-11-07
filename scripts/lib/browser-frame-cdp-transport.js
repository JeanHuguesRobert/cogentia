/** CDP transport for a COP-admitted semantic browser capability.
 * Operates ONLY via a uniquely identified live target and a gateway tab lease.
 * No permission or grant is created by this code. Never use as a direct agent tool.
 */
import WebSocket from 'ws';
import {randomBytes} from 'node:crypto';
import {createGatewaySession} from './navigation-assistant/gateway-session.js';

const fault = code => Object.assign(new Error('Governed frame transport unavailable'),{code});
const loopback = u => ['127.0.0.1','localhost','[::1]'].includes(u.hostname);
function cdpEndpoints(raw) {
 let u;try{u=new URL(raw)}catch{throw fault('FRAME_CDP_ENDPOINT_INVALID')}
 if(u.protocol!=='http:'||!loopback(u)||u.pathname!=='/'||u.username||u.password||u.search||u.hash)
   throw fault('FRAME_CDP_ENDPOINT_INVALID');
 return u;
}
function validateWs(url,base) {
 let u;try{u=new URL(url)}catch{throw fault('FRAME_CDP_TARGET_INVALID')}
 if(u.protocol!=='ws:'||!loopback(u)||u.port!==base.port||!u.pathname.startsWith('/devtools/page/')||u.username||u.password||u.search||u.hash)
   throw fault('FRAME_CDP_TARGET_INVALID');
 return u.href;
}
function cdpSession(url,{WebSocketClass=WebSocket,timeoutMs=6000}={}) {
 const socket=new WebSocketClass(url);let id=0,closed=false;const pending=new Map();
 const ready=new Promise((ok,no)=>{let settled=false;
  const timer=setTimeout(()=>{if(!settled){settled=true;no(fault('FRAME_CDP_TIMEOUT'))}},timeoutMs);
  socket.once('open',()=>{if(!settled){settled=true;clearTimeout(timer);ok()}});
  socket.once('error',()=>{if(!settled){settled=true;clearTimeout(timer);no(fault('FRAME_CDP_CONNECT_FAILED'))}});
 });
 socket.on('message',raw=>{let m;try{m=JSON.parse(String(raw))}catch{return};const job=pending.get(m.id);
  if(!job)return;pending.delete(m.id);clearTimeout(job.timer);
  if(m.error)job.reject(fault('FRAME_CDP_COMMAND_FAILED'));else job.resolve(m.result);
 });
 socket.on('close',()=>{closed=true;for(const job of pending.values()){clearTimeout(job.timer);job.reject(fault('FRAME_CDP_DISCONNECTED'))}pending.clear()});
 return {
  async send(method,params={},sessionId){
   await ready;
   if(closed||socket.readyState!==WebSocketClass.OPEN)throw fault('FRAME_CDP_DISCONNECTED');
   const callId=++id;
   return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(callId);reject(fault('FRAME_CDP_TIMEOUT'))},timeoutMs);
    pending.set(callId,{resolve,reject,timer});socket.send(JSON.stringify({id:callId,method,params,...(sessionId?{sessionId}:{})}));});
  },
  close(){closed=true;try{socket.close()}catch{}},
 };
}
export function createHostedFrameTransport({gateway='ws://127.0.0.1:8776/assistant',browserInstanceId='fracta2-hosted',
  cdpHttpEndpoint='http://127.0.0.1:9223/',fetchImpl=fetch,WebSocketClass=WebSocket,timeoutMs=6000}={}){
 const base=cdpEndpoints(cdpHttpEndpoint);
 if(typeof browserInstanceId!=='string'||!browserInstanceId||!Number.isInteger(timeoutMs)||timeoutMs<500||timeoutMs>30000)
  throw fault('FRAME_CDP_CONFIG_INVALID');
 return Object.freeze({
  async withFrame({tabId,expectedUrl,frameId,expectedOrigin,operation}){
   if(!Number.isInteger(tabId)||tabId<1||typeof expectedUrl!=='string'||!expectedUrl.startsWith('https://')||
      (frameId!==undefined&&typeof frameId!=='string')||(expectedOrigin!==undefined&&typeof expectedOrigin!=='string')||
      typeof operation!=='function')
      throw fault('FRAME_CDP_TARGET_INVALID');
   const gatewaySession=await createGatewaySession(gateway,{WebSocketClass,timeoutMs});
   try{return await gatewaySession.withTabLease(browserInstanceId,tabId,async session=>{
    const tabs=await session.call('tabs.list',{browser_instance_id:browserInstanceId});
    const tab=(tabs.tabs||[]).find(t=>t.id===tabId);
    if(!tab||tab.url!==expectedUrl)throw fault('FRAME_CDP_TAB_CHANGED');
    // Correlate the selected chrome.tabs ID to a CDP page target through
    // the already installed generic page.evaluate RPC. URL equality alone is
    // not an identity proof when multiple tabs show the same address.
    const proofKey='__cogentia_tab_proof_'+randomBytes(16).toString('hex');
    const proofValue=randomBytes(24).toString('hex');
    const proofCode=`(()=>{Object.defineProperty(globalThis,${JSON.stringify(proofKey)},{value:${JSON.stringify(proofValue)},configurable:true});return true})()`;
    const proof=await session.call('page.evaluate',{browser_instance_id:browserInstanceId,
      tabId,expectedUrl,code:proofCode});
    if(proof?.value!==true||proof?.tab?.id!==tabId||proof?.tab?.url!==expectedUrl)
      throw fault('FRAME_CDP_TAB_PROOF_UNCONFIRMED');
    const url=new URL('/json/list',base);
    let targets;
    try{const response=await fetchImpl(url,{signal:AbortSignal.timeout(timeoutMs)});
     if(!response.ok)throw Error('unavailable');targets=await response.json();
    }catch{throw fault('FRAME_CDP_DISCOVERY_FAILED')}
    const matches=Array.isArray(targets)?targets.filter(t=>t.type==='page'&&t.url===expectedUrl):[];
    if(!matches.length||matches.length>12)throw fault(matches.length?'FRAME_CDP_TARGET_AMBIGUOUS':'FRAME_CDP_TARGET_MISSING');
    let target=null;
    for(const candidate of matches){
      const wsUrl=validateWs(candidate.webSocketDebuggerUrl,base);
      if(typeof candidate.id!=='string'||!/^[a-z0-9_-]{8,128}$/i.test(candidate.id)||
         !new URL(wsUrl).pathname.endsWith('/'+candidate.id))throw fault('FRAME_CDP_TARGET_INVALID');
      const probe=cdpSession(wsUrl,{WebSocketClass,timeoutMs});
      try{
        const reply=await probe.send('Runtime.evaluate',{
          expression:`globalThis[${JSON.stringify(proofKey)}] === ${JSON.stringify(proofValue)}`,
          returnByValue:true,awaitPromise:false});
        if(reply?.result?.value===true){
          if(target)throw fault('FRAME_CDP_TARGET_AMBIGUOUS');
          target=candidate;
        }
      }catch(e){if(e.code==='FRAME_CDP_TARGET_AMBIGUOUS')throw e;}
      finally{probe.close()}
    }
    if(!target)throw fault('FRAME_CDP_TAB_PROOF_UNCONFIRMED');
    const wsUrl=validateWs(target.webSocketDebuggerUrl,base);
    const cdp=cdpSession(wsUrl,{WebSocketClass,timeoutMs});
    try{
     const assertTop=async()=>{
      const tree=(await cdp.send('Page.getFrameTree')).frameTree;
      if(tree?.frame?.url!==expectedUrl)throw fault('FRAME_CDP_DOCUMENT_CHANGED');
      return tree;
     };
     const root=await assertTop();
     // Chrome may isolate a cross-site iframe in its own CDP target (OOPIF).
     // The transport handles that as a session on this SAME tab target,
     // never an unbound second browser/endpoint or a guessed frame ordinal.
     const discover=async()=>{
      const response=await cdp.send('Target.getTargets');
      const candidates=(response.targetInfos||[]).filter(t=>t.type==='iframe'&&t.attached!==true&&
       // Every OOPIF must explicitly identify the selected parent target and
       // parent frame. Never borrow an unrelated browser tab's iframe.
       t.parentId===target.id && t.parentFrameId===root.frame?.id);
      const found=[];
      for(const info of candidates.slice(0,24)){
       if(typeof info.targetId!=='string'||!info.targetId)continue;
       let sessionId;
       try{
        const a=await cdp.send('Target.attachToTarget',{targetId:info.targetId,flatten:true});
        sessionId=a?.sessionId;
        if(typeof sessionId!=='string'||!sessionId)continue;
        const subtree=(await cdp.send('Page.getFrameTree',{},sessionId)).frameTree;
        if(subtree?.frame?.id&&subtree.frame.url===info.url)
         found.push({frameId:subtree.frame.id,origin:new URL(info.url).origin,tree:subtree,
           sessionId,targetId:info.targetId,url:info.url});
       }catch{/* target may have navigated; never guess */}
       finally{if(sessionId)await cdp.send('Target.detachFromTarget',{sessionId}).catch(()=>{});}
      }
      return found;
     };
     let frameTree=root,sessionId=null,relatedTarget=null;
     if(frameId!==undefined){
      const nodes=[root];let present=false;
      while(nodes.length){const n=nodes.shift();if(n.frame?.id===frameId)present=true;
       if(Array.isArray(n.childFrames))nodes.push(...n.childFrames);}
      if(!present){
       const targets=await discover();
       const selected=targets.filter(t=>t.frameId===frameId&&t.origin===expectedOrigin);
       if(selected.length!==1)throw fault('FRAME_CDP_OOPIF_TARGET_MISSING_OR_AMBIGUOUS');
       relatedTarget=selected[0];
       const a=await cdp.send('Target.attachToTarget',{targetId:relatedTarget.targetId,flatten:true});
       sessionId=a.sessionId;
       if(!sessionId)throw fault('FRAME_CDP_OOPIF_ATTACH_FAILED');
       frameTree=(await cdp.send('Page.getFrameTree',{},sessionId)).frameTree;
       if(frameTree?.frame?.id!==frameId||new URL(frameTree.frame.url).origin!==expectedOrigin)
        throw fault('FRAME_CDP_OOPIF_NAVIGATED');
      }
     }
     // operation is Core-owned trusted code, invoked only by a semantic capability.
     let result;
     try{
      result=await operation({send:(method,params={})=>cdp.send(method,params,sessionId),
        frameTree,discoverFrames:discover});
     }finally{if(sessionId)await cdp.send('Target.detachFromTarget',{sessionId}).catch(()=>{});}
     await assertTop();
     const latest=await session.call('tabs.list',{browser_instance_id:browserInstanceId});
     if(!(latest.tabs||[]).some(t=>t.id===tabId&&t.url===expectedUrl))throw fault('FRAME_CDP_TAB_CHANGED');
     return result;
    }finally{
     // Remove the ephemeral tab marker. Failed cleanup never transforms a
     // verified operation into a claimed rollback; document unload also drops it.
     await cdp.send('Runtime.evaluate',{expression:`delete globalThis[${JSON.stringify(proofKey)}]`,
       returnByValue:true}).catch(()=>{});
     cdp.close();
    }
   },20000);
   }finally{gatewaySession.close()}
  },
 });
}
