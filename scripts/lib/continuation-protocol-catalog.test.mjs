import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createContinuationProtocolCatalog,KNOWN_CONTINUATION_PROTOCOLS}
  from './continuation-protocol-catalog.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');

test('known protocols document distinct semantics, sourced contracts and implementation limits',()=>{
  const catalog=createContinuationProtocolCatalog();
  const all=catalog.list();
  assert.equal(all.length,8);
  assert.equal(new Set(all.map(x=>x.protocol_id)).size,all.length);
  for(const p of all){
    assert.match(p.protocol_id,/\/v[1-9][0-9]*$/);
    for(const key of ['title','semantics','completion','effect_boundary','implementation_stage','source'])
      assert.ok(typeof p[key]==='string'&&p[key].length>5,`${p.protocol_id}.${key}`);
    assert.ok(Object.isFrozen(p));
    assert.ok(Object.isFrozen(p.payload_example));
    if(p.payload_example.expected_response)
      assert.ok(Object.isFrozen(p.payload_example.expected_response));
    const source=resolve(root,p.source);
    if(p.source.startsWith('../inseme/')&&!existsSync(source))continue;
    assert.ok(existsSync(source),`${p.protocol_id}: missing source ${source}`);
    if(p.entrypoint)assert.ok(readFileSync(source,'utf8').includes(p.entrypoint),
      `${p.protocol_id}: missing entrypoint ${p.entrypoint}`);
  }
});

test('built-in examples are valid descriptions, never executable authority',()=>{
  const registry=createContinuationProtocolCatalog();
  for(const p of registry.list()){
    const r=registry.inspect({protocol_id:p.protocol_id,payload:p.payload_example});
    assert.equal(r.known,true);
    assert.equal(r.payload_valid,true,JSON.stringify(r));
    assert.equal(r.execution_authorized,false);
    assert.equal(r.status,'recognized_valid_description');
  }
});

test('wrong payload is invalid for known protocol, not a reason to discard unknown ones',()=>{
  const catalog=createContinuationProtocolCatalog();
  const bad=catalog.inspect({protocol_id:'cop.packet-task-step-cursor/v1',
    payload:{kind:'task_step',task_ref:'task:one',step_ref:'step:two',
      packet_ref:'packet:one',expected_version:-1}});
  assert.equal(bad.status,'known_protocol_payload_invalid');
  assert.equal(bad.payload_valid,false);
  const unknown=catalog.inspect({protocol_id:'user.unexpected-poetic-goal/v4',
    payload:{free_text:'Find a way forward'}});
  assert.equal(unknown.ok,true);
  assert.equal(unknown.known,false);
  assert.equal(unknown.status,'unrecognized_protocol');
  assert.equal(unknown.interpretation_required,true);
  assert.equal(unknown.execution_authorized,false);
});

test('self-describing extension is discoverable but not automatically installed or executable',()=>{
  const extension={protocol_id:'example.human-instruction/v1',
    title:'Human written instruction',
    semantics:'Continue the research using the recorded contextual traces.',
    completion:'Return the evidence and any new continuation.',
    payload_example:{instruction:'Proceed prudently'}};
  const catalog=createContinuationProtocolCatalog({extensions:[extension]});
  const entry=catalog.get(extension.protocol_id);
  assert.equal(entry.implementation_stage,'self_described_not_installed');
  assert.equal(catalog.inspect({protocol_id:extension.protocol_id,
    payload:extension.payload_example}).payload_valid,null);
  assert.equal(catalog.inspect({protocol_id:extension.protocol_id,
    payload:extension.payload_example}).execution_authorized,false);
  assert.equal(createContinuationProtocolCatalog().get(extension.protocol_id),null);
  assert.throws(()=>createContinuationProtocolCatalog({extensions:[extension,extension]}),
    /duplicate/);
  assert.throws(()=>createContinuationProtocolCatalog({extensions:[{
    ...extension,protocol_id:'cop.packet-task-step-cursor/v1'}]}),/duplicate/);
});

test('catalog inspection does not leak prompt bodies or accept unknown protocols as actions',()=>{
  const registry=createContinuationProtocolCatalog();
  const r=registry.inspect({protocol_id:'cogentia.typed-judgment/v1',
    payload:{question:'SECRET PERSONAL CONTEXT',expected_response:{required:['reason']},
      return_ref:'continuation:parent/result'}});
  assert.equal(r.status,'recognized_valid_description');
  assert.equal(JSON.stringify(r).includes('SECRET PERSONAL CONTEXT'),false);
  assert.equal(r.execution_authorized,false);
  assert.equal(registry.get('cogentia.process-command/v1').implementation_stage,
    'descriptor_only_no_process_executor');
});


test('unknown extensions with cyclic/unserializable examples fail before becoming catalogue entries',()=>{
  const item={protocol_id:'example.circular/v1',title:'Circular self-description',
    semantics:'A test protocol with invalid circular data.',
    completion:'No valid outcome.',payload_example:{}};
  item.payload_example.self=item.payload_example;
  assert.throws(()=>createContinuationProtocolCatalog({extensions:[item]}),
    /cyclic protocol metadata/);
  const unsupported={...item,protocol_id:'example.unsupported/v1',
    payload_example:{callback:()=>42}};
  assert.throws(()=>createContinuationProtocolCatalog({extensions:[unsupported]}),
    /non-JSON protocol metadata/);
});
