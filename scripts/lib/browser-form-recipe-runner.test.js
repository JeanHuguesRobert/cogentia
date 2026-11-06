import test from 'node:test';import assert from 'node:assert/strict';
import {prepareFormAssistRequest} from './browser-form-recipe-runner.js';
const structure={origin:'https://example.org',truncated:false,fields:[
 {tag:'input',type:'text',disabled:false,readonly:false,autocomplete:''},
 {tag:'input',type:'email',disabled:false,readonly:false,autocomplete:''},
]};
const input={inspect:async()=>structure,recipe_id:'generic.first-email',version:1,
 tab_id:51,expected_url:'https://example.org/form',text:'HELLO_NON_SECRET',request_id:'recipe-test-1'};
test('daemon recipe prepares exact existing John bounded mandate request',async()=>{
 const req=await prepareFormAssistRequest(input);
 assert.equal(req.capability,'browser.form.fill');
 assert.equal(req.input.arguments.field_index,1);
 assert.equal(req.input.arguments.text,'HELLO_NON_SECRET');
 assert.equal(req.handler.kind,'capability_once_bounded');
 assert.equal(req.execution_budget.max_external_effects,0);
 assert.equal(req.budget.id,'budget:mandate:jhn:form-assist');
});
test('invalid recipe or absent inspector produces no packet',async()=>{
 await assert.rejects(()=>prepareFormAssistRequest({...input,request_id:'spaces no'}));
 await assert.rejects(()=>prepareFormAssistRequest({...input,recipe_id:'unknown'}));
 await assert.rejects(()=>prepareFormAssistRequest({...input,inspect:null}));
});
