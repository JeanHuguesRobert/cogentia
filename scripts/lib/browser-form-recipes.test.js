import test from 'node:test';import assert from 'node:assert/strict';
import {createFormRecipeRegistry,FORM_RECIPES} from './browser-form-recipes.js';
const structure={origin:'https://example.org',truncated:false,fields:[
 {tag:'input',type:'password',disabled:false,readonly:false,autocomplete:'current-password'},
 {tag:'input',type:'text',disabled:false,readonly:false,autocomplete:''},
 {tag:'input',type:'email',disabled:false,readonly:false,autocomplete:''},
]};
const task={structure,tab_id:42,expected_url:'https://example.org/form',text:'NON_SECRET_TEST'};
test('new recipes select fields without any extension change',()=>{
 const a=FORM_RECIPES.plan({...task,recipe_id:'generic.first-text',version:1});
 const b=FORM_RECIPES.plan({...task,recipe_id:'generic.first-email',version:1});
 assert.equal(a.arguments.field_index,1);assert.equal(b.arguments.field_index,2);
 assert.equal(a.capability,'browser.form.fill');
 const reg=createFormRecipeRegistry();reg.register({id:'first-tel',version:1,match:{type:'tel'}});
 const t=reg.plan({...task,structure:{...structure,fields:[...structure.fields,{tag:'input',type:'tel',disabled:false,readonly:false,autocomplete:''}]},recipe_id:'first-tel',version:1});
 assert.equal(t.arguments.field_index,3);
});
test('untrusted recipes, bad origins and truncated DOM fail closed',()=>{
 const r=createFormRecipeRegistry();
 assert.throws(()=>FORM_RECIPES.plan({...task,structure:{...structure,fields:[{...structure.fields[1],autocomplete:'username'}]},recipe_id:'generic.first-text',version:1}));
 assert.throws(()=>r.register({id:'code',version:1,match:{type:'text',code:'fetch(...)'}}));
 r.register({id:'safe',version:1,match:{type:'text'}});
 assert.throws(()=>r.register({id:'safe',version:1,match:{type:'text'}}));
 for(const v of [{...task,expected_url:'http://example.org/form'},
   {...task,expected_url:'https://evil.example/form'},
   {...task,structure:{...structure,truncated:true}},
   {...task,structure:{...structure,fields:[structure.fields[0]]}}])
  assert.throws(()=>r.plan({...v,recipe_id:'safe',version:1}));
});
