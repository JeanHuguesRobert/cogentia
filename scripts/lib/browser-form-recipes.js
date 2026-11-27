import {textEditProfile,supportsTextInput} from './browser-text-edit-contract.js';
/** FBF #291: daemon-owned data recipes over stable browser primitive. */
const TYPES=new Set(['text','email','search','tel','url','number']);
const SECRET=/username|password|one-time-code|cc-number|cc-csc/i;
export function createFormRecipeRegistry({firstTextSelector,fieldSelector,editProfile='legacy-cdp-insert'}={}){
 if(!textEditProfile(editProfile).formPlan)throw Error('form_recipe_edit_profile_unrouted');
 const recipes=new Map();
 return Object.freeze({
  register({id,version,match,selection='first'}={}){
   if(typeof id!=='string'||!/^[-a-z0-9.]{1,80}$/.test(id)||
    !Number.isSafeInteger(version)||version<1||!match||
    !TYPES.has(match.type)||!["first","unique"].includes(selection)||Object.keys(match).some(k=>k!=='type')||
    recipes.has(id+'@'+version))throw Error('recipe_untrusted_or_duplicate');
   recipes.set(id+'@'+version,Object.freeze({id,version,type:match.type,...(selection==='unique'?{selection}:{})}));
   return {id,version};
  },
  plan({recipe_id,version,structure,tab_id,expected_url,text}={}){
   const recipe=recipes.get(String(recipe_id)+'@'+String(version));
   if(!recipe)throw Error('recipe_not_registered');
   if(!Number.isInteger(tab_id)||tab_id<1||
     typeof expected_url!=='string'||!expected_url.startsWith('https://')||
     typeof text!=='string'||!text||text.length>2048)throw Error('recipe_envelope_invalid');
   if(!structure||typeof structure!=='object'||
     new URL(expected_url).origin!==structure.origin||!Array.isArray(structure.fields)||
     structure.truncated!==false||structure.fields.length>80)throw Error('form_structure_unreliable');
   const eligible=f=>f?.tag==='input'&&f.type===recipe.type&&
     f.disabled===false&&f.readonly===false&&!SECRET.test(String(f.autocomplete||''));
   const selection=recipe.selection??'first';
   let field_index=structure.fields.findIndex(eligible);
   if(selection==='unique'&&field_index>=0&&structure.fields.some((f,i)=>i>field_index&&eligible(f)))
    field_index=-2;
   // Opt-in comparison: no alternate result may change the governed plan.
   if(fieldSelector || (recipe.id==='generic.first-text' && recipe.version===1 && firstTextSelector)){
    const actual=fieldSelector ? fieldSelector(structure.fields,recipe.type,selection) : firstTextSelector(structure.fields);
    if(actual!==field_index)throw Error('form_recipe_inox_parity_mismatch');
   }
   if(field_index===-2)throw Error('form_recipe_field_ambiguous');
   if(field_index<0)throw Error('form_recipe_field_not_found');
   if(!supportsTextInput(editProfile,recipe.type))throw Error('form_recipe_edit_unsupported');
   return Object.freeze({capability:'browser.form.fill',arguments:Object.freeze({
     tab_id,field_index,expected_url,text,
   }),recipe_id:recipe.id,recipe_version:recipe.version});
  },
  describe(){return [...recipes.values()].map(x=>({...x}));},
 });
}
export function createDefaultFormRecipes(options){
const registry=createFormRecipeRegistry(options);
registry.register({id:'generic.first-text',version:1,match:{type:'text'}});
registry.register({id:'generic.first-email',version:1,match:{type:'email'}});
registry.register({id:'generic.unique-text',version:1,match:{type:'text'},selection:'unique'});
return registry;
}
export const FORM_RECIPES=createDefaultFormRecipes();
