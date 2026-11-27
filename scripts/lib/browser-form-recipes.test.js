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
test('opt-in comparison cannot alter the reference plan or bypass validation',()=>{
 let calls=0;
 const reg=createFormRecipeRegistry({firstTextSelector:()=>{calls++;return 0;}});
 reg.register({id:'generic.first-text',version:1,match:{type:'text'}});
 assert.throws(()=>reg.plan({...task,recipe_id:'generic.first-text',version:1}),/parity_mismatch/);
 assert.throws(()=>reg.plan({...task,expected_url:'https://other.example',recipe_id:'generic.first-text',version:1}),/structure_unreliable/);
 assert.equal(calls,1);
});


test('unique-text requires exactly one admissible field and leaves first-text unchanged',()=>{
 const req={...task,recipe_id:'generic.unique-text',version:1};
 assert.equal(FORM_RECIPES.plan(req).arguments.field_index,1);
 const duplicate={...structure,fields:[...structure.fields,structure.fields[1]]};
 assert.throws(()=>FORM_RECIPES.plan({...req,structure:duplicate}),/field_ambiguous/);
 assert.equal(FORM_RECIPES.plan({...req,structure:duplicate,recipe_id:'generic.first-text'}).arguments.field_index,1);
 assert.throws(()=>FORM_RECIPES.plan({...req,structure:{...structure,fields:[]}}),/field_not_found/);
 const r=createFormRecipeRegistry({fieldSelector:()=>0});
 r.register({id:'unique',version:1,match:{type:'text'},selection:'unique'});
 assert.throws(()=>r.plan({...req,recipe_id:'unique',structure:duplicate}),/parity_mismatch/);
});
