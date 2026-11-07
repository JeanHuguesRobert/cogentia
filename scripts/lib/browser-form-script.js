/** Trusted client-side recipe compiled into one existing page.evaluate call.
 * No caller-provided JavaScript; non-secret ordinary text inputs only.
 * The input text is embedded in the CDP RPC: NEVER use this for secrets.
 */
export function compileNonSecretFormFill({fieldIndex,text,expectedUrl,iframeIndex,expectedFrameOrigin}={}){
 if(!Number.isInteger(fieldIndex)||fieldIndex<0||fieldIndex>79||
   typeof text!=='string'||text.length<1||text.length>2048||
   typeof expectedUrl!=='string'||!expectedUrl.startsWith('https://')||expectedUrl.length>4096)throw Error('form_script_invalid_input');
 const scoped=iframeIndex!==undefined||expectedFrameOrigin!==undefined;
 if(scoped && (!Number.isInteger(iframeIndex)||iframeIndex<0||iframeIndex>19||
    typeof expectedFrameOrigin!=='string'||!expectedFrameOrigin.startsWith('https://')||
    new URL(expectedFrameOrigin).origin!==expectedFrameOrigin))throw Error('form_script_frame_invalid');
 const encoded=JSON.stringify(text);
 const urlLiteral=JSON.stringify(expectedUrl);
 return `(() => {
 if(location.href!==${urlLiteral})return {ok:false,reason:'document_url_changed'};
 let targetDocument=document;
 ${scoped?`const frame=document.querySelectorAll('iframe')[${iframeIndex}];
 if(!frame||!frame.isConnected)return {ok:false,reason:'iframe_missing'};
 let srcOrigin='';try{srcOrigin=new URL(frame.getAttribute('src')||'',location.href).origin}catch{}
 if(srcOrigin!==${JSON.stringify(expectedFrameOrigin)})return {ok:false,reason:'iframe_origin_mismatch'};
 try{targetDocument=frame.contentDocument}catch{return {ok:false,reason:'cross_origin_frame_requires_isolated_world'};}
 if(!targetDocument||targetDocument.location.origin!==${JSON.stringify(expectedFrameOrigin)})
   return {ok:false,reason:'cross_origin_frame_requires_isolated_world'};` : ''}
 const el=targetDocument.querySelectorAll('input,textarea,select,button,[contenteditable="true"]')[${fieldIndex}];
 if(!el||!el.isConnected||el.disabled||el.readOnly||
   !['INPUT','TEXTAREA'].includes(el.tagName))return {ok:false,reason:'field_unavailable'};
 const type=String(el.type||'text').toLowerCase();
 if(el.tagName==='INPUT'&&!['text','search','tel','url'].includes(type))
   return {ok:false,reason:'field_type_forbidden'};
 if(/username|password|one-time-code|cc-number|cc-csc/i.test(String(el.autocomplete||'')))
   return {ok:false,reason:'sensitive_autocomplete'};
 const value=${encoded};
 if(location.href!==${urlLiteral})return {ok:false,reason:'document_url_changed'};
 el.focus({preventScroll:true});
 if(targetDocument.activeElement!==el)return {ok:false,reason:'focus_denied'};
 try{el.setSelectionRange(0,el.value.length);}catch{return {ok:false,reason:'selection_denied'};}
 if(location.href!==${urlLiteral}||!el.isConnected||targetDocument.activeElement!==el)
   return {ok:false,reason:'document_or_focus_changed'};
 const inserted=targetDocument.execCommand('insertText',false,value);
 return {ok:inserted===true&&el.value===value,
   insertedLength:inserted===true&&el.value===value?value.length:0,
   ${scoped?`iframeIndex:${iframeIndex},`:''}submitted:false};
})()`;
}
