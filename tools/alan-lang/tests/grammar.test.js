// Alan v0.2 / Cogentia #36 — GPT-6 under Jean Hugues Noël Robert's direction.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {parseAlan} from '../grammar.js';
import {start,resume,sourceHash} from '../run-reference.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(path.join(root,'examples/search.alan'),'utf8');
const fixture=JSON.parse(readFileSync(path.join(root,'examples/search.ast.json'),'utf8'));
test('Alan source parses to the exact canonical discriminated AST',()=>{
  const ast=parseAlan(source);
  assert.deepEqual(ast,fixture);
  assert.equal(sourceHash(ast),sourceHash(fixture));
});
test('literal source records with ref property remain literal fields',()=>{
  const ast=parseAlan('alan 0.2\nfn main\n  return result={ ref: "ordinary", data: [1, 2] }\nend\n');
  assert.equal(ast.functions[0].body[0].value.fields.result.kind,'record');
  assert.deepEqual(start(ast).result,{result:{ref:'ordinary',data:[1,2]}});
  assert.throws(()=>parseAlan('alan 0.2\nfn main\n  return data=[$nothing]\nend\n'),
    /ALAN_UNBOUND_REFERENCE/);
});
test('small strict syntax supports conditionals, loops, and nested literal data',()=>{
  const src=[
    'alan 0.2','use std.num','fn count limit','  n = 0',
    '  keep = call num.lt a=$n b=$limit','  while $keep',
    '    n = call num.add a=$n b=1',
    '    keep = call num.lt a=$n b=$limit','  end',
    '  if $keep','    fail code="never"','  else',
    '    return count=$n detail={ samples: [1, 2, 3], ref: "literal" }',
    '  end','end',''
  ].join('\n');
  const ast=parseAlan(src);
  const result=start(ast,{entry:'count',args:{limit:5}});
  assert.equal(result.type,'alan.terminal');
  assert.deepEqual(result.result,{count:5,detail:{samples:[1,2,3],ref:'literal'}});
});
test('parser rejects unknown commands, duplicate arguments, malformed structures, invalid versions',()=>{
  for(const [src,code] of [
    ['alan 0.1\n','ALAN_UNSUPPORTED_VERSION'],
    ['alan 0.2\nfn main\n  n = what(2)\nend\n','ALAN_INVALID_VALUE'],
    ['alan 0.2\nfn main\n  call foo a=1 a=2\nend\n','ALAN_DUPLICATE_ARGUMENT'],
    ['alan 0.2\nfn main\n  return value={ a: 1, a: 2 }\nend\n','ALAN_DUPLICATE_FIELD'],
    ['alan 0.2\nfn main\n  return data=[1, 2\nend\n','ALAN_UNBALANCED_LITERAL'],
    ['alan 0.2\nfn main\n  return value=2\n','ALAN_MISSING_END']
  ]) assert.throws(()=>parseAlan(src),new RegExp(code));
});
test('source-to-process-to-process flow: no tool execution, no replay of prior trace',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'alan-text-process-test-'));
  try{
    const suspension=JSON.parse(execFileSync(process.execPath,[
      path.join(root,'cli.js'),'start',path.join(root,'examples/search.alan'),
      path.join(root,'examples/search.args.json')
    ],{encoding:'utf8'}));
    assert.equal(suspension.type,'alan.suspension');
    assert.equal(suspension.trace.execution_performed,false);
    writeFileSync(path.join(dir,'s.json'),JSON.stringify(suspension));
    writeFileSync(path.join(dir,'r.json'),JSON.stringify({
      type:'alan.step_result',for_suspension:suspension.suspension_id,
      supplied_by:'caller',value:{results:[{title:'one'},{title:'two'}]},
      trace:{caller_mediated:true,direct_invocation_by_alan:false}
    }));
    const result=JSON.parse(execFileSync(process.execPath,[
      path.join(root,'cli.js'),'resume',path.join(root,'examples/search.alan'),
      path.join(dir,'s.json'),path.join(dir,'r.json')
    ],{encoding:'utf8'}));
    assert.equal(result.type,'alan.terminal');
    assert.deepEqual(result.result,{count:2});
    assert.equal(result.trace.filter(e=>e.event==='search_started').length,1);
    assert.equal(result.trace.filter(e=>e.event==='mcp_result_supplied').length,1);
  }finally{rmSync(dir,{recursive:true,force:true})}
});
test('recursive Alan function executes without a JavaScript recursive interpreter stack',()=>{
  const source=[
    'alan 0.2','use std.num','fn countdown n',
    '  done = call num.lt a=$n b=1',
    '  if $done','    return count=0','  else',
    '    prior = call num.sub a=$n b=1',
    '    result = call countdown n=$prior',
    '    count = call num.add a=$result.count b=1',
    '    return count=$count','  end','end'
  ].join('\n');
  const ast=parseAlan(source);
  const done=start(ast,{entry:'countdown',args:{n:7}});
  assert.equal(done.type,'alan.terminal');
  assert.deepEqual(done.result,{count:7});
  const limited=start(ast,{entry:'countdown',args:{n:7},bounds:{maxDepth:3}});
  assert.equal(limited.type,'alan.failure');
  assert.equal(limited.error.code,'ALAN_DEPTH_LIMIT');
});
test('canonical P4 staged proposal has typed named schemas and never performs a write',()=>{
  const source=[
    'alan 0.2','use std.mcp',
    'extern github.stage_patch',
    '  kind tool','  effect repository_write','  data public',
    '  policy P4','  mode staged_only',
    '  input { repo: string, path: string, patch: Patch }',
    '  output { proposal: PatchProposal }','end',
    'fn request repo path patch',
    '  proposal = mcp github.stage_patch repo=$repo path=$path patch=$patch',
    '  return proposal=$proposal','end'
  ].join('\n');
  const ast=parseAlan(source);
  const s=start(ast,{entry:'request',args:{repo:'r',path:'README.md',patch:{text:'mock'}}});
  assert.equal(s.type,'alan.suspension');
  assert.equal(s.reason,'human_review_required');
  assert.equal(s.trace.execution_performed,false);
  assert.equal(s.pending_call.policy.mode,'staged_only');
  assert.deepEqual(s.pending_call.input.patch,{text:'mock'});
  const unsafe=source.replace('policy P4','policy P1');
  assert.throws(()=>parseAlan(unsafe),/ALAN_EXTERN_POLICY_MISMATCH/);
  assert.throws(()=>parseAlan(source.replace('mode staged_only','mode immediate')),
    /ALAN_EXTERN_POLICY_MISMATCH/);
});

