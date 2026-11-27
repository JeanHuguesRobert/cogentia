/** Adapter to the existing Navigation Assistant gateway. Authority remains
 * upstream (COP, gateway tab leases); this module adds no MCP capability.
 */
import {randomUUID} from 'node:crypto';
import {WebSocket} from 'ws';
import {executeBidiFrameEvaluate} from '../browser-frame-bidi-evaluate.js';
import {projectFrameTree} from '../browser-frame-tree.js';
import {insertBidiNativeText} from '../browser-bidi-native.js';
const METHODS=Object.freeze(['tabs.list','page.evaluate','page.frameTree','tabs.create','tabs.activate','tabs.close','page.insertText']);
// Only fixed provider-generated categories cross the gateway. Never forward
// an exception's message, stack, page URL, script source or browser text.
const evaluationFailures=new Set([
 'target_changed','realm_probe_command_failed','realm_probe_unconfirmed',
 'script_command_failed','script_exception','script_result_unconfirmed',
 'post_inventory_failed','post_realm_command_failed','post_target_unconfirmed',
 'result_decode_failed'
]);
class EvaluationFailure extends Error{
 constructor(stage){super('BiDi evaluation failed: '+stage);this.stage=stage;}
}
async function evaluationStep(stage,fn){
 try{return await fn()}catch{throw new EvaluationFailure(stage)}
}
const metadata=Object.freeze({engine:'firefox',transport:'bidi',methods:METHODS});
function webUrl(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password}catch{return false}}
export function createBidiNavigationProvider({session,instancePrefix='firefox'}={}){
 if(typeof session?.call!=='function'||typeof session?.onClose!=='function'||
  session.closed||!/^[A-Za-z0-9_-]{1,80}$/.test(instancePrefix))throw Error('bidi_provider_invalid');
 // A new engine session gets a new instance identity. Gateway reconnection
 // of the same provider preserves its IDs, never reassigns retired tab IDs.
 const browserId=instancePrefix+'-'+randomUUID();
 const byContext=new Map();let next=0,peer=null,inFlight=0,connecting=false,inventoryTail=Promise.resolve(),eventsSubscribed=false;
 async function readInventory(){
  const result=await session.call('browsingContext.getTree',{maxDepth:0});
  const roots=result?.contexts;
  if(!Array.isArray(roots)||roots.length>256||roots.some(r=>typeof r.context!=='string'||!r.context||typeof r.url!=='string')||
   new Set(roots.map(r=>r.context)).size!==roots.length)throw Error('bidi_inventory_invalid');
  const present=new Set(roots.map(r=>r.context));
  for(const context of byContext.keys())if(!present.has(context))byContext.delete(context);
  return roots.map(r=>{
   if(!byContext.has(r.context))byContext.set(r.context,++next);
   return {context:r.context,id:byContext.get(r.context),url:r.url};
  });
 }
 function inventory(){
  const result=inventoryTail.then(readInventory);
  inventoryTail=result.catch(()=>{});
  return result;
 }
 function tabReceipt(tab){return {id:tab.id,url:tab.url,title:''}}
 async function dispatch(method,params={}){
  if(method==='tabs.list')return {tabs:(await inventory()).map(tabReceipt)};
  if(method==='tabs.create'){
   if(!webUrl(params.url)||typeof params.url!=='string'||params.url.length>4096||
    (params.active!==undefined&&typeof params.active!=='boolean'))throw Error('bidi_open_invalid');
   const made=await session.call('browsingContext.create',{type:'tab',background:params.active===false});
   const tab=(await inventory()).find(t=>t.context===made.context);
   if(!tab)throw Error('bidi_open_unconfirmed');
   // No silent cleanup or retry after an uncertain navigation.
   await session.call('browsingContext.navigate',{context:tab.context,url:params.url,wait:'complete'});
   const after=(await inventory()).find(t=>t.id===tab.id);
   if(!after||after.context!==tab.context||!webUrl(after.url))throw Error('bidi_open_unconfirmed');
   return {tab:tabReceipt(after)};
  }
  if(!['page.evaluate','page.frameTree','tabs.activate','tabs.close','page.insertText'].includes(method))throw Error('bidi_method_unsupported');
  if(!Number.isSafeInteger(params.tabId)||params.tabId<1||
   (method==='page.evaluate'&&(typeof params.code!=='string'||!params.code||params.code.length>16000))||
   (params.expectedUrl!==undefined&&!webUrl(params.expectedUrl)))throw Error('bidi_evaluation_invalid');
  const before=(await inventory()).find(t=>t.id===params.tabId);
  if(!before||!webUrl(before.url)||(params.expectedUrl!==undefined&&params.expectedUrl!==before.url))
   throw new EvaluationFailure('target_changed');
  const expected=before.url;
  if(method==='tabs.activate'||method==='tabs.close'){
   if(params.expectedUrl!==expected)throw Error('bidi_tab_target_changed');
   if(method==='tabs.close'){
    await session.call('browsingContext.close',{context:before.context});
    if((await inventory()).some(t=>t.context===before.context))throw Error('bidi_close_unconfirmed');
    return {closedTabId:before.id};
   }
   await session.call('browsingContext.activate',{context:before.context});
   const after=(await inventory()).find(t=>t.id===before.id);
   if(!after||after.url!==expected)throw Error('bidi_activation_unconfirmed');
   return {tab:tabReceipt(after)};
  }
  if(method==='page.insertText'){
   if(params.expectedUrl!==expected)throw Error('bidi_tab_target_changed');
   const result=await insertBidiNativeText({send:session.call,context:before.context,expectedUrl:expected,text:params.text});
   return {...result,tab:tabReceipt(before)};
  }
  if(method==='page.frameTree'){
   if(params.expectedUrl!==expected)throw Error('bidi_frame_target_invalid');
   const {contexts}=await session.call('browsingContext.getTree',{root:before.context});
   if(contexts?.length!==1||contexts[0].context!==before.context||contexts[0].url!==expected)
    throw Error('bidi_frame_target_changed');
   let count=0;
   function convert(node,depth=0){
    if(++count>256||depth>16)throw Error('bidi_frame_tree_too_large');
    return {frame:{id:node.context,url:node.url},childFrames:(node.children||[]).map(child=>convert(child,depth+1))};
   }
   return {tab:tabReceipt(before),frame_tree:projectFrameTree(convert(contexts[0]))};
  }
  if(params.frameId!==undefined||params.expectedFrameOrigin!==undefined){
   if(params.expectedUrl!==expected)throw Error('bidi_frame_target_invalid');
   const detail=await executeBidiFrameEvaluate({send:session.call,rootContext:before.context,expectedUrl:expected,
    frameId:params.frameId,expectedOrigin:params.expectedFrameOrigin,scriptForUrl:()=>params.code});
   return {tab:tabReceipt(before),value:detail.value,frameId:detail.frameId,origin:detail.origin};
  }
  const probe=await evaluationStep('realm_probe_command_failed',()=>session.call('script.evaluate',
   {expression:'location.href',target:{context:before.context},awaitPromise:true}));
  if(probe.type!=='success'||probe.result?.value!==expected||typeof probe.realm!=='string'||!probe.realm)
   throw new EvaluationFailure('realm_probe_unconfirmed');
  const expression=`Promise.resolve().then(()=>{if(location.href!==${JSON.stringify(expected)})throw Error('document_url_changed');return (0,eval)(${JSON.stringify(params.code)})}).then(v=>JSON.stringify(v??null))`;
  const result=await evaluationStep('script_command_failed',()=>session.call('script.evaluate',
   {expression,target:{realm:probe.realm},awaitPromise:true}));
  if(result.type==='exception')throw new EvaluationFailure('script_exception');
  if(result.type!=='success'||result.realm!==probe.realm||result.result?.type!=='string')
   throw new EvaluationFailure('script_result_unconfirmed');
  const after=await evaluationStep('post_inventory_failed',async()=>(await inventory()).find(t=>t.id===before.id));
  const realms=await evaluationStep('post_realm_command_failed',()=>session.call('script.getRealms',{context:before.context,type:'window'}));
  if(!after||after.context!==before.context||after.url!==expected||
   !Array.isArray(realms.realms)||!realms.realms.some(r=>r.realm===probe.realm&&r.context===before.context))
   throw new EvaluationFailure('post_target_unconfirmed');
  const value=await evaluationStep('result_decode_failed',()=>JSON.parse(result.result.value));
  return {value,tab:tabReceipt(after)};
 }
 async function attachGateway(endpoint,{timeoutMs=10000}={}){
  if(peer||connecting||inFlight||session.closed)throw Error('bidi_provider_busy_or_closed');
  const url=new URL(endpoint);
  if(!['ws:','wss:'].includes(url.protocol)||url.pathname!=='/extension'||
   url.username||url.password||url.search||url.hash)throw Error('bidi_gateway_endpoint_invalid');
  connecting=true;let ws,off=()=>{},offEvents=()=>{};
  try{
   ws=new WebSocket(url,{handshakeTimeout:timeoutMs});
   peer=ws;
   ws.on('error',()=>{});
   ws.once('close',()=>{if(peer===ws)peer=null;off();offEvents()});
   off=session.onClose(()=>ws.terminate());
   await new Promise((resolve,reject)=>{
    ws.once('open',resolve);ws.once('error',reject);ws.once('close',()=>reject(Error('bidi_gateway_disconnected')));
   });
   if(typeof session.onEvent==='function'){
    offEvents=session.onEvent(message=>{
     const p=message.params||{},context=p.context;
     // Only already inventoried root contexts, never frames or guessed IDs.
     const tabId=byContext.get(context);
     if(!tabId||ws.readyState!==WebSocket.OPEN)return;
     let method,params;
     if(message.method==='browsingContext.contextDestroyed'){
      method='page.tabRemoved';params={tabId};byContext.delete(context);
     }else if(['browsingContext.navigationStarted','browsingContext.load'].includes(message.method)){
      method=message.method.endsWith('navigationStarted')?'page.navigationStarted':'page.navigationCompleted';
      params={tab:{id:tabId,title:'',url:typeof p.url==='string'?p.url:''}};
     }else return;
     ws.send(JSON.stringify({jsonrpc:'2.0',method,params}));
    });
    if(!eventsSubscribed){
     await session.call('session.subscribe',{events:['browsingContext.navigationStarted','browsingContext.load','browsingContext.contextDestroyed']});
     eventsSubscribed=true;
    }
   }
   await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>finish(Error('bidi_gateway_register_timeout')),timeoutMs);
    function finish(error){clearTimeout(timer);ws.off('message',registration);ws.off('close',closed);error?reject(error):resolve()}
    function closed(){finish(Error('bidi_gateway_disconnected'))}
    function registration(raw){
     let msg;try{msg=JSON.parse(String(raw))}catch{return}
     if(msg.id!==1)return;
     finish(msg.result?.registered===true&&msg.result.browser_instance_id===browserId?null:Error('bidi_gateway_register_failed'));
    }
    ws.on('message',registration);ws.once('close',closed);
    ws.send(JSON.stringify({jsonrpc:'2.0',id:1,method:'browser.register',params:{browser_instance_id:browserId,provider:metadata}}));
   });
   ws.on('message',async raw=>{
    let req;try{req=JSON.parse(String(raw))}catch{return}
    if(req.jsonrpc!=='2.0'||req.id===undefined||typeof req.method!=='string')return;
    inFlight++;
    let reply;
    try{reply={result:await dispatch(req.method,req.params)}}catch(error){
     const stage=error instanceof EvaluationFailure&&evaluationFailures.has(error.stage)?error.stage:null;
     reply={error:{code:-32002,message:stage?'BiDi evaluation failed: '+stage:'BiDi browser request failed'}};
    }
    finally{inFlight--}
    if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({jsonrpc:'2.0',id:req.id,...reply}));
   });
   return Object.freeze({async close(){
    if(ws.readyState===WebSocket.CLOSED)return;
    await new Promise(resolve=>{ws.once('close',resolve);ws.terminate()});
   },onClose(listener){
    if(ws.readyState===WebSocket.CLOSED){listener();return ()=>{}}
    ws.once('close',listener);return ()=>ws.off('close',listener);
   }});
  }catch(error){ws?.terminate();throw error}
  finally{connecting=false}
 }
 return Object.freeze({browserId,metadata,attachGateway});
}
