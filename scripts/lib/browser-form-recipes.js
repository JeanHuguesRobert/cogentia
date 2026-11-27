import {validElementTarget} from './browser-element-target.js';
import {supportsTextInput} from './browser-text-edit-contract.js';
/** FBF #291: daemon-owned data recipes over stable browser primitive. */
const TYPES=new Set(['text','email','search','tel','url','number']);
const SECRET=/username|password|one-time-code|cc-number|cc-csc/i;
export function createFormPlanner({fieldSelector}={}){
 return Object.freeze({
  plan({recipe_id='generic.select-editable',version=1,field_type,selection,
     structure,tab_id,expected_url,text,operation='insert-at-selection',browser_instance_id}={}){
   if(recipe_id!=='generic.select-editable'||version!==1)throw Error('recipe_not_registered');
   if(!['insert-at-selection','replace-all'].includes(operation))throw Error('form_recipe_edit_unsupported');
   const replace=operation==='replace-all';
   if(replace?(typeof browser_instance_id!=='string'||!browser_instance_id):browser_instance_id!==undefined)throw Error('form_recipe_target_required');
   if((field_type===undefined?!replace:!TYPES.has(field_type))||!['first','unique'].includes(selection))
    throw Error('form_recipe_selection_invalid');
   if(!Number.isInteger(tab_id)||tab_id<1||
     typeof expected_url!=='string'||!expected_url.startsWith('https://')||
     typeof text!=='string'||!text||text.length>2048)throw Error('recipe_envelope_invalid');
   if(!structure||typeof structure!=='object'||
     new URL(expected_url).origin!==structure.origin||!Array.isArray(structure.fields)||
     structure.truncated!==false||structure.fields.length>80)throw Error('form_structure_unreliable');
   const profile=replace?'dom-replace':'legacy-cdp-insert';
   if(field_type!==undefined&&!supportsTextInput(profile,field_type))throw Error('form_recipe_edit_unsupported');
   // Keep the semantic selection independent of DOM and transport.
   // Only the Core retains the implementation kind and identity.
   const kind=f=>{
    if(!f||typeof f!=='object')return null;
    if(f.tag==='input')
     return (field_type===undefined||f.type===field_type)&&supportsTextInput(profile,f.type)?'plain':null;
    if(!replace||field_type!==undefined)return null;
    if(f.tag==='textarea')return 'plain';
    if(f.contenteditable===true)return 'contenteditable';
    return null;
   };
   const kinds=structure.fields.map(kind);
   const candidates=structure.fields.map((f,i)=>({
     editable:kinds[i]!==null,disabled:f?.disabled,readonly:f?.readonly,autocomplete:f?.autocomplete,
   }));
   const eligible=f=>f.editable===true&&f.disabled===false&&f.readonly===false&&!SECRET.test(String(f.autocomplete||''));
   let field_index=candidates.findIndex(eligible);
   if(selection==='unique'&&field_index>=0&&candidates.some((f,i)=>i>field_index&&eligible(f)))
    field_index=-2;
   if(fieldSelector && fieldSelector(candidates,selection,operation)!==field_index)
    throw Error('form_recipe_inox_parity_mismatch');
   if(field_index===-2)throw Error('form_recipe_field_ambiguous');
   if(field_index<0)throw Error('form_recipe_field_not_found');
   const target=structure.fields[field_index].element_target;
   if(replace&&!validElementTarget(target,{tabId:tab_id,browserId:browser_instance_id}))
    throw Error('form_recipe_target_required');
   return Object.freeze({capability:'browser.form.fill',arguments:Object.freeze({
     tab_id,expected_url,text,...(replace?{browser_instance_id,element_target:Object.freeze({...target}),...(kinds[field_index]==='contenteditable'?{field_kind:'contenteditable'}:{})}:{field_index}),
   }),recipe_id,recipe_version:version});
  },
 });
}
export const FORM_PLANNER=createFormPlanner();
