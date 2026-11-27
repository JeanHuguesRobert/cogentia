import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {siteEditorProjection,projectSiteEditorRole,facebookAdapterSource} from './browser-site-adapters.js';
import {compileUidStructure} from './browser-element-target.js';
import {compileNonSecretFormFill} from './browser-form-script.js';
import {createFormPlanner} from './browser-form-recipes.js';
import {createInoxComparisonPlanner} from './browser-inox-recipe.js';
const url='https://www.facebook.com/post/fixture',role='facebook.comment-composer',epoch='a'.repeat(32);
const target={browser_instance_id:'fixture',tab_id:7,frame_id:'top',document_epoch:epoch,uid:epoch+':1'};
function node(label,kind='rich'){
 const attrs={'aria-label':label,'role':kind==='rich'?'textbox':null,'contenteditable':kind==='rich'?'true':null};
 return {tagName:kind==='rich'?'DIV':'INPUT',type:'text',isContentEditable:kind==='rich',disabled:false,readOnly:false,
  isConnected:true,innerText:'old draft',getAttribute:k=>attrs[k]??null,setLabel(v){attrs['aria-label']=v},
  matches:selector=>selector==='[role="textbox"][contenteditable="true"]'&&kind==='rich'};
}
function environment(nodes,href=url){
 const selection={removeAllRanges(){},addRange(){}};
 const registry={epoch,elementUid:el=>epoch+':'+(nodes.indexOf(el)+1),resolveElementUid:uid=>nodes[Number(uid.split(':')[1])-1]};
 const doc={title:'Fixture',forms:[],querySelectorAll:s=>s==='iframe'?[]:s==='[role="textbox"][contenteditable="true"]'?nodes.filter(n=>n.isContentEditable):nodes,
  getSelection:()=>selection,createRange:()=>({selectNodeContents(){}}),
  execCommand(name,ui,text){if(name==='delete')doc.activeElement.innerText='';else if(name==='insertParagraph')doc.activeElement.innerText+='\n';else doc.activeElement.innerText+=text;return true}};
 for(const el of nodes)el.focus=()=>{doc.activeElement=el};
 const window={__cogentiaNavigationAssistant:{elementIdentity:registry,adapters:{},elementSignature:()=>({})}};
 return {document:doc,location:{href,origin:new URL(href).origin},window};
}
test('site selection matches exact HTTPS domain boundary and allowlists roles',()=>{
 for(const u of [url,'https://m.facebook.com','https://facebook.com'])assert.equal(siteEditorProjection(u).id,'facebook');
 for(const u of ['https://facebook.com.example.org','https://evilfacebook.com','http://facebook.com','https://facebook.com@evil.example','https://user@facebook.com','https://corsematin.com']){
  assert.equal(siteEditorProjection(u),null);assert.deepEqual(projectSiteEditorRole(u,role),{});
  assert.ok(!compileUidStructure(u).includes('function editorRole'));
 }
 assert.deepEqual(projectSiteEditorRole(url,'PRIVATE_PERSON'),{});
 assert.deepEqual(projectSiteEditorRole(url,role),{semantic_role:role});
});
test('canonical adapter and UID projection share recognition; no personalized labels or text returned',()=>{
 const french=node('Commenter en tant que PRIVATE_PERSON'),english=node('Comment as PRIVATE_PERSON'),reply=node('Répondre à PRIVATE_PERSON'),other=node('Search','plain');
 const env=environment([french,english,reply,other]);env.document.activeElement=french;
 const raw=runInNewContext(compileUidStructure(url),env);
 assert.deepEqual(Array.from(raw.fields,f=>f.semantic_role),[role,role,null,null]);
 runInNewContext(facebookAdapterSource(),env);
 assert.equal(env.window.__cogentiaNavigationAssistant.adapters.facebook.commentComposer().count,2);
 assert.ok(compileUidStructure(url).length<16000);
 assert.ok(!JSON.stringify(raw).includes('PRIVATE_PERSON'));assert.ok(!JSON.stringify(raw).includes('old draft'));
 assert.equal(raw.element_uids[0],target.uid);
});
test('role-specific plan selects among unrelated editors, rejects ambiguity and other origin',async()=>{
 const fields=[{tag:'div',contenteditable:true,disabled:false,readonly:false,semantic_role:role,element_target:target},
  {tag:'textarea',disabled:false,readonly:false,element_target:{...target,uid:epoch+':2'}}];
 const input={structure:{origin:new URL(url).origin,truncated:false,fields},expected_url:url,operation:'replace-all',selection:'unique',
  semantic_role:role,browser_instance_id:'fixture',tab_id:7,text:'fixture only'};
 const reference=createFormPlanner();
 const planners=[reference];
 if(process.env.COGENTIA_INOX_DIRECTORY)planners.push(await createInoxComparisonPlanner(process.env.COGENTIA_INOX_DIRECTORY));
 for(const planner of planners){
  assert.deepEqual(planner.plan(input),reference.plan(input));
  assert.equal(planner.plan(input).arguments.semantic_role,role);
  assert.deepEqual(planner.plan(input).arguments.element_target,target);
  assert.throws(()=>planner.plan({...input,semantic_role:undefined}),/ambiguous/);
  assert.throws(()=>planner.plan({...input,structure:{...input.structure,fields:[...fields,fields[0]]}}),/ambiguous/);
  assert.throws(()=>planner.plan({...input,expected_url:'https://example.org',structure:{...input.structure,origin:'https://example.org'}}),/role_unsupported/);
 }
});
test('role is checked on the same UID immediately before editing; no retry or substitute',()=>{
 const el=node('Comment as PRIVATE_PERSON'),env=environment([el]);
 const args={elementTarget:target,expectedUrl:url,text:'new draft',fieldKind:'contenteditable',semanticRole:role};
 const code=compileNonSecretFormFill(args);
 assert.equal(runInNewContext(code,env).ok,true);assert.equal(el.innerText,'new draft');
 el.setLabel('Reply to PRIVATE_PERSON');assert.equal(runInNewContext(code,env).reason,'element_role_changed');
 el.setLabel('Comment as PRIVATE_PERSON');el.focus=()=>{env.document.activeElement=el;el.setLabel('Reply to PRIVATE_PERSON')};
 assert.equal(runInNewContext(code,env).reason,'element_role_changed');assert.equal(el.innerText,'new draft');
 assert.throws(()=>compileNonSecretFormFill({...args,expectedUrl:'https://example.org'}),/semantic_role_invalid/);
 assert.throws(()=>compileNonSecretFormFill({...args,elementTarget:undefined,fieldIndex:0}),/semantic_role_invalid/);
});

