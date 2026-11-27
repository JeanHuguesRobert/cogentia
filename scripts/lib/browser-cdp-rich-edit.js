import {validElementTarget} from './browser-element-target.js';
import {siteEditorProjection,projectSiteEditorRole} from './browser-site-adapters.js';

/** Native realization of a UID-bound rich-text replacement. The caller owns
 * the admitted form effect and CDP tab lease. Fixed editing gestures only:
 * never dispatch an unmodified Enter, arbitrary keys, clicks or submission. */
export async function replaceCdpRichText({send,elementTarget,expectedUrl,semanticRole,text}={}){
 const site=siteEditorProjection(expectedUrl);
 if(typeof send!=='function'||!validElementTarget(elementTarget)||
    !site||!projectSiteEditorRole(expectedUrl,semanticRole).semantic_role||
    typeof text!=='string'||!text||text.length>2048||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text))
  throw Error('native_rich_edit_invalid');
 const epoch=elementTarget.document_epoch,uid=elementTarget.uid;
 const value=text.replace(/\r\n/g,'\n');
 if(value.includes('\r'))throw Error('native_rich_edit_invalid');
 const fail=reason=>({ok:false,reason,submitted:false});
 async function observe(action='check'){
  const expression=`(() => {
   if(location.href!==${JSON.stringify(expectedUrl)})return {ok:false,reason:'document_url_changed'};
   const registry=window.__cogentiaNavigationAssistant?.elementIdentity;
   if(registry?.epoch!==${JSON.stringify(epoch)})return {ok:false,reason:'document_epoch_changed'};
   const el=registry.resolveElementUid(${JSON.stringify(uid)});
   if(!el?.isConnected)return {ok:false,reason:'element_uid_stale'};
   if(${site.matcher}(el)!==${JSON.stringify(semanticRole)})return {ok:false,reason:'element_role_changed'};
   if(!el.isContentEditable||el.getAttribute('contenteditable')!=='true'||
    el.getAttribute('aria-disabled')==='true'||el.getAttribute('aria-readonly')==='true'||
    /username|password|one-time-code|cc-number|cc-csc/i.test(el.getAttribute('autocomplete')||''))
    return {ok:false,reason:'field_unavailable'};
   if(${JSON.stringify(action)}==='focus')el.focus({preventScroll:true});
   if(!el.isConnected||registry.resolveElementUid(${JSON.stringify(uid)})!==el||document.activeElement!==el)
    return {ok:false,reason:'focus_denied'};
   const sel=document.getSelection();
   if(!sel||!sel.rangeCount)return {ok:false,reason:'selection_unavailable'};
   const range=sel.getRangeAt(0);
   const inside=el.contains(range.startContainer)&&el.contains(range.endContainer);
   if(!inside)return {ok:false,reason:'selection_outside_editor'};
   const actual=String(el.innerText||'');
   return {ok:true,actual,selected:String(sel),collapsed:sel.isCollapsed};
  })()`;
  const reply=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  return reply?.exceptionDetails?fail('native_rich_observation_failed'):reply?.result?.value??fail('native_rich_observation_failed');
 }
 // The visible text representation may contain an extra terminal LF for the
 // browser's empty last line. Never normalize away internal paragraph breaks.
 const trimEndLF=s=>s.replace(/\r\n/g,'\n').replace(/\n+$/,'');
 const sameText=(a,b)=>trimEndLF(a)===trimEndLF(b);
 // Selections can use one LF per block whereas innerText uses two. Require
 // exact non-LF text equality as well as both endpoints inside the editor.
 const selectionText=s=>s.replace(/[\r\n]/g,'');
 async function key({key,code,windowsVirtualKeyCode,modifiers=0,text:typed}){
  const common={key,code,windowsVirtualKeyCode,modifiers};
  await send('Input.dispatchKeyEvent',{type:typed===undefined?'rawKeyDown':'keyDown',...common,
   ...(typed===undefined?{}:{text:typed,unmodifiedText:typed})});
  await send('Input.dispatchKeyEvent',{type:'keyUp',...common});
 }
 let state=await observe('focus');
 if(!state.ok)return state;
 // Select all using the browser's real keyboard path, not a synthetic Range
 // alone; the application may maintain its own selection model.
 if(state.actual.trim()||state.selected){
  await key({key:'a',code:'KeyA',windowsVirtualKeyCode:65,modifiers:2});
  state=await observe();
  if(!state.ok||state.collapsed||selectionText(state.selected)!==selectionText(state.actual))
   return fail('editor_selection_unconfirmed');
  await key({key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
  state=await observe();
  if(!state.ok||state.actual.trim()||!state.collapsed)return fail('editor_clear_unconfirmed');
 }
 const parts=value.split(/(\n)/);
 for(const part of parts){
  if(!part)continue;
  state=await observe();
  if(!state.ok||!state.collapsed)return fail('native_rich_focus_changed');
  if(part==='\n')await key({key:'Enter',code:'Enter',windowsVirtualKeyCode:13,modifiers:8,text:'\r'});
  else await send('Input.insertText',{text:part});
 }
 state=await observe();
 if(!state.ok||!sameText(state.actual,value))return fail('native_rich_readback_mismatch');
 return {ok:true,insertedLength:text.length,document_epoch:epoch,uid,submitted:false};
}
