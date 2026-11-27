/** Same intent, image and semantic capability in both disposable engines. */
import assert from 'node:assert/strict';
import {createInoxComparisonPlanner} from '../lib/browser-inox-recipe.js';
import {prepareFormAssistRequest} from '../lib/browser-form-recipe-runner.js';
export async function proveInoxReplacement({directory,inspect,form,scope,readValue,expectedIndex}){
 const old=await readValue();
 assert.equal(typeof old,'string');
 assert.ok(old.length>0);
 const text='fixture-inox-only';
 assert.notEqual(old,text);
 const planner=await createInoxComparisonPlanner(directory);
 const input={...scope,inspect:args=>inspect.execute(args),operation:'replace-all',
  recipe_id:'generic.select-input',field_type:'text',selection:'unique',text,
  request_id:'fixture-inox-replace'};
 const reference=await prepareFormAssistRequest(input);
 const actual=await prepareFormAssistRequest({...input,planner});
 assert.deepEqual(actual,reference);
 assert.ok(actual.input.arguments.element_target);
 assert.equal('field_index' in actual.input.arguments,false);
 const observed=await inspect.execute({...scope,action:'structure',include_element_identity:true});
 const selected=observed.fields[expectedIndex];
 assert.deepEqual(selected.element_target,actual.input.arguments.element_target);
 await assert.rejects(()=>prepareFormAssistRequest({...input,planner,
  inspect:async()=>({...observed,fields:[...observed.fields,selected]})}),/field_ambiguous/);
 const first=await prepareFormAssistRequest({...input,planner,selection:'first'});
 assert.deepEqual(first.input.arguments,actual.input.arguments);
 const receipt=await form.execute(actual.input.arguments);
 assert.equal(receipt.ok,true);assert.equal(receipt.submitted,false);
 assert.equal(receipt.inserted_length,text.length);
 assert.equal(await readValue(),text);
 return {operation:'replace-all',same_image:true,request_equal:true,uid_bound:true,
  ambiguity_rejected:true,replaced_nonempty:true,independent_readback:true,
  inserted_length:text.length,submitted:false};
}