test('post-edit role change reports unconfirmed effect, not a pre-edit stale target',()=>{
 const el=node('Comment as PRIVATE_PERSON'),env=environment([el]);
 env.document.execCommand=(name,ui,text)=>{if(name==='delete')el.innerText='';else {el.innerText=text;el.setLabel('Reply to PRIVATE_PERSON')}return true};
 const code=compileNonSecretFormFill({elementTarget:target,expectedUrl:url,text:'new draft',fieldKind:'contenteditable',semanticRole:role});
 assert.equal(runInNewContext(code,env).reason,'element_role_changed_after_edit');
 assert.equal(el.innerText,'new draft');
});

test('site role uses the default Inox planning route in a composed release',
 {skip:!process.env.COGENTIA_INOX_DIRECTORY},async()=>{
 const {prepareFormAssistRequest}=await import('./browser-form-recipe-runner.js');
 const fields=[{tag:'textarea',disabled:false,readonly:false,element_target:{...target,uid:epoch+':2'}},
  {tag:'div',contenteditable:true,disabled:false,readonly:false,semantic_role:role,element_target:target}];
 const req=await prepareFormAssistRequest({inspect:async()=>({origin:new URL(url).origin,truncated:false,fields}),
  expected_url:url,operation:'replace-all',selection:'unique',semantic_role:role,
  browser_instance_id:'fixture',tab_id:7,text:'fixture only',request_id:'role-default-inox'});
 assert.deepEqual(req.input.arguments.element_target,target);
 assert.equal(req.input.arguments.semantic_role,role);
});

