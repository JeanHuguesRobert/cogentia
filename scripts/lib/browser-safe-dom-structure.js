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
 return {
  title:document.title,
  origin:location.origin,
  forms:Math.min(document.forms.length,100),
  fields,
  total_fields:document.querySelectorAll('input,textarea,select,button').length,
  frames:Math.min(document.querySelectorAll('iframe').length,100),
  truncated:document.querySelectorAll('input,textarea,select,button').length>80
 };
})()`;
