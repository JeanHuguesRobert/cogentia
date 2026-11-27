import {textEditProfile,supportsTextInput} from './browser-text-edit-contract.js';
/** FBF #291: daemon-owned data recipes over stable browser primitive. */
const TYPES=new Set(['text','email','search','tel','url','number']);
const SECRET=/username|password|one-time-code|cc-number|cc-csc/i;
export function createFormPlanner({fieldSelector,editProfile='legacy-cdp-insert'}={}){
 if(!textEditProfile(editProfile).formPlan)throw Error('form_recipe_edit_profile_unrouted');
 return Object.freeze({
  plan({recipe_id='generic.select-input',version=1,field_type,selection,
     structure,tab_id,expected_url,text}={}){
   if(recipe_id!=='generic.select-input'||version!==1)throw Error('recipe_not_registered');
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
   if(fieldSelector && fieldSelector(structure.fields,field_type,selection)!==field_index)
    throw Error('form_recipe_inox_parity_mismatch');
   if(field_index===-2)throw Error('form_recipe_field_ambiguous');
   if(field_index<0)throw Error('form_recipe_field_not_found');
   if(!supportsTextInput(editProfile,field_type))throw Error('form_recipe_edit_unsupported');
   return Object.freeze({capability:'browser.form.fill',arguments:Object.freeze({
     tab_id,field_index,expected_url,text,
   }),recipe_id,recipe_version:version});
  },
 });
}
export const FORM_PLANNER=createFormPlanner();