test('editor context projects only a bounded cancellation relationship in its own scope',async()=>{
 const {editorContext}=await import('../../browser-stdlib/adapters/facebook-editor.js');
 const {projectEditorContext}=await import('./browser-site-adapters.js');
 const editor=node('Commenter en tant que PRIVATE_PERSON'),composer=node('Commenter en tant que PRIVATE_PERSON');
 const cancel={getAttribute:()=>null,innerText:'Annuler',getClientRects:()=>[{}],
   contains:n=>n===cancel,closest:()=>cancel};
 editor.contains=n=>n===editor;composer.contains=n=>n===composer;
 const scope={querySelectorAll:s=>s==='[contenteditable="true"]'?[editor]:[cancel],
  contains:n=>[editor,cancel,scope].includes(n)};
 const common={querySelectorAll:s=>s==='[contenteditable="true"]'?[editor,composer]:[cancel]};
 editor.parentElement=scope;scope.parentElement=common;composer.parentElement=common;
 const registry={elementUid:n=>epoch+':'+([scope,cancel].indexOf(n)+1)};
 const context=editorContext(editor,registry);
 assert.deepEqual(context,{scope_uid:epoch+':1',cancel_uid:epoch+':2',ancestor_distance:1,actionable:true});
 assert.equal(editorContext(composer,registry),null);
 assert.deepEqual(projectEditorContext(url,{...context,private_text:'discard me'},epoch),{edit_context:context});
 assert.deepEqual(projectEditorContext(url,{...context,cancel_uid:'b'.repeat(32)+':2'},epoch),{});
 assert.deepEqual(projectEditorContext('https://example.org',context,epoch),{});
 cancel.getClientRects=()=>[];assert.equal(editorContext(editor,registry),null);
 cancel.getClientRects=()=>[{}];cancel.closest=()=>null;
 assert.equal(editorContext(editor,registry).actionable,false);
});


test('Facebook replacement stops after ignored deletion; never appends to uncleared draft',()=>{
 const el=node('Comment as fixture'),env=environment([el]);
 const calls=[];
 env.document.execCommand=(name,ui,text)=>{calls.push(name);return true};
 const code=compileNonSecretFormFill({elementTarget:target,expectedUrl:url,text:'first\n\nsecond',fieldKind:'contenteditable',semanticRole:role});
 const receipt=runInNewContext(code,env);
 assert.equal(receipt.reason,'editor_clear_unconfirmed');
 assert.deepEqual(calls,['delete']);
 assert.equal(el.innerText,'old draft');
});
test('Facebook replacement uses explicit paragraph operations and independent normalized readback',()=>{
 const el=node('Comment as fixture'),env=environment([el]),calls=[];
 env.document.execCommand=(name,ui,text)=>{calls.push(name);
  if(name==='delete')el.innerText='';
  else if(name==='insertParagraph')el.innerText+='\n';
  else if(name==='insertText')el.innerText+=String(text).replace(/\n/g,'');
  return true;
 };
 const text='first\n\nsecond';
 const code=compileNonSecretFormFill({elementTarget:target,expectedUrl:url,text,fieldKind:'contenteditable',semanticRole:role});
 const receipt=runInNewContext(code,env);
 assert.equal(receipt.ok,true);assert.equal(receipt.insertedLength,text.length);
 assert.deepEqual(calls,['delete','insertText','insertParagraph','insertParagraph','insertParagraph','insertText']);
 assert.equal(el.innerText,'first\n\n\nsecond');
});
