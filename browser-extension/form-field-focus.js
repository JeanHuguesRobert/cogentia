/** Generic, bounded field focus. No arbitrary script, submit or field-value read. */
export function safeFormFocusCode(fieldIndex){
 if(!Number.isInteger(fieldIndex)||fieldIndex<0||fieldIndex>79)throw Error('invalid_field_index');
 return `(() => {
 const el=document.querySelectorAll('input,textarea,select,button,[contenteditable="true"]')[${fieldIndex}];
 if(!el||!el.isConnected)return {ok:false,reason:'field_missing'};
 const tag=el.tagName.toLowerCase(),type=String(el.type||'').toLowerCase();
 if(el.disabled||el.readOnly||(!['input','textarea'].includes(tag)&&!el.isContentEditable)||
    ['password','hidden','file','submit','button','checkbox','radio'].includes(type)||
    /username|password|one-time-code|cc-number|cc-csc/.test(String(el.autocomplete||'')))
    return {ok:false,reason:'not_plain_text_field'};
 if(tag==='input'&&!['text','email','search','tel','url','number'].includes(type))return {ok:false,reason:'not_plain_text_field'};
 el.focus({preventScroll:true});
 return {ok:document.activeElement===el,kind:tag,type:type||null};
})()`;
}