test('Side-style time is an injected logical value stable across an MCP suspension',()=>{
  const ast=parseAlan(readFileSync(path.join(root,'examples/frozen-time.alan'),'utf8'));
  const logicalTime='2026-11-23T09:00:00.000Z';
  const s=start(ast,{
    args:{query:'Inox'},
    context:{logical_time:logicalTime,packet_id:'CPKT-FROZEN-TIME'}
  });
  assert.equal(s.type,'alan.suspension');
  assert.equal(s.saved_state.context.logical_time,logicalTime);
  assert.equal(s.saved_state.frames.at(-1).locals.before,logicalTime);
  assert.equal(s.saved_state.slots[0].state,'pending');
  const r=JSON.parse(JSON.stringify(s));
  const terminal=resume(ast,r,{
    type:'alan.step_result',for_suspension:s.suspension_id,
    supplied_by:'caller',outcome:'resolved',value:{results:[1,2]},
    trace:{caller_mediated:true,direct_invocation_by_alan:false}
  });
  assert.equal(terminal.type,'alan.terminal');
  assert.deepEqual(terminal.result,{
    before:logicalTime,after:logicalTime,results:[1,2]
  });
  assert.equal(terminal.context.logical_time,logicalTime);
});

test('logical time cannot silently fall back to current wall-clock time',()=>{
  const ast=parseAlan(readFileSync(path.join(root,'examples/frozen-time.alan'),'utf8'));
  for(const context of [{},{logical_time:null},{logical_time:''}]){
    const failed=start(ast,{args:{query:'Inox'},context});
    assert.equal(failed.type,'alan.failure');
    assert.equal(failed.error.code,'ALAN_LOGICAL_TIME_REQUIRED');
  }
});

test('frozen time survives cold resume in a different Node process',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'alan-frozen-time-test-'));
  try{
    const source=path.join(root,'examples/frozen-time.alan');
    const args=path.join(root,'examples/search.args.json');
    const context=path.join(root,'examples/frozen-time.context.json');
    const suspension=JSON.parse(execFileSync(process.execPath,[
      path.join(root,'cli.js'),'start',source,args,context
    ],{encoding:'utf8'}));
    assert.equal(suspension.type,'alan.suspension');
    const time=suspension.saved_state.context.logical_time;
    assert.equal(suspension.saved_state.frames.at(-1).locals.before,time);
    writeFileSync(path.join(dir,'suspension.json'),JSON.stringify(suspension));
    writeFileSync(path.join(dir,'step.json'),JSON.stringify({
      type:'alan.step_result',
      for_suspension:suspension.suspension_id,
      supplied_by:'caller',value:{results:['A']},
      trace:{caller_mediated:true,direct_invocation_by_alan:false}
    }));
    const terminal=JSON.parse(execFileSync(process.execPath,[
      path.join(root,'cli.js'),'resume',source,
      path.join(dir,'suspension.json'),path.join(dir,'step.json')
    ],{encoding:'utf8'}));
    assert.equal(terminal.type,'alan.terminal');
    assert.deepEqual(terminal.result,{before:time,after:time,results:['A']});
    assert.equal(terminal.trace.filter(e=>e.event==='mcp_result_supplied').length,1);
  }finally{rmSync(dir,{recursive:true,force:true})}
});
