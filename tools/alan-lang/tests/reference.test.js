// Alan v0.2 / Cogentia #36 — GPT-6 under Jean Hugues Noël Robert's direction.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {start,resume,sourceHash} from '../run-reference.js';
import {validate} from '../validate.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixture=JSON.parse(readFileSync(path.join(root,'examples/search.ast.json'),'utf8'));
const L=value=>({kind:'literal',value});
const R=(...path)=>({kind:'reference',path});
const O=fields=>({kind:'record',fields});
const C=(callee,bind,args)=>({op:'call',callee,bind,args});
const base=body=>({type:'alan.program',version:'0.2',
  uses:['std.num'],externs:[],functions:[{kind:'fn',name:'main',params:[],body}]});
test('strict AST: missing import, malformed reference, unknown op, no runtime guesses',()=>{
  assert.equal(validate(fixture).functions.size,2);
  assert.throws(()=>validate({...fixture,version:'0.1'}),/ALAN_UNSUPPORTED_VERSION/);
  assert.throws(()=>validate(base([{op:'bogus'}])),/ALAN_UNKNOWN_OP/);
  assert.throws(()=>validate(base([{op:'return',value:R('missing')}])),/ALAN_UNBOUND_REFERENCE/);
  assert.throws(()=>validate(base([C('num.add','x',{a:L(2)}),{op:'return',value:O({x:R('x')})}])),/ALAN_MISSING_ARGUMENT/);
  assert.throws(()=>validate({...base([
    C('num.add','x',{a:L(1),b:L(2)}),
    {op:'return',value:O({x:R('x')})}
  ]),uses:[]}),/ALAN_MISSING_IMPORT/);
});
test('literal record containing ref is not an AST reference',()=>{
  const program=base([{op:'return',value:O({data:O({ref:L('ordinary field')})})}]);
  assert.deepEqual(start(program).result,{data:{ref:'ordinary field'}});
});
test('direct-style pure computation with loop and conditional is deterministic',()=>{
  const program=base([
    {op:'assign',bind:'n',value:L(0)},
    C('num.lt','again',{a:R('n'),b:L(4)}),
    {op:'while',condition:R('again'),body:[
      C('num.add','n',{a:R('n'),b:L(1)}),
      C('num.lt','again',{a:R('n'),b:L(4)})
    ]},
    C('num.gt','high',{a:R('n'),b:L(3)}),
    {op:'if',condition:R('high'),then_body:[
      {op:'return',value:O({count:R('n')})}
    ],else_body:[{op:'fail',code:L('ALAN_LOW')}]}
  ]);
  const result=start(program);
  assert.equal(result.type,'alan.terminal');
  assert.deepEqual(result.result,{count:4});
  assert.equal(start(program).execution.steps,result.execution.steps);
  assert.equal(sourceHash(program),result.code_hash);
});
test('compute limit prevents infinite loops and non-Boolean condition fails deterministically',()=>{
  const program=base([{op:'while',condition:L(true),body:[]}]);
  const result=start(program,{bounds:{maxSteps:9}});
  assert.equal(result.type,'alan.failure');assert.equal(result.error.code,'ALAN_STEP_LIMIT');
  const wrong=start(base([{op:'if',condition:L(4),then_body:[]}]));
  assert.equal(wrong.error.code,'ALAN_TYPE_BOOLEAN');
});
test('nested MCP request suspends, preserves logical time and trace, resumes without replay',()=>{
  const context={packet_id:'CPKT-ALAN-TEST',mandate_ref:'mandate-test',budget_ref:'budget-test',
    trace_ref:'trace-test',logical_time:'2026-11-23T00:00:00Z'};
  const suspension=start(fixture,{args:{query:'Alan MCP'},context});
  assert.equal(suspension.type,'alan.suspension');
  assert.equal(suspension.reason,'caller_tool_call_required');
  assert.equal(suspension.pending_call.capability,'github.search');
  assert.deepEqual(suspension.pending_call.input,{q:'Alan MCP'});
  assert.equal(suspension.trace.execution_performed,false);
  assert.equal(suspension.saved_state.frames.length,2);
  assert.equal(suspension.saved_state.trace.length,1);
  assert.equal(suspension.saved_state.context.logical_time,context.logical_time);
  const supplied={type:'alan.step_result',for_suspension:suspension.suspension_id,
    supplied_by:'caller',value:{results:[{title:'A'},{title:'B'}]},
    trace:{caller_mediated:true,direct_invocation_by_alan:false,execution_performed:false}};
  const terminal=resume(fixture,JSON.parse(JSON.stringify(suspension)),supplied);
  assert.equal(terminal.type,'alan.terminal');assert.deepEqual(terminal.result,{count:2});
  assert.equal(terminal.trace.filter(e=>e.event==='search_started').length,1,
    'prior trace event is not duplicated');
  assert.equal(terminal.trace.filter(e=>e.event==='mcp_result_supplied').length,1);
  assert.equal(terminal.trace.at(-1).data.execution_reported_by_caller,false);
  assert.equal(terminal.context.packet_id,context.packet_id);
  assert.equal(terminal.context.logical_time,context.logical_time);
  assert.ok(terminal.execution.steps>suspension.saved_state.steps);
  assert.throws(()=>resume(fixture,suspension,{...supplied,for_suspension:'wrong'}),/ALAN_STEP_CORRELATION/);
  assert.throws(()=>resume(fixture,suspension,{...supplied,supplied_by:'Alan'}),/ALAN_STEP_CORRELATION/);
  assert.throws(()=>resume(fixture,suspension,{...supplied,value:{results:'not a list'}}),/ALAN_STEP_TYPE/);
  assert.throws(()=>resume({...fixture,uses:[]},suspension,supplied),/ALAN_MISSING_IMPORT/);
  const tampered=structuredClone(suspension);tampered.saved_state.frames[1].pc=0;
  assert.throws(()=>resume(fixture,tampered,supplied),/ALAN_STATE_CORRUPTED/);
});
test('true process boundary: suspension produced by one process resumed in another',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'alan-continuation-test-'));
  try{
    const suspension=JSON.parse(execFileSync(process.execPath,[
      path.join(root,'cli.js'),'start',path.join(root,'examples/search.ast.json'),
      path.join(root,'examples/search.args.json')
    ],{encoding:'utf8'}));
    writeFileSync(path.join(dir,'suspension.json'),JSON.stringify(suspension));
    const step={type:'alan.step_result',for_suspension:suspension.suspension_id,
      supplied_by:'caller',value:{results:[{title:'one'}]},
      trace:{caller_mediated:true,direct_invocation_by_alan:false}};
    writeFileSync(path.join(dir,'step.json'),JSON.stringify(step));
    const result=JSON.parse(execFileSync(process.execPath,[
      path.join(root,'cli.js'),'resume',path.join(root,'examples/search.ast.json'),
      path.join(dir,'suspension.json'),path.join(dir,'step.json')
    ],{encoding:'utf8'}));
    assert.equal(result.type,'alan.terminal');
    assert.deepEqual(result.result,{count:1});
    assert.equal(result.trace.filter(e=>e.event==='search_started').length,1);
    assert.equal(result.trace.filter(e=>e.event==='mcp_result_supplied').length,1);
  }finally{rmSync(dir,{recursive:true,force:true})}
});
test('P4 and P5 requests never execute an external effect',()=>{
  for(const level of ['P4','P5']){
    const program={...fixture,externs:[{...fixture.externs[0],
      name:'github.stage_patch',effect:level==='P4'?'repository_write':'destructive_action',
      policy:level,...(level==='P4'?{mode:'staged_only'}:{})}]};
    const copy=structuredClone(program);
    for(const fn of copy.functions)for(const op of fn.body)
      if(op.op==='mcp')op.capability='github.stage_patch';
    const result=start(copy,{args:{query:'Alan MCP'}});
    assert.equal(result.type,level==='P4'?'alan.suspension':'alan.failure');
    if(level==='P4'){
      assert.equal(result.reason,'human_review_required');
      assert.equal(result.trace.execution_performed,false);
    }else assert.equal(result.error.code,'ALAN_FORBIDDEN_CAPABILITY');
  }
});
test('two MCP suspensions preserve acquired slots, context and step budget',()=>{
  const program={...fixture,functions:[{
    kind:'fn',name:'main',params:[],
    body:[
      {op:'mcp',bind:'a',capability:'github.search',args:{q:L('first')}},
      {op:'mcp',bind:'b',capability:'github.search',args:{q:L('second')}},
      {op:'return',value:O({first:R('a'),second:R('b')})}
    ]
  }]};
  const context={logical_time:'2026-11-23T00:00:00Z',packet_id:'CPKT-TEST'};
  const first=start(program,{context,bounds:{maxSteps:3}});
  assert.equal(first.type,'alan.suspension');
  assert.equal(first.saved_state.slots.length,1);
  const delivered=x=>({
    type:'alan.step_result',for_suspension:x.suspension_id,supplied_by:'caller',
    value:{results:[]},trace:{caller_mediated:true,direct_invocation_by_alan:false}
  });
  const second=resume(program,first,delivered(first));
  assert.equal(second.type,'alan.suspension');
  assert.equal(second.saved_state.slots.length,2);
  assert.equal(second.saved_state.slots[0].state,'resolved');
  assert.equal(second.saved_state.slots[1].state,'pending');
  assert.equal(second.saved_state.context.logical_time,context.logical_time);
  assert.equal(second.saved_state.steps,2);
  const terminal=resume(program,second,delivered(second));
  assert.equal(terminal.type,'alan.terminal');
  assert.deepEqual(terminal.result,{first:{results:[]},second:{results:[]}});
  assert.equal(terminal.execution.steps,3);
  assert.equal(terminal.trace.filter(x=>x.event==='mcp_result_supplied').length,2);
  const bounded=start(program,{context,bounds:{maxSteps:2}});
  const boundedSecond=resume(program,bounded,delivered(bounded));
  const failed=resume(program,boundedSecond,delivered(boundedSecond));
  assert.equal(failed.type,'alan.failure');
  assert.equal(failed.error.code,'ALAN_STEP_LIMIT');
});
test('declared MCP input signatures are checked before a suspension',()=>{
  const invalid=start(fixture,{args:{query:45}});
  assert.equal(invalid.type,'alan.failure');
  assert.equal(invalid.error.code,'ALAN_INPUT_TYPE');
});
test('explicit caller refusal is terminal and attributable',()=>{
  const suspension=start(fixture,{args:{query:'Alan'}});
  const outcome=resume(fixture,suspension,{
    type:'alan.step_result',for_suspension:suspension.suspension_id,
    supplied_by:'caller',outcome:'refused',reason:'not permitted',
    trace:{caller_mediated:true,direct_invocation_by_alan:false}
  });
  assert.equal(outcome.type,'alan.failure');
  assert.equal(outcome.error.code,'ALAN_CAPABILITY_REFUSED');
  assert.equal(outcome.trace.at(-1).data.outcome,'refused');
});
