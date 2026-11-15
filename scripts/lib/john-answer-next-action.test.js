import test from 'node:test';
import assert from 'node:assert/strict';
import {runJohnRequest} from './john-run.js';

const request={
  version:'john.request.v1',request_id:'jhn-pre-answer-reality-probe',
  principal:{id:'principal:jhn'},mandate:{id:'mandate:jhn:existing',version:'1'},
  budget:{id:'budget:john-test'},
  execution_budget:{max_steps:4,max_tool_calls:1,max_subagents:0,
    max_elapsed_ms:9000,max_external_effects:0,max_internal_effects:0},
  exposure:'read_only',capability:'corpus.search',
  input:{prompt:'Inspect a permitted source and report the result'},
  handler:{id:'governed.step_reasoner',kind:'governed_reasoner',
    allowed_capabilities:['corpus.search']},
};

test('John produces a real requested/receipt pair for a pre-answer read-only probe',async()=>{
  let calls=0;
  const cap={name:'corpus.search',kind:'tool',risk:'read_only',resultVisibility:'reasoner',costUnits:1,
    async execute({query}){calls++;return {excerpt:'verified:'+query}}};
  const events=await runJohnRequest(request,{
    requiredEvents:false,capabilities:[cap],allowedCapabilities:['corpus.search'],
    reasoner:{async nextStep(state){
      const observed=state.observations.find(x=>x.type==='capability_result');
      return observed?{kind:'answer',answer:observed.value.excerpt}:{
        kind:'answer',answer:'You should inspect the source',
        next_action:{capability:'corpus.search',input:{query:'MCP manifest'}}};
    }},
  });
  assert.equal(calls,1);
  assert.equal(events.find(e=>e.type==='john.run.completed')?.data?.result?.text,
    'verified:MCP manifest');
  const asked=events.filter(e=>e.type==='john.tool.requested');
  const receipts=events.filter(e=>e.type==='john.tool.receipt');
  assert.equal(asked.length,1);
  assert.equal(receipts.length,1);
  assert.equal(asked[0].data.source,'pre_answer_gate');
  assert.equal(receipts[0].data.source,'pre_answer_gate');
  assert.equal(receipts[0].data.capability,'corpus.search');
  assert.equal(events.find(e=>e.type==='john.accounting.settled')?.data?.tool_calls_count,1);
});

test('John refuses an unapproved proposed next action without an execution receipt',async()=>{
  let calls=0;
  const cap={name:'corpus.search',kind:'tool',risk:'read_only',resultVisibility:'reasoner',costUnits:1,
    async execute(){calls++;return {excerpt:'should never run'}}};
  const events=await runJohnRequest({...request,request_id:'jhn-pre-answer-denied'}, {
    requiredEvents:false,capabilities:[cap],allowedCapabilities:[],
    reasoner:{async nextStep(){return {kind:'answer',answer:'Proposed inspection',
      next_action:{capability:'corpus.search',input:{query:'secret'}}}}},
  });
  assert.equal(calls,0);
  assert.equal(events.some(e=>e.type==='john.tool.receipt'),false);
  assert.equal(events.some(e=>e.type==='john.run.completed'),false);
  assert.equal(events.find(e=>e.type==='john.run.failed')?.data?.data?.code,
    'answer_next_action_not_authorized');
});
