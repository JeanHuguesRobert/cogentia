/** Trusted client-side recipe compiled into one existing page.evaluate call.
 * No caller-provided JavaScript; non-secret ordinary text inputs only.
 * The input text is embedded in the CDP RPC: NEVER use this for secrets.
 */
export function compileNonSecretFormFill({fieldIndex,text}={}){
 if(!Number.isInteger(fieldIndex)||fieldIndex<0||fieldIndex>79||
   typeof text!=='string'||text.length<1||text.length>2048)throw Error('form_script_invalid_input');
 const encoded=JSON.stringify(text);
 return `(() => {
 const el=document.querySelectorAll('input,textarea,select,button,[contenteditable="true"]')[${fieldIndex}];
 if(!el||!el.isConnected||el.disabled||el.readOnly||
   !['INPUT','TEXTAREA'].includes(el.tagName))return {ok:false,reason:'field_unavailable'};
 const type=String(el.type||'text').toLowerCase();
 if(el.tagName==='INPUT'&&!['text','search','tel','url'].includes(type))
   return {ok:false,reason:'field_type_forbidden'};
 if(/username|password|one-time-code|cc-number|cc-csc/i.test(String(el.autocomplete||'')))
   return {ok:false,reason:'sensitive_autocomplete'};
 const value=${encoded};
 el.focus({preventScroll:true});
 if(document.activeElement!==el)return {ok:false,reason:'focus_denied'};
 try{el.setSelectionRange(0,el.value.length);}catch{return {ok:false,reason:'selection_denied'};}
 const inserted=document.execCommand('insertText',false,value);
 return {ok:inserted===true&&el.value===value,
   insertedLength:inserted===true&&el.value===value?value.length:0,submitted:false};
})()`;
}
