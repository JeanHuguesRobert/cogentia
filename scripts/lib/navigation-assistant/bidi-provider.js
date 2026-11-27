/** Adapter to the existing Navigation Assistant gateway. Authority remains
 * upstream (COP, gateway tab leases); this module adds no MCP capability.
 */
import {randomUUID} from 'node:crypto';
import {WebSocket} from 'ws';
const METHODS=Object.freeze(['tabs.list','page.evaluate']);
const metadata=Object.freeze({engine:'firefox',transport:'bidi',methods:METHODS});
function webUrl(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password}catch{return false}}
export function createBidiNavigationProvider({session,instancePrefix='firefox'}={}){
 if(typeof session?.call!=='function'||typeof session?.onClose!=='function'||
  session.closed||!/^[A-Za-z0-9_-]{1,80}$/.test(instancePrefix))throw Error('bidi_provider_invalid');
 // A new engine session gets a new instance identity. Gateway reconnection
 // of the same provider preserves its IDs, never reassigns retired tab IDs.
 const browserId=instancePrefix+'-'+randomUUID();
 const byContext=new Map();let next=0,peer=null,inFlight=0,connecting=false,inventoryTail=Promise.resolve();
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
  if(method!=='page.evaluate')throw Error('bidi_method_unsupported');
  if(!Number.isSafeInteger(params.tabId)||params.tabId<1||
   typeof params.code!=='string'||!params.code||params.code.length>16000||
   (params.expectedUrl!==undefined&&!webUrl(params.expectedUrl)))throw Error('bidi_evaluation_invalid');
  const before=(await inventory()).find(t=>t.id===params.tabId);
  if(!before||!webUrl(before.url)||(params.expectedUrl!==undefined&&params.expectedUrl!==before.url))
   throw Error('bidi_tab_target_changed');
  const expected=before.url;
  const probe=await session.call('script.evaluate',{expression:'location.href',target:{context:before.context},awaitPromise:true});
  if(probe.type!=='success'||probe.result?.value!==expected||typeof probe.realm!=='string'||!probe.realm)
   throw Error('bidi_tab_realm_unavailable');
  const expression=`Promise.resolve().then(()=>{if(location.href!==${JSON.stringify(expected)})throw Error('document_url_changed');return (0,eval)(${JSON.stringify(params.code)})}).then(v=>JSON.stringify(v??null))`;
  const result=await session.call('script.evaluate',{expression,target:{realm:probe.realm},awaitPromise:true});
  if(result.type!=='success'||result.realm!==probe.realm||result.result?.type!=='string')throw Error('bidi_evaluation_unconfirmed');
  const after=(await inventory()).find(t=>t.id===before.id);
  const realms=await session.call('script.getRealms',{context:before.context,type:'window'});
  if(!after||after.context!==before.context||after.url!==expected||
   !Array.isArray(realms.realms)||!realms.realms.some(r=>r.realm===probe.realm&&r.context===before.context))
   throw Error('bidi_evaluation_unconfirmed');
  return {value:JSON.parse(result.result.value),tab:tabReceipt(after)};
 }
 async function attachGateway(endpoint,{timeoutMs=10000}={}){
  if(peer||connecting||inFlight||session.closed)throw Error('bidi_provider_busy_or_closed');
  const url=new URL(endpoint);
  if(!['ws:','wss:'].includes(url.protocol)||url.pathname!=='/extension'||
   url.username||url.password||url.search||url.hash)throw Error('bidi_gateway_endpoint_invalid');
  connecting=true;let ws,off=()=>{};
  try{
   ws=new WebSocket(url,{handshakeTimeout:timeoutMs});
   peer=ws;
   ws.on('error',()=>{});
   ws.once('close',()=>{if(peer===ws)peer=null;off()});
   off=session.onClose(()=>ws.terminate());
   await new Promise((resolve,reject)=>{
    ws.once('open',resolve);ws.once('error',reject);ws.once('close',()=>reject(Error('bidi_gateway_disconnected')));
   });
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
    try{reply={result:await dispatch(req.method,req.params)}}catch{reply={error:{code:-32002,message:'BiDi browser request failed'}}}
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
