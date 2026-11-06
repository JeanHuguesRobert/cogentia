/** Fixed, bounded DOM metadata only. No values, text, links, scripts or secrets. */
export const SAFE_DOM_STRUCTURE_CODE = `(() => {
 const fields = Array.from(document.querySelectorAll('input,textarea,select,button')).slice(0,80).map(el=>({
  tag:el.tagName.toLowerCase(),
  type:el.tagName.toLowerCase()==='input' ? el.type : undefined,
  role:el.getAttribute('role')||undefined,
  required:el.required===true,
  disabled:el.disabled===true,
  readonly:el.readOnly===true,
  autocomplete:el.getAttribute('autocomplete')||undefined
 }));
 const iframe_metadata=Array.from(document.querySelectorAll('iframe')).slice(0,20).map(frame=>{
  let origin='';
  try {origin=new URL(frame.getAttribute('src')||'',location.href).origin;}catch{}
  let same_origin=false,forms=0,controls=0;
  try {const d=frame.contentDocument; if(d){same_origin=true;forms=d.forms.length;controls=d.querySelectorAll('input,textarea,select,button').length;}}catch{}
  return {origin,same_origin,forms,controls};
 });
 return {
  title:document.title,
  origin:location.origin,
  forms:Math.min(document.forms.length,100),
  fields,
  total_fields:document.querySelectorAll('input,textarea,select,button').length,
  frames:Math.min(document.querySelectorAll('iframe').length,100),
  iframe_metadata,
  truncated:document.querySelectorAll('input,textarea,select,button').length>80
 };
})()`;
