import {textEditProfile} from './browser-text-edit-contract.js';
import {validElementTarget} from './browser-element-target.js';
/** Trusted client-side recipe compiled into one existing page.evaluate call.
 * No caller-provided JavaScript; non-secret ordinary text inputs only.
 * The input text is embedded in the CDP RPC: NEVER use this for secrets.
 */
export function compileNonSecretFormFill({fieldIndex,text,expectedUrl,iframeIndex,expectedFrameOrigin,fieldKind="plain",elementTarget,allowLoopbackFixture=false,originOnly=false}={}){
 const uidMode=elementTarget!==undefined;
 const fixtureUrl=allowLoopbackFixture&&typeof expectedUrl==='string'&&/^http:\/\/127\.0\.0\.1:\d+\//.test(expectedUrl);
 if((uidMode?(fieldIndex!==undefined||!validElementTarget(elementTarget,{allowFrame:true})):(!Number.isInteger(fieldIndex)||fieldIndex<0||fieldIndex>79))||
   typeof text!=='string'||text.length<1||text.length>2048||
   typeof expectedUrl!=='string'||(!expectedUrl.startsWith('https://')&&!fixtureUrl)||expectedUrl.length>4096)throw Error('form_script_invalid_input');
 if(!['plain','contenteditable'].includes(fieldKind))throw Error('form_script_field_kind_invalid');
 const scoped=iframeIndex!==undefined||expectedFrameOrigin!==undefined;
 if(scoped && (!Number.isInteger(iframeIndex)||iframeIndex<0||iframeIndex>19||
    typeof expectedFrameOrigin!=='string'||!expectedFrameOrigin.startsWith('https://')||
    new URL(expectedFrameOrigin).origin!==expectedFrameOrigin))throw Error('form_script_frame_invalid');
 if(originOnly&&(!uidMode||elementTarget.frame_id==='top'||new URL(expectedUrl).origin!==expectedUrl))
  throw Error('form_script_origin_scope_invalid');
 if(uidMode&&scoped)throw Error('form_script_uid_frame_unsupported');
 const encoded=JSON.stringify(text);
 const urlLiteral=JSON.stringify(expectedUrl);
 const documentLocation=originOnly?"location.origin":"location.href";
 return `(() => {
 if(${documentLocation}!==${urlLiteral})return {ok:false,reason:'document_url_changed'};
 let targetDocument=document;
 ${scoped?`const frame=document.querySelectorAll('iframe')[${iframeIndex}];
 if(!frame||!frame.isConnected)return {ok:false,reason:'iframe_missing'};
 let srcOrigin='';try{srcOrigin=new URL(frame.getAttribute('src')||'',location.href).origin}catch{}
 if(srcOrigin!==${JSON.stringify(expectedFrameOrigin)})return {ok:false,reason:'iframe_origin_mismatch'};
 try{targetDocument=frame.contentDocument}catch{return {ok:false,reason:'cross_origin_frame_requires_isolated_world'};}
 if(!targetDocument||targetDocument.location.origin!==${JSON.stringify(expectedFrameOrigin)})
   return {ok:false,reason:'cross_origin_frame_requires_isolated_world'};` : ''}
 ${uidMode?`const registry=window.__cogentiaNavigationAssistant?.elementIdentity;
 if(registry?.epoch!==${JSON.stringify(elementTarget.document_epoch)})return {ok:false,reason:'document_epoch_changed'};
 const el=registry.resolveElementUid(${JSON.stringify(elementTarget.uid)});
 if(!el)return {ok:false,reason:'element_uid_stale'};`:`const el=targetDocument.querySelectorAll('input,textarea,select,button,[contenteditable="true"]')[${fieldIndex}];`}
 if(!el||!el.isConnected||el.disabled||el.readOnly||el.getAttribute?.('aria-disabled')==='true')
   return {ok:false,reason:'field_unavailable'};
 const kind=${JSON.stringify(fieldKind)};
 if(kind==='contenteditable' && (!el.isContentEditable || el.getAttribute('contenteditable')!=='true'))
   return {ok:false,reason:'rich_text_field_unavailable'};
 if(kind==='plain' && !['INPUT','TEXTAREA'].includes(el.tagName))
   return {ok:false,reason:'field_unavailable'};
 const type=String(el.type||'text').toLowerCase();
 if(kind==='plain' && el.tagName==='INPUT' && !${JSON.stringify(textEditProfile("dom-replace").inputTypes)}.includes(type))
   return {ok:false,reason:'field_type_forbidden'};
 if(/username|password|one-time-code|cc-number|cc-csc/i.test(String(el.autocomplete||'')))
   return {ok:false,reason:'sensitive_autocomplete'};
 const value=${encoded};
 if(${documentLocation}!==${urlLiteral})return {ok:false,reason:'document_url_changed'};
 el.focus({preventScroll:true});
 if(targetDocument.activeElement!==el)return {ok:false,reason:'focus_denied'};
 if(kind==='contenteditable'){
   const selection=targetDocument.getSelection();
   if(!selection)return {ok:false,reason:'selection_unavailable'};
   const range=targetDocument.createRange();
   range.selectNodeContents(el);
   selection.removeAllRanges();
   selection.addRange(range);
 }else{
   try{el.setSelectionRange(0,el.value.length);}catch{return {ok:false,reason:'selection_denied'};}
 }
 if(${documentLocation}!==${urlLiteral}||!el.isConnected||targetDocument.activeElement!==el)
   return {ok:false,reason:'document_or_focus_changed'};
 ${uidMode?`if(window.__cogentiaNavigationAssistant?.elementIdentity!==registry||
 registry.resolveElementUid(${JSON.stringify(elementTarget.uid)})!==el)
 return {ok:false,reason:'element_uid_stale'};`:''}
 const inserted=targetDocument.execCommand('insertText',false,value);
 const actual=kind==='contenteditable'
   ? String(el.innerText||el.textContent||'').replace(/\\r\\n/g,'\\n')
   : el.value;
 const matches=actual===value || (kind==='contenteditable'&&actual===value+'\\n');
 return {ok:inserted===true&&matches,
   insertedLength:inserted===true&&matches?value.length:0,
   ${scoped?`iframeIndex:${iframeIndex},`:''}
   ${uidMode?`document_epoch:registry.epoch,uid:${JSON.stringify(elementTarget.uid)},`:''}submitted:false};
})()`;
}
