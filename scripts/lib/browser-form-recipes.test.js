import test from 'node:test';import assert from 'node:assert/strict';
import {createFormPlanner,FORM_PLANNER} from './browser-form-recipes.js';
const structure={origin:'https://example.org',truncated:false,fields:[
 {tag:'input',type:'password',disabled:false,readonly:false,autocomplete:'current-password'},
 {tag:'input',type:'text',disabled:false,readonly:false,autocomplete:''},
 {tag:'input',type:'email',disabled:false,readonly:false,autocomplete:''},
]};
const task={structure,tab_id:42,expected_url:'https://example.org/form',text:'NON_SECRET_TEST',
 recipe_id:'generic.select-input',version:1,field_type:'text',selection:'first'};
test('one parameterized recipe preserves first and unique choices and field types',()=>{
 assert.equal(FORM_PLANNER.plan(task).arguments.field_index,1);
 assert.equal(FORM_PLANNER.plan({...task,field_type:'email'}).arguments.field_index,2);
 const tel={...structure,fields:[...structure.fields,{...structure.fields[1],type:'tel'}]};
 assert.equal(FORM_PLANNER.plan({...task,field_type:'tel',structure:tel}).arguments.field_index,3);
 assert.equal(FORM_PLANNER.plan({...task,selection:'unique'}).arguments.field_index,1);
 assert.equal(FORM_PLANNER.plan(task).capability,'browser.form.fill');
});
test('old names, unsupported selectors, bad origins and truncated observations fail closed',()=>{
 for(const recipe_id of ['generic.first-text','generic.first-email','generic.unique-text','unknown'])
  assert.throws(()=>FORM_PLANNER.plan({...task,recipe_id}),/recipe_not_registered/);
 for(const v of [{field_type:'password'},{selection:'guess'},{selection:undefined},{field_type:undefined}])
  assert.throws(()=>FORM_PLANNER.plan({...task,...v}),/selection_invalid/);
 for(const v of [{expected_url:'http://example.org/form'},{expected_url:'https://evil.example/form'},
   {structure:{...structure,truncated:true}},{structure:{...structure,fields:[structure.fields[0]]}},
   {structure:{...structure,fields:[{...structure.fields[1],autocomplete:'username'}]}}])
  assert.throws(()=>FORM_PLANNER.plan({...task,...v}));
});
test('opt-in comparison cannot alter the reference plan or bypass validation',()=>{
 let calls=0;
 const p=createFormPlanner({fieldSelector:()=>{calls++;return 0;}});
 assert.throws(()=>p.plan(task),/parity_mismatch/);
 assert.throws(()=>p.plan({...task,expected_url:'https://other.example'}),/structure_unreliable/);
 assert.equal(calls,1);
});
test('unique selection refuses ambiguity, first selects first',()=>{
 const duplicate={...structure,fields:[...structure.fields,structure.fields[1]]};
 assert.throws(()=>FORM_PLANNER.plan({...task,selection:'unique',structure:duplicate}),/field_ambiguous/);
 assert.equal(FORM_PLANNER.plan({...task,structure:duplicate}).arguments.field_index,1);
 assert.throws(()=>FORM_PLANNER.plan({...task,structure:{...structure,fields:[]}}),/field_not_found/);
 const p=createFormPlanner({fieldSelector:()=>0});
 assert.throws(()=>p.plan({...task,selection:'unique',structure:duplicate}),/parity_mismatch/);
});
test('operation selects existing compatible route; replacement requires observed UID',()=>{
 const epoch='a'.repeat(32),target={browser_instance_id:'fixture',tab_id:42,frame_id:'top',
   document_epoch:epoch,uid:epoch+':1'};
 const replacement={...task,operation:'replace-all',browser_instance_id:'fixture',
   structure:{...structure,fields:[structure.fields[0],{...structure.fields[1],element_target:target},structure.fields[2]]}};
 const p=createFormPlanner();
 assert.equal(p.plan({...task,field_type:'email'}).arguments.field_index,2);
 assert.deepEqual(p.plan(replacement).arguments.element_target,target);
 assert.equal('field_index' in p.plan(replacement).arguments,false);
 assert.throws(()=>p.plan({...replacement,field_type:'email'}),/edit_unsupported/);
 assert.throws(()=>p.plan({...replacement,browser_instance_id:'other'}),/target_required/);
 assert.throws(()=>p.plan({...replacement,structure}),/target_required/);
 assert.throws(()=>p.plan({...task,operation:'unknown'}),/edit_unsupported/);
 assert.throws(()=>p.plan({...task,browser_instance_id:'fixture'}),/target_required/);
});
