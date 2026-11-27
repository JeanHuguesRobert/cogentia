/** Same intent, image and semantic capability in both disposable engines. */
import assert from 'node:assert/strict';
import {createInoxComparisonPlanner} from '../lib/browser-inox-recipe.js';
import {FORM_PLANNER} from '../lib/browser-form-recipes.js';
import {prepareFormAssistRequest} from '../lib/browser-form-recipe-runner.js';
export async function proveInoxReplacement({directory,inspect,form,scope,readValue,expectedIndex,fieldType,semanticRole,expectedKind='plain',text='fixture-inox-only'}){
 const old=await readValue();
 assert.equal(typeof old,'string');
 assert.ok(old.length>0);
 assert.notEqual(old,text);
 const planner=await createInoxComparisonPlanner(directory);
 const input={...scope,inspect:args=>inspect.execute(args),operation:'replace-all',
  recipe_id:'generic.select-editable',...(fieldType===undefined?{}:{field_type:fieldType}),...(semanticRole===undefined?{}:{semantic_role:semanticRole}),selection:'unique',text,
  request_id:'fixture-inox-replace'};
 const reference=await prepareFormAssistRequest({...input,planner:FORM_PLANNER});
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


// A local fixture under a browser-local mapped Facebook subdomain.
// The page's personalized label is never returned from inspect.
export async function proveInoxSiteRole({directory,inspect,form,scope,evaluate}){
 const role='facebook.comment-composer',selector='#inox-site-fixture';
 try{
  await evaluate(`(() => {
   const parent=document.createElement('section');parent.id='inox-site-parent';
   parent.innerHTML='<div id="inox-site-fixture" role="textbox" contenteditable="true" aria-label="Commenter en tant que PRIVATE_FIXTURE_NAME">old draft</div><div id="inox-site-other" role="textbox" contenteditable="true" aria-label="Reply to PRIVATE_FIXTURE_NAME">untouched reply</div>';
   document.body.append(parent);
  })()`);
  const observed=await inspect.execute({...scope,action:'structure',include_element_identity:true});
  const expectedIndex=observed.fields.findIndex(f=>f.semantic_role===role);
  assert.ok(expectedIndex>=0);assert.equal(observed.fields.filter(f=>f.semantic_role===role).length,1);
  assert.ok(!JSON.stringify(observed).includes('PRIVATE_FIXTURE_NAME'));
  const readValue=()=>evaluate('document.querySelector("#inox-site-fixture").innerText');
  const proof=await proveInoxReplacement({directory,inspect,form,scope,readValue,expectedIndex,
   semanticRole:role,expectedKind:'contenteditable',text:'Corte — brouillon'});
  assert.equal(await evaluate('document.querySelector("#inox-site-other").innerText'),'untouched reply');
  const multiline='Premier paragraphe — été\n\nSecond paragraphe';
  const multilinePlan=await prepareFormAssistRequest({...scope,inspect:args=>inspect.execute(args),operation:'replace-all',
   selection:'unique',semantic_role:role,text:multiline,request_id:'fixture-facebook-paragraphs'});
  const multilineReceipt=await form.execute(multilinePlan.input.arguments);
  assert.equal(multilineReceipt.ok,true);assert.equal(multilineReceipt.submitted,false);
  const normalized=s=>s.replace(/\n{2,}/g,'\n\n').replace(/\n+$/,'');
  assert.equal(normalized(await readValue()),multiline);
  assert.equal(await evaluate('document.querySelector("#inox-site-other").innerText'),'untouched reply');

  const planner=await createInoxComparisonPlanner(directory);
  const input={...scope,inspect:args=>inspect.execute(args),operation:'replace-all',selection:'unique',
   semantic_role:role,text:'must not be written',request_id:'fixture-role-changed',planner};
  const pending=await prepareFormAssistRequest(input);
  await evaluate('document.querySelector("#inox-site-fixture").setAttribute("aria-label","Reply to PRIVATE_FIXTURE_NAME")');
  await assert.rejects(()=>form.execute(pending.input.arguments),e=>e.code==='BROWSER_ELEMENT_TARGET_STALE');
  assert.equal(normalized(await readValue()),multiline);
  await assert.rejects(()=>prepareFormAssistRequest(input),/field_not_found/);
  return {...proof,site_role:role,paragraphs_verified:true,role_changed_rejected:true,unrelated_editor_unchanged:true,labels_not_returned:true};
 }finally{await evaluate('document.querySelector("#inox-site-parent")?.remove()')}
}


export async function proveEditContext({inspect,scope,evaluate}){
 try{
  await evaluate(`(() => {
   const parent=document.createElement('section');parent.id='edit-context-fixture';
   parent.innerHTML='<section id="edit-scope"><div role="textbox" contenteditable="true" aria-label="Commenter en tant que PRIVATE_FIXTURE_NAME">published text</div><button type="button"><span>Annuler</span></button></section><section><div role="textbox" contenteditable="true" aria-label="Commenter en tant que PRIVATE_FIXTURE_NAME">independent draft</div></section>';
   document.body.append(parent);
  })()`);
  const observe=()=>inspect.execute({...scope,action:'structure',include_element_identity:true});
  const first=await observe();
  const candidates=first.fields.filter(f=>f.semantic_role==='facebook.comment-composer');
  assert.equal(candidates.length,2);
  assert.equal(candidates.filter(f=>f.edit_context).length,1);
  const editor=candidates.find(f=>f.edit_context),context=editor.edit_context;
  assert.equal(context.actionable,true);assert.equal(context.ancestor_distance,1);
  const button=first.fields.find(f=>f.element_target?.uid===context.cancel_uid);
  assert.equal(button?.tag,'button');
  assert.equal((await observe()).fields.find(f=>f.element_target?.uid===editor.element_target.uid).edit_context.scope_uid,context.scope_uid);
  assert.ok(!JSON.stringify(first).includes('PRIVATE_FIXTURE_NAME'));
  assert.ok(!JSON.stringify(first).includes('published text'));
  await evaluate('document.querySelector("#edit-scope button").remove()');
  assert.equal((await observe()).fields.filter(f=>f.edit_context).length,0);
  assert.equal(await evaluate('document.querySelector("#edit-scope [contenteditable]").innerText'),'published text');
  return {exclusive_scope:true,stable_uid:true,cancel_removed_observed:true,read_only:true};
 }finally{await evaluate('document.querySelector("#edit-context-fixture")?.remove()')}
}
