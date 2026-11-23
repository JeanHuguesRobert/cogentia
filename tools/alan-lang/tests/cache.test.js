// Alan v0.2 work-local Slot cache probe, Cogentia #36.
// GPT-6 under Jean Hugues Noël Robert's direction (2026-11-23).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {parseAlan} from '../grammar.js';
import {start,resume,restart} from '../run-reference.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'examples/cache-ttl.alan');
const source=readFileSync(file,'utf8');
const program=parseAlan(source);
const logicalTime='2026-11-23T09:00:00.000Z';
const clock=(offset=0)=>new Date(Date.parse(logicalTime)+offset).toISOString();
const context={packet_id:'CPKT-ALAN-CACHE-TEST',logical_time:logicalTime};
function delivered(s,value,observedAt=null){
  return {
    type:'alan.step_result',for_suspension:s.suspension_id,supplied_by:'caller',
    outcome:'resolved',value,
    ...(observedAt?{observed_at:observedAt}:{}),
    trace:{caller_mediated:true,direct_invocation_by_alan:false,execution_performed:false}
  };
}
function first(){
  const s=start(program,{args:{key:'A'},context,asOf:clock()});
  assert.equal(s.type,'alan.suspension');
  assert.equal(s.pending_call.capability,'catalog.read');
  assert.equal(s.saved_state.slots.length,1);
  return s;
}
function barrier(s){
  const b=resume(program,s,delivered(s,{value:'first'},clock()),{asOf:clock(1000)});
  assert.equal(b.type,'alan.suspension');
  assert.equal(b.pending_call.capability,'checkpoint.wait');
  assert.equal(b.saved_state.slots[0].state,'resolved');
  const entry=b.saved_state.cache[s.pending_call.cache.key];
  assert.equal(entry.observed_at,clock());
  assert.equal(entry.valid_until,clock(60000));
  assert.equal(b.saved_state.slots[0].ordinal,0);
  assert.equal(b.saved_state.slots[0].value.value,'first');
  return b;
}
test('strict source cache contract: read-only declarations and exact nonnegative TTL',()=>{
  assert.deepEqual(program.externs[0].cache,{max_age_ms:60000});
  assert.throws(()=>parseAlan(source.replace('cache max_age_ms=60000','cache max_age_ms=-1')),
    /ALAN_INVALID_CACHE_TTL/);
  assert.throws(()=>parseAlan(source.replace('cache max_age_ms=60000','cache max_age_ms=1e3')),
    /ALAN_INVALID_CACHE_TTL/);
  assert.throws(()=>parseAlan(source.replace('cache max_age_ms=60000','cache max_age_ms=9007199254740992')),
    /ALAN_INVALID_CACHE_TTL/);
  assert.throws(()=>parseAlan(source.replace('  effect read_only','  effect repository_write')
    .replace('  policy P1','  policy P4\n  mode staged_only')),
    /ALAN_CACHE_EFFECT/);
});
test('cache hit: Side-style acquired result survives intervening suspension without replay',()=>{
  const s=first(),b=barrier(s);
  const done=resume(program,b,delivered(b,{ok:true}),{asOf:clock(59000)});
  assert.equal(done.type,'alan.terminal');
  assert.deepEqual(done.result,{
    first:'first',second:'first',before:logicalTime,after:logicalTime
  });
  assert.equal(done.trace.filter(e=>e.event==='slot_filled_from_cache').length,1);
  assert.equal(done.trace.filter(e=>e.event==='external_cache_expired').length,0);
  const filled=done.trace.find(e=>e.event==='slot_filled_from_cache');
  assert.equal(filled.data.ordinal,2,'the cache fills a distinct positional slot');
  assert.notEqual(filled.data.slot_id,s.pending_call.slot_id);
  assert.equal(done.trace.filter(e=>e.event==='mcp_result_supplied').length,2);
  assert.equal(done.context.logical_time,logicalTime);
  // Same external cache entry, but distinct Side-positioned slots.
  // The first result remains independent of the later cache lookup.
  // Slot 1 is the checkpoint read, and slot 2 is a cached fill.
  assert.equal(s.saved_state.slots[0].ordinal,0);
});
test('TTL boundary: external cache expires but the previously filled slot remains valid',()=>{
  const s=first(),b=barrier(s);
  const freshRequest=resume(program,b,delivered(b,{ok:true}),{asOf:clock(60000)});
  assert.equal(freshRequest.type,'alan.suspension');
  assert.equal(freshRequest.pending_call.capability,'catalog.read');
  assert.equal(freshRequest.pending_call.slot_ordinal,2);
  assert.equal(freshRequest.pending_call.cache.key,s.pending_call.cache.key);
  assert.equal(freshRequest.saved_state.slots[0].state,'resolved');
  assert.equal(freshRequest.saved_state.slots[0].value.value,'first');
  assert.notEqual(freshRequest.saved_state.slots[0].id,freshRequest.pending_call.slot_id);
  assert.equal(freshRequest.saved_state.trace.filter(e=>e.event==='external_cache_expired').length,1);
  assert.equal(freshRequest.saved_state.trace.filter(e=>e.event==='slot_invalidated').length,0);
  const done=resume(program,freshRequest,
    delivered(freshRequest,{value:'updated'},clock(60000)),{asOf:clock(61000)});
  assert.equal(done.type,'alan.terminal');
  assert.deepEqual(done.result,{
    first:'first',second:'updated',before:logicalTime,after:logicalTime
  });
  assert.equal(done.trace.filter(e=>e.event==='mcp_result_supplied').length,3);
  assert.equal(done.trace.filter(e=>e.event==='external_cache_expired').length,1);
  assert.equal(done.context.logical_time,logicalTime);
});
test('no ambient time: cannot start or resume cache work without explicit evaluation time',()=>{
  const noClock=start(program,{args:{key:'A'},context});
  assert.equal(noClock.type,'alan.failure');
  assert.equal(noClock.error.code,'ALAN_VALIDITY_TIME_REQUIRED');
  const s=first();
  assert.throws(()=>resume(program,s,delivered(s,{value:'first'},clock())),
    /ALAN_VALIDITY_TIME_REQUIRED/);
});
test('clock regression, malformed clock and future-dated acquisition are rejected',()=>{
  assert.throws(()=>start(program,{args:{key:'A'},context,asOf:'today'}),
    /ALAN_INVALID_INSTANT/);
  assert.throws(()=>start(program,{args:{key:'A'},context,asOf:'2026-02-31T09:00:00Z'}),
    /ALAN_INVALID_INSTANT/);
  const s=first();
  assert.throws(()=>resume(program,s,delivered(s,{value:'first'},clock()),{asOf:clock(-1)}),
    /ALAN_CLOCK_REGRESSION/);
  assert.throws(()=>resume(program,s,delivered(s,{value:'first'},clock(2000)),{asOf:clock(1000)}),
    /ALAN_FUTURE_OBSERVATION/);
  assert.throws(()=>resume(program,s,delivered(s,{value:'first'}),{asOf:clock(1000)}),
    /ALAN_OBSERVATION_REQUIRED/);
});
test('a late external result cannot silently be treated as fresh',()=>{
  const s=first();
  assert.throws(()=>resume(program,s,delivered(s,{value:'first'},clock()),{asOf:clock(60000)}),
    /ALAN_EXPIRED_RESULT/);
  const b=barrier(s);
  assert.equal(b.saved_state.slots[0].value.value,'first',
    'failed resume attempt never mutates the saved continuation');
});
test('cache zero-duration is never reused but a new result may be accepted at acquisition',()=>{
  const noReuse=parseAlan(source.replace('cache max_age_ms=60000','cache max_age_ms=0'));
  const firstSuspension=start(noReuse,{args:{key:'A'},context,asOf:clock()});
  const b=resume(noReuse,firstSuspension,
    delivered(firstSuspension,{value:'A'},clock()),{asOf:clock()});
  assert.equal(b.type,'alan.suspension');
  const c=resume(noReuse,b,delivered(b,{ok:true}),{asOf:clock()});
  assert.equal(c.type,'alan.suspension');
  assert.equal(c.pending_call.slot_ordinal,2);
});
test('a real process-boundary resume uses caller-supplied time, not the frozen logical clock',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'alan-slot-cache-process-'));
  try{
    const startArgs=[
      path.join(root,'cli.js'),'start',file,
      path.join(root,'examples/cache-ttl.args.json'),
      path.join(root,'examples/frozen-time.context.json'),clock()
    ];
    const s=JSON.parse(execFileSync(process.execPath,startArgs,{encoding:'utf8'}));
    writeFileSync(path.join(dir,'s.json'),JSON.stringify(s));
    writeFileSync(path.join(dir,'r.json'),JSON.stringify(delivered(s,{value:'old'},clock())));
    const firstResume=JSON.parse(execFileSync(process.execPath,[
      path.join(root,'cli.js'),'resume',file,
      path.join(dir,'s.json'),path.join(dir,'r.json'),clock(1000)
    ],{encoding:'utf8'}));
    assert.equal(firstResume.pending_call.capability,'checkpoint.wait');
    writeFileSync(path.join(dir,'s2.json'),JSON.stringify(firstResume));
    writeFileSync(path.join(dir,'r2.json'),JSON.stringify(delivered(firstResume,{ok:true})));
    const secondResume=JSON.parse(execFileSync(process.execPath,[
      path.join(root,'cli.js'),'resume',file,
      path.join(dir,'s2.json'),path.join(dir,'r2.json'),clock(65000)
    ],{encoding:'utf8'}));
    assert.equal(secondResume.type,'alan.suspension');
    assert.equal(secondResume.pending_call.slot_ordinal,2);
    assert.equal(secondResume.saved_state.slots[0].state,'resolved');
    assert.equal(secondResume.saved_state.context.logical_time,logicalTime);
    const missingClock=spawnSync(process.execPath,[
      path.join(root,'cli.js'),'resume',file,
      path.join(dir,'s2.json'),path.join(dir,'r2.json')
    ],{encoding:'utf8'});
    assert.equal(missingClock.status,1);
    assert.match(missingClock.stderr,/ALAN_VALIDITY_TIME_REQUIRED/);
  }finally{rmSync(dir,{recursive:true,force:true})}
});
test('cache identity includes the input: a different key is a fresh first generation',()=>{
  const altered=parseAlan(source.replace(
    'second = mcp catalog.read key=$key',
    'second = mcp catalog.read key="B"'));
  const s=start(altered,{args:{key:'A'},context,asOf:clock()});
  const b=resume(altered,s,delivered(s,{value:'A'},clock()),{asOf:clock(1000)});
  const c=resume(altered,b,delivered(b,{ok:true}),{asOf:clock(2000)});
  assert.equal(c.type,'alan.suspension');
  assert.deepEqual(c.pending_call.input,{key:'B'});
  assert.notEqual(c.pending_call.cache.key,s.pending_call.cache.key);
  assert.equal(c.pending_call.slot_ordinal,2);
  assert.equal(c.saved_state.trace.filter(x=>x.event==='slot_filled_from_cache').length,0);
  assert.equal(c.saved_state.trace.filter(x=>x.event==='external_cache_expired').length,0);
});
test('a continuation cannot roll its validity clock backward after a later resume',()=>{
  const s=first();
  const b=barrier(s); // Clock was advanced to +1 second.
  assert.throws(()=>resume(program,b,delivered(b,{ok:true}),{asOf:clock(500)}),
    /ALAN_CLOCK_REGRESSION/);
});
test('stored continuation integrity covers external cache metadata',()=>{
  const s=first();
  const b=barrier(s);
  const tampered=structuredClone(b);
  tampered.saved_state.cache[s.pending_call.cache.key].valid_until=clock(86400000);
  assert.throws(()=>resume(program,tampered,delivered(b,{ok:true}),{asOf:clock(60000)}),
    /ALAN_STATE_CORRUPTED/);
});


