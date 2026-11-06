/** FBF #291: daemon-owned data recipes over stable browser primitive. */
const TYPES=new Set(['text','email','search','tel','url','number']);
const SECRET=/username|password|one-time-code|cc-number|cc-csc/i;
export function createFormRecipeRegistry(){
 const recipes=new Map();
 return Object.freeze({
  register({id,version,match}={}){
   if(typeof id!=='string'||!/^[-a-z0-9.]{1,80}$/.test(id)||
    !Number.isSafeInteger(version)||version<1||!match||
    !TYPES.has(match.type)||Object.keys(match).some(k=>k!=='type')||
    recipes.has(id+'@'+version))throw Error('recipe_untrusted_or_duplicate');
   recipes.set(id+'@'+version,Object.freeze({id,version,type:match.type}));
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
   const field_index=structure.fields.findIndex(f=>f?.tag==='input'&&f.type===recipe.type&&
     f.disabled===false&&f.readonly===false&&!SECRET.test(String(f.autocomplete||'')));
   if(field_index<0)throw Error('form_recipe_field_not_found');
   return Object.freeze({capability:'browser.form.fill',arguments:Object.freeze({
     tab_id,field_index,expected_url,text,
   }),recipe_id:recipe.id,recipe_version:recipe.version});
  },
  describe(){return [...recipes.values()].map(x=>({...x}));},
 });
}
export const FORM_RECIPES=createFormRecipeRegistry();
FORM_RECIPES.register({id:'generic.first-text',version:1,match:{type:'text'}});
FORM_RECIPES.register({id:'generic.first-email',version:1,match:{type:'email'}});
