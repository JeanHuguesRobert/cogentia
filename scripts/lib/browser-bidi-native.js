import {textEditProfile} from './browser-text-edit-contract.js';
/** Browser-native BiDi operations on a caller-admitted, explicit root context.
 * The caller owns the tab lease. No authority, path admission or replay here.
 */
const error=code=>Object.assign(Error('BiDi native operation unavailable'),{code});
const id=/^[A-Za-z0-9_-]{1,160}$/;
function targetValid(context,url){
 try{const u=new URL(url);return id.test(context)&&u.protocol==='https:'&&!u.username&&!u.password}
 catch{return false}
}
async function checkRoot(send,context,expectedUrl){
 const {contexts}=await send('browsingContext.getTree',{root:context,maxDepth:0});
 if(contexts?.length!==1||contexts[0].context!==context||contexts[0].url!==expectedUrl)
  throw error('BROWSER_BIDI_DOCUMENT_CHANGED');
}
async function verifyRealm(send,context,realm,expectedUrl){
 await checkRoot(send,context,expectedUrl);
 const {realms}=await send('script.getRealms',{context,type:'window'});
 if(!realms?.some(r=>r.realm===realm&&r.context===context))
  throw error('BROWSER_BIDI_DOCUMENT_CHANGED');
}
function success(result,realm){
 if(result?.type!=='success'||(realm!==undefined&&result.realm!==realm))
  throw error('BROWSER_BIDI_SCRIPT_UNCONFIRMED');
 return result;
}
export function nativeTextAllowed(text){
 // WebDriver private-use code points are special keys, not text. No control
 // keys or line breaks (Enter can submit); reject rather than reinterpret.
 return typeof text==='string'&&text.length>0&&Array.from(text).length<=128&&
  !/[\p{Cc}\p{Cs}\p{Co}\p{Cf}\p{M}\p{Zl}\p{Zp}]/u.test(text);
}
export async function insertBidiNativeText({send,context,expectedUrl,text}={}){
 if(typeof send!=='function'||!targetValid(context,expectedUrl)||!nativeTextAllowed(text))
  throw error('BROWSER_BIDI_NATIVE_INPUT_INVALID');
 await checkRoot(send,context,expectedUrl);
 const prepared=success(await send('script.evaluate',{
  expression:`(() => {
   if(location.href!==${JSON.stringify(expectedUrl)})return null;
   const el=document.activeElement;
   if(!el?.isConnected||el.disabled||el.readOnly||el.getAttribute('aria-disabled')==='true'||
    !['INPUT','TEXTAREA'].includes(el.tagName)||
    (el.tagName==='INPUT'&&!${JSON.stringify(textEditProfile("bidi-native-insert").inputTypes)}.includes(el.type))||
    /username|password|one-time-code|cc-number|cc-csc/i.test(el.autocomplete||'')||
    !Number.isInteger(el.selectionStart)||!Number.isInteger(el.selectionEnd))return null;
   return {el,original:el.value,start:el.selectionStart,end:el.selectionEnd};
  })()`,target:{context},awaitPromise:true,resultOwnership:'root',serializationOptions:{maxObjectDepth:0,maxDomDepth:0}}));
 const handle=prepared.result?.handle,realm=prepared.realm;
 if(prepared.result?.type!=='object'||typeof handle!=='string'||!handle)
  throw error('BROWSER_BIDI_NATIVE_FOCUS_INVALID');
 async function check(prefix){
  const result=success(await send('script.callFunction',{
   target:{realm},arguments:[{handle},{type:'string',value:prefix}],awaitPromise:true,
   functionDeclaration:`function(s,prefix){
     const value=prefix?s.original.slice(0,s.start)+prefix+s.original.slice(s.end):s.original;
     const start=s.start+prefix.length,end=prefix?start:s.end;
     return location.href===${JSON.stringify(expectedUrl)}&&s.el.isConnected&&document.activeElement===s.el&&
      !s.el.disabled&&!s.el.readOnly&&s.el.value===value&&s.el.selectionStart===start&&s.el.selectionEnd===end;
   }`
  }),realm);
  if(result.result?.value!==true)throw error('BROWSER_BIDI_NATIVE_FOCUS_CHANGED');
 }
 try{
  await verifyRealm(send,context,realm,expectedUrl);
  let prefix='';
  for(const value of text){
   // Stop after a site-driven focus/value change instead of blindly sending
   // the remainder of a keyboard sequence to a different focused field.
   await check(prefix);
   await send('input.performActions',{context,actions:[{type:'key',id:'cogentia-native-text',
    actions:[{type:'keyDown',value},{type:'keyUp',value}]}]});
   prefix+=value;
  }
  await verifyRealm(send,context,realm,expectedUrl);await check(prefix);
  return {insertedLength:text.length};
 }finally{await send('script.disown',{target:{realm},handles:[handle]}).catch(()=>{})}
}

/** Native file selection backend. Caller has independently admitted the
 * local path, size, browser locality and external effect. No gateway export.
 */
export async function selectBidiFile({send,context,expectedUrl,fileIndex,file}={}){
 if(typeof send!=='function'||!targetValid(context,expectedUrl)||
  !Number.isSafeInteger(fileIndex)||fileIndex<0||fileIndex>79||
  typeof file?.resolved!=='string'||!file.resolved.startsWith('/')||
  !Number.isSafeInteger(file.bytes)||file.bytes<1)
  throw error('BROWSER_UPLOAD_TARGET_INVALID');
 await checkRoot(send,context,expectedUrl);
 const selected=success(await send('script.evaluate',{
  expression:`(() => {
   if(location.href!==${JSON.stringify(expectedUrl)})return null;
   const nodes=document.querySelectorAll('input[type="file"]');
   if(nodes.length>80)return null;
   const el=nodes[${fileIndex}];
   return el?.isConnected&&!el.matches(':disabled')&&el.getAttribute('aria-disabled')!=='true'?el:null;
  })()`,target:{context},awaitPromise:true}));
 const sharedId=selected.result?.sharedId,realm=selected.realm;
 if(selected.result?.type!=='node'||typeof sharedId!=='string'||!sharedId)
  throw error('BROWSER_UPLOAD_FIELD_UNAVAILABLE');
 const node={sharedId};
 async function check(after){
  const result=success(await send('script.callFunction',{
   target:{realm},arguments:[node],awaitPromise:true,
   functionDeclaration:after?
    `async function(el){if(location.href!==${JSON.stringify(expectedUrl)}||!el.isConnected||el.type!=='file')return false;
      const f=el.files;if(f?.length!==1||f[0].size!==${file.bytes})return false;
      try{return (await f[0].slice(0,1).arrayBuffer()).byteLength===1}catch{return false}}`:
    `function(el){return location.href===${JSON.stringify(expectedUrl)}&&el.isConnected&&el.tagName==='INPUT'&&el.type==='file'&&!el.matches(':disabled')&&el.getAttribute('aria-disabled')!=='true'}`
  }),realm);
  if(result.result?.value!==true)throw error(after?'BROWSER_UPLOAD_BROWSER_FILE_UNVERIFIED':'BROWSER_UPLOAD_FIELD_UNAVAILABLE');
 }
 await verifyRealm(send,context,realm,expectedUrl);await check(false);
 await send('input.setFiles',{context,element:node,files:[file.resolved]});
 await verifyRealm(send,context,realm,expectedUrl);await check(true);
 return {selected:true,browserBytes:file.bytes};
}
