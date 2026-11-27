import {validElementTarget} from './browser-element-target.js';
import {supportsTextInput} from './browser-text-edit-contract.js';
/** FBF #291: daemon-owned data recipes over stable browser primitive. */
const TYPES=new Set(['text','email','search','tel','url','number']);
const SECRET=/username|password|one-time-code|cc-number|cc-csc/i;
export function createFormPlanner({fieldSelector}={}){
 return Object.freeze({
  plan({recipe_id='generic.select-input',version=1,field_type,selection,
     structure,tab_id,expected_url,text,operation='insert-at-selection',browser_instance_id}={}){
   if(recipe_id!=='generic.select-input'||version!==1)throw Error('recipe_not_registered');
   if(!['insert-at-selection','replace-all'].includes(operation))throw Error('form_recipe_edit_unsupported');
   const replace=operation==='replace-all';
   if(replace?(typeof browser_instance_id!=='string'||!browser_instance_id):browser_instance_id!==undefined)throw Error('form_recipe_target_required');
   if(!TYPES.has(field_type)||!['first','unique'].includes(selection))
    throw Error('form_recipe_selection_invalid');
   if(!Number.isInteger(tab_id)||tab_id<1||
     typeof expected_url!=='string'||!expected_url.startsWith('https://')||
     typeof text!=='string'||!text||text.length>2048)throw Error('recipe_envelope_invalid');
   if(!structure||typeof structure!=='object'||
     new URL(expected_url).origin!==structure.origin||!Array.isArray(structure.fields)||
     structure.truncated!==false||structure.fields.length>80)throw Error('form_structure_unreliable');
   const eligible=f=>f?.tag==='input'&&f.type===field_type&&
     f.disabled===false&&f.readonly===false&&!SECRET.test(String(f.autocomplete||''));
   let field_index=structure.fields.findIndex(eligible);
   if(selection==='unique'&&field_index>=0&&structure.fields.some((f,i)=>i>field_index&&eligible(f)))
    field_index=-2;
   // Opt-in comparison: no alternate result may change the governed plan.
   if(fieldSelector && fieldSelector(structure.fields,field_type,selection,operation)!==field_index)
    throw Error('form_recipe_inox_parity_mismatch');
   if(field_index===-2)throw Error('form_recipe_field_ambiguous');
   if(field_index<0)throw Error('form_recipe_field_not_found');
   if(!supportsTextInput(replace?'dom-replace':'legacy-cdp-insert',field_type))throw Error('form_recipe_edit_unsupported');
   const target=structure.fields[field_index].element_target;
   if(replace&&!validElementTarget(target,{tabId:tab_id,browserId:browser_instance_id}))
    throw Error('form_recipe_target_required');
   return Object.freeze({capability:'browser.form.fill',arguments:Object.freeze({
     tab_id,expected_url,text,...(replace?{browser_instance_id,element_target:Object.freeze({...target})}:{field_index}),
   }),recipe_id,recipe_version:version});
  },
 });
}
export const FORM_PLANNER=createFormPlanner();
