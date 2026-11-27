/** Explicit loopback WebDriver BiDi session, owned by the caller.
 * No browser discovery, profile selection, automatic reconnect or replay.
 */
import {WebSocket} from 'ws';

export async function openBidiSession(endpoint,{timeoutMs=10000}={}){
 const url=new URL(endpoint);
 if(url.protocol!=='ws:'||!['127.0.0.1','[::1]'].includes(url.hostname)||
  !url.port||url.pathname!=='/session'||url.search||url.hash||url.username||url.password||
  !Number.isInteger(timeoutMs)||timeoutMs<500||timeoutMs>30000)throw Error('bidi_endpoint_invalid');
 const socket=new WebSocket(url,{handshakeTimeout:timeoutMs});
 const pending=new Map(),listeners=new Set();let sequence=0,closed=false;
 const disconnect=()=>{
  if(closed)return;closed=true;
  for(const job of pending.values()){clearTimeout(job.timer);job.reject(Error('bidi_disconnected'))}
  pending.clear();
  for(const listener of listeners)listener();
  listeners.clear();
 };
 socket.on('close',disconnect);socket.on('error',disconnect);
 socket.on('message',raw=>{
  let msg;try{msg=JSON.parse(String(raw))}catch{return}
  const job=pending.get(msg.id);if(!job)return;
  pending.delete(msg.id);clearTimeout(job.timer);
  if(msg.type==='error'){
   const error=Error('bidi_command_failed');error.code=msg.error;job.reject(error);
  }else if(msg.type==='success')job.resolve(msg.result);
  else job.reject(Error('bidi_reply_invalid'));
 });
 try{
  await new Promise((resolve,reject)=>{
   socket.once('open',resolve);socket.once('error',reject);
   socket.once('close',()=>reject(Error('bidi_disconnected')));
  });
  function call(method,params={}){
   if(closed||socket.readyState!==WebSocket.OPEN)return Promise.reject(Error('bidi_disconnected'));
   const id=++sequence;
   return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(Error('bidi_command_timeout:'+method))},timeoutMs);
    pending.set(id,{resolve,reject,timer});
    socket.send(JSON.stringify({id,method,params}),error=>{
     if(error&&pending.delete(id)){clearTimeout(timer);reject(Error('bidi_send_failed'))}
    });
   });
  }
  const started=await call('session.new',{capabilities:{alwaysMatch:{}}});
  if(typeof started?.sessionId!=='string'||started.capabilities?.browserName!=='firefox')
   throw Error('bidi_session_invalid');
  return Object.freeze({sessionId:started.sessionId,capabilities:Object.freeze({...started.capabilities}),call,
   get closed(){return closed},
   onClose(listener){if(closed){listener();return ()=>{}}listeners.add(listener);return ()=>listeners.delete(listener)},
   close(){disconnect();socket.terminate()}});
 }catch(error){disconnect();socket.terminate();throw error}
}
