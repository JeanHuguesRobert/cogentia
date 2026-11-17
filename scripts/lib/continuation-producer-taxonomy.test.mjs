import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {classifyStoredContinuation,continuationResumeEvidence,
  summarizeStoredContinuationProducers,CONTINUATION_PRODUCERS,
  CONTINUATION_PRODUCTION_CLASSES} from './continuation-producer-taxonomy.mjs';

const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..');

test('producer-class names describe the cause of suspension, not the carrier or provider',()=>{
  assert.deepEqual(Object.keys(CONTINUATION_PRODUCTION_CLASSES),[
    'judgment_boundary','data_dependency','external_capability_wait',
    'checkpoint_resume','temporal_recurrence','composition','external_io']);
  for(const value of Object.values(CONTINUATION_PRODUCTION_CLASSES)){
    assert.ok(value.trigger);assert.ok(value.producer_mechanism);
    assert.ok(value.completion);
  }
});

test('catalog is grounded in existing source files, and does not introduce a producer-specific tool',()=>{
  const ids=new Set();
  for(const item of CONTINUATION_PRODUCERS){
    assert.ok(CONTINUATION_PRODUCTION_CLASSES[item.producer_class]);
    assert.ok(!ids.has(item.id),'duplicate catalog ID: '+item.id);
    ids.add(item.id);
    const location=resolve(repo,item.location);
    // The Cogentia repository must remain independently testable in CI:
    // source inspections of a sibling Inseme checkout are opportunistic.
    const sibling=item.location.startsWith('../inseme/');
    if(sibling&&!existsSync(location))continue;
    assert.equal(existsSync(location),true,'missing source: '+item.location);
    const source=readFileSync(location,'utf8');
    assert.ok(source.includes(item.entry),`missing source symbol ${item.entry} in ${item.location}`);
  }
});

test('legacy result-slot command is NOT an executable resumed computation',()=>{
  const c={kind:'index.document_role_judgment',status:'active',
    resume:{command:'node scripts/cogentia.js continuation resolve ctn_123 <result.json>'}};
  assert.equal(continuationResumeEvidence(c),'return_slot_only');
  const classified=classifyStoredContinuation(c);
  assert.equal(classified.producer_class,'judgment_boundary');
  assert.equal(classified.resume_evidence,'return_slot_only');
  assert.equal(classified.origin_verified,false);
  assert.equal(classifyStoredContinuation({kind:'unknown',title:'Important private research'}).status,
    'needs_producer_evidence');
  assert.equal(classifyStoredContinuation({kind:'routing'}).producer_class,null);
});

test('local checkpoint resume remains separate from COP task/authority',()=>{
  const c={kind:'corpus_sleep_cycle_continuation',status:'active',
    resume:{command:'node scripts/run-corpus-sleep-cycle.js --resume ctn_sample'}};
  assert.equal(classifyStoredContinuation(c).producer_class,'checkpoint_resume');
  assert.equal(continuationResumeEvidence(c),'local_command_unverified');
  assert.equal(continuationResumeEvidence({resumeTo:'handler:one'}),'named_handler_unverified');
  assert.equal(continuationResumeEvidence({}),'no_executable_resume_contract');
});

test('read-only aggregate never reveals questions, source bodies, subjects or bearer data',()=>{
  const rows=[{kind:'semantic-search',status:'active',question:'SECRET',
    context:{api_key:'SENSITIVE'},resume:{command:'continuation resolve ctn_one'}},
    {kind:'index.document_role_judgment',status:'resolved',question:'PRIVATE'},
    {kind:'routing',status:'active',title:'KNOWN SENSITIVE'}];
  const res=summarizeStoredContinuationProducers(rows);
  assert.equal(res.total,3);
  assert.deepEqual(res.by_class,{data_dependency:1,judgment_boundary:1,unclassified:1});
  assert.deepEqual(res.by_status,{active:2,resolved:1});
  assert.deepEqual(res.by_resumption_contract,{
    return_slot_only:1,no_executable_resume_contract:2});
  assert.equal(res.external_effects,0);
  for(const value of ['SECRET','SENSITIVE','PRIVATE','KNOWN SENSITIVE'])
    assert.ok(!JSON.stringify(res).includes(value));
  assert.equal(Object.keys(res).includes('continuations'),false);
});
