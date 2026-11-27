/** Same intent, image and semantic capability in both disposable engines. */
import assert from 'node:assert/strict';
import {createInoxComparisonPlanner} from '../lib/browser-inox-recipe.js';
import {prepareFormAssistRequest} from '../lib/browser-form-recipe-runner.js';
export async function proveInoxReplacement({directory,inspect,form,scope,readValue,expectedIndex,fieldType,expectedKind='plain',text='fixture-inox-only'}){
 const old=await readValue();
 assert.equal(typeof old,'string');
 assert.ok(old.length>0);
 assert.notEqual(old,text);
 const planner=await createInoxComparisonPlanner(directory);
 const input={...scope,inspect:args=>inspect.execute(args),operation:'replace-all',
  recipe_id:'generic.select-editable',...(fieldType===undefined?{}:{field_type:fieldType}),selection:'unique',text,
  request_id:'fixture-inox-replace'};
 const reference=await prepareFormAssistRequest(input);
 const actual=await prepareFormAssistRequest({...input,planner});
 assert.deepEqual(actual,reference);
 assert.ok(actual.input.arguments.element_target);
 assert.equal('field_index' in actual.input.arguments,false);
 assert.equal(actual.input.arguments.field_kind??'plain',expectedKind);
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
 return {operation:'replace-all',editor_kind:expectedKind,same_image:true,request_equal:true,uid_bound:true,
  ambiguity_rejected:true,replaced_nonempty:true,independent_readback:true,
  inserted_length:text.length,submitted:false};
}

/** Exercise different HTML materializations of the same semantic editor.
 * Only modifies disposable fixture DOM; caller's original field restored. */
export async function proveInoxEditors({directory,inspect,form,scope,evaluate,originalSelector}){
 const original=JSON.stringify(originalSelector);
 const results=[];
 try{
  for(const kind of ['textarea','contenteditable']){
   await evaluate(`(() => {
    document.querySelector(${original}).disabled=true;
    document.querySelector('#inox-editor-fixture')?.remove();
    const el=document.createElement(${JSON.stringify(kind==='textarea'?'textarea':'div')});
    el.id='inox-editor-fixture';
    if(${JSON.stringify(kind)}==='textarea')el.value='old textarea';
    else {el.setAttribute('contenteditable','true');el.textContent='old rich editor';}
    document.body.append(el);
   })()`);
   const observed=await inspect.execute({...scope,action:'structure',include_element_identity:true});
   const expectedIndex=observed.fields.length-1;
   const readValue=()=>evaluate(`(() => {const el=document.querySelector('#inox-editor-fixture');return el.tagName==='TEXTAREA'?el.value:el.innerText})()`);
   results.push(await proveInoxReplacement({directory,inspect,form,scope,readValue,expectedIndex,
    expectedKind:kind==='textarea'?'plain':'contenteditable',text:'Corte — été\nligne 2'}));
  }
  // Actual mixed editor observation, not a synthetic duplicate.
  await evaluate(`(() => {const el=document.createElement('textarea');el.id='inox-mixed-fixture';el.value='untouched second editor';document.body.append(el)})()`);
  const input={...scope,inspect:args=>inspect.execute(args),operation:'replace-all',
   selection:'unique',text:'must not be written',request_id:'fixture-inox-mixed'};
  const planner=await createInoxComparisonPlanner(directory);
  await assert.rejects(()=>prepareFormAssistRequest(input),/field_ambiguous/);
  await assert.rejects(()=>prepareFormAssistRequest({...input,planner}),/field_ambiguous/);
  assert.equal(await evaluate('document.querySelector("#inox-mixed-fixture").value'),'untouched second editor');
  assert.equal(await evaluate('document.querySelector("#inox-editor-fixture").innerText'),'Corte — été\nligne 2');
  results.push({mixed_editors_ambiguous:true,unchanged:true});
 }finally{
  await evaluate(`(() => {document.querySelector('#inox-mixed-fixture')?.remove();document.querySelector('#inox-editor-fixture')?.remove();document.querySelector(${original}).disabled=false;})()`);
 }
 return results;
}