test('Side positional invalidation discards the entire suffix and deterministically rebuilds it',()=>{
  const s=first(),b=barrier(s);
  const c=resume(program,b,delivered(b,{ok:true}),{asOf:clock(60000)});
  assert.equal(c.type,'alan.suspension'); // Slot 2 is pending
  assert.deepEqual(c.saved_state.slots.map(x=>x.ordinal),[0,1,2]);
  assert.equal(c.saved_state.slots[0].state,'resolved');
  assert.equal(c.saved_state.slots[1].state,'resolved');
  const retry=restart(program,c,{invalidFrom:1,asOf:clock(61000)});
  assert.equal(retry.type,'alan.suspension');
  assert.equal(retry.pending_call.capability,'checkpoint.wait');
  assert.equal(retry.pending_call.slot_ordinal,1);
  assert.equal(retry.saved_state.slots[0].id,s.pending_call.slot_id);
  assert.equal(retry.saved_state.slots[0].value.value,'first');
  assert.notEqual(retry.saved_state.slots[1].id,b.pending_call.slot_id);
  assert.equal(retry.saved_state.slots.length,2);
  assert.equal(retry.saved_state.context.logical_time,logicalTime);
  assert.equal(retry.saved_state.trace.filter(x=>x.event==='slot_replayed').length,1);
  assert.ok(retry.saved_state.trace_history.length>=1);
  const later=resume(program,retry,delivered(retry,{ok:true}),{asOf:clock(62000)});
  assert.equal(later.type,'alan.suspension');
  assert.equal(later.pending_call.slot_ordinal,2);
  assert.equal(later.pending_call.capability,'catalog.read');
  // Slot 2 was discarded even though its key matched slot 0.
  assert.equal(later.saved_state.slots[0].value.value,'first');
  const done=resume(program,later,
    delivered(later,{value:'new'},clock(62000)),{asOf:clock(63000)});
  assert.equal(done.type,'alan.terminal');
  assert.deepEqual(done.result,{
    first:'first',second:'new',before:logicalTime,after:logicalTime
  });
});

