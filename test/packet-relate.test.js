import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { relatePacket } from '../scripts/lib/packet-relate.js';

function fixture(fn){const root=fs.mkdtempSync(path.join(os.tmpdir(),'packet-relate-'));try{return fn(root);}finally{fs.rmSync(root,{recursive:true,force:true});}}
const write=(root,name,text)=>{const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);};
test('suggests existing and completed packets without mutations',()=>fixture(root=>{
  write(root,'.cogentia/continuations/a.json',JSON.stringify({id:'ctn-a',status:'completed',subject:'packet routing',description:'rattachement conversation paquet cognitif'}));
  write(root,'.cogentia/issues/issues/issue-00001.md','---\ntitle: Réconciliation conversation paquet\nstatus: open\n---\nDescription du rattachement conversation et paquets');
  const before=fs.readFileSync(path.join(root,'.cogentia/continuations/a.json'),'utf8');
  const x=relatePacket({text:'rattachement conversation paquet',roots:[root],source:'test'});
  assert.equal(x.read_only,true);assert.equal(x.packet_creation_assessed,false);
  assert.ok(x.candidates.length>=1);assert.ok(x.candidates.some(c=>c.status==='completed'));
  assert.ok(x.candidates.every(c=>c.relation==='semantic_candidate'&&c.decision==='review_required'));
  assert.equal(fs.readFileSync(path.join(root,'.cogentia/continuations/a.json'),'utf8'),before);
}));
test('excludes private dirs, explicit private visibility and symlink escape',()=>fixture(root=>{
  write(root,'research/private/hidden.md','---\ntitle: hidden secret\n---\nsecret packet routing');
  write(root,'research/restricted.md','---\ntitle: secret routing\nvisibility: private\n---\nsecret packet routing');
  write(root,'research/public.md','---\ntitle: Public packet routing\nvisibility: public\n---\nsecret packet routing');
  fs.symlinkSync(path.join(root,'research/private/hidden.md'),path.join(root,'research/link.md'));
  const x=relatePacket({text:'secret packet routing',roots:[root]});
  assert.deepEqual(x.candidates.map(c=>c.reference),[`${path.basename(root)}/research/public.md`]);
}));
test('requires meaningful input and does not confuse ranked match with authority',()=>fixture(root=>{
  assert.throws(()=>relatePacket({text:'  ',roots:[root]}));
  write(root,'research/note.md','---\ntitle: semantic packet matching\n---\nA matching sentence');
  const x=relatePacket({text:'semantic packet matching',roots:[root]});
  assert.equal(x.candidates[0].decision,'review_required');
  assert.ok(x.notices.some(n=>n.includes('No COP mandate')));
}));

import { packetRelateJudgmentRequest } from '../scripts/lib/packet-relate-judgment.js';
test('handoff preserves candidate provenance, multiple and zero allowed, dedupe stable',()=>fixture(root=>{
  write(root,'research/packet.md','---\ntitle: Packet continuation ownership\n---\npacket continuation ownership of cognitive work');
  const discovery=relatePacket({text:'packet continuation ownership',roots:[root]});
  const a=packetRelateJudgmentRequest(discovery,{input:'packet continuation ownership',source:'inline'});
  const b=packetRelateJudgmentRequest(discovery,{input:'packet continuation ownership',source:'inline'});
  assert.equal(a.dedupe_key,b.dedupe_key);
  assert.equal(a.kind,'judgment');
  assert.deepEqual(a.required_capabilities,['semantic_judgment']);
  assert.equal(a.expected_response.protocol,'cogentia.packet_relation_judgment.v1');
  assert.equal(a.context.discovery.candidates.length,1);
  assert.match(a.question,/no relation/);
  assert.equal(fs.readdirSync(root).length,1);
}));
test('handoff refuses no candidates',()=>fixture(root=>{
  const discovery=relatePacket({text:'imagination nouvelle',roots:[root]});
  assert.throws(()=>packetRelateJudgmentRequest(discovery,{input:'imagination nouvelle'}),/No candidates/);
}));

import { execFileSync } from 'node:child_process';
test('CLI preview stays read-only; emit deduplicates in real continuation store',()=>fixture(root=>{
  write(root,'registry.json',JSON.stringify({repos:[]}));
  write(root,'research/relate.md','---\ntitle: Cognitive packet continuation judgment\nvisibility: public\n---\nA conversation requests packet continuation judgment with sources.');
  const base=['scripts/cogentia.js','packet','relate','--text','cognitive packet continuation judgment','--root',root,'--registry',path.join(root,'registry.json'),'--json'];
  const run=more=>JSON.parse(execFileSync(process.execPath,[...base,...more],{encoding:'utf8',cwd:path.resolve('') }));
  const preview=run(['--judgment-preview']);
  assert.equal(preview.read_only,true);
  assert.ok(!fs.existsSync(path.join(root,'.cogentia/continuations')));
  const created=run(['--emit-continuation']);
  assert.equal(created.created,true);
  assert.match(created.continuation_id,/^ctn_[a-f0-9]+$/);
  const again=run(['--emit-continuation']);
  assert.equal(again.created,false);
  assert.equal(again.continuation_id,created.continuation_id);
  const store=path.join(root,'.cogentia/continuations');
  assert.equal(fs.readdirSync(store).length,1);
  const record=JSON.parse(fs.readFileSync(path.join(store,`${created.continuation_id}.json`),'utf8'));
  assert.equal(record.kind,'judgment');
  assert.equal(record.context.protocol,'cogentia.packet_relation_judgment.v1');
}));
