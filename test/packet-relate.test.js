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