test('invalidation from slot zero preserves no slots but preserves the action logical clock',()=>{
  const s=first(),b=barrier(s);
  const newStart=restart(program,b,{invalidFrom:0,asOf:clock(1500)});
  assert.equal(newStart.type,'alan.suspension');
  assert.equal(newStart.pending_call.slot_ordinal,0);
  assert.equal(newStart.pending_call.capability,'catalog.read');
  assert.notEqual(newStart.pending_call.slot_id,s.pending_call.slot_id);
  assert.equal(newStart.saved_state.slots.length,1);
  assert.equal(newStart.saved_state.context.logical_time,logicalTime);
  assert.equal(Object.keys(newStart.saved_state.cache).length,0);
});

test('pending last slot can be invalidated but an out-of-range suffix cannot',()=>{
  const s=first(),b=barrier(s);
  assert.throws(()=>restart(program,b,{invalidFrom:2,asOf:clock(1200)}),
    /ALAN_INVALID_SLOT_INDEX/);
  const rebuilt=restart(program,b,{invalidFrom:1,asOf:clock(1200)});
  assert.equal(rebuilt.type,'alan.suspension');
  assert.equal(rebuilt.pending_call.slot_ordinal,1);
  assert.notEqual(rebuilt.pending_call.slot_id,b.pending_call.slot_id);
  assert.equal(rebuilt.saved_state.slots[0].id,s.pending_call.slot_id);
});

test('serialized Side positional restart works in a second process',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'alan-ordinal-restart-'));
  try{
    const s=first(),b=barrier(s);
    writeFileSync(path.join(dir,'suspension.json'),JSON.stringify(b));
    const raw=execFileSync(process.execPath,[
      path.join(root,'cli.js'),'restart',file,
      path.join(dir,'suspension.json'),'0',clock(2000)
    ],{encoding:'utf8'});
    const r=JSON.parse(raw);
    assert.equal(r.type,'alan.suspension');
    assert.equal(r.pending_call.slot_ordinal,0);
    assert.equal(r.saved_state.context.logical_time,logicalTime);
    assert.notEqual(r.pending_call.slot_id,s.pending_call.slot_id);
  }finally{rmSync(dir,{recursive:true,force:true})}
});
