#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildResourceBatch } from './lib/living-book-factory/resource-build-batch.js';
import { renderResourceProjections } from './lib/living-book-factory/resource-projections.js';
import * as yaml from 'js-yaml';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lbf-resources-'));
const write = (p, value) => {
  const full = path.join(root, p);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, value);
};
const publicDoc = (title, body) => '---\nvisibility: public\ntitle: ' + title + '\n---\n' + body;
const a = { id: 'dossier', route: '/ressources/dossier.html', source: 'sources/dossier.md' };
const b = { id: 'evidence', route: '/ressources/evidence.html', source: 'sources/evidence.md' };
const disposition = (id, status) => ({
  schema: 'cogentia.delta-disposition/v0', id, sources: ['sources/secret.md'],
  summary: 'Test disposition', significance: 'medium', projection_relevance: 'low',
  disposition: status
});
const select = (book, resources, dispositions = [
  disposition('later', 'DEFERRED'), disposition('not-in-scope', 'REJECTED')
]) => write('projects/' + book + '/selection.yml', yaml.dump({resources, dispositions}));
const build = (book, output) => renderResourceProjections(path.join(root, 'projects', book),
  { selection: 'selection.yml', out: path.join(root, output) });
try {
  for (const book of ['first', 'second']) {
    write('projects/' + book + '/manifest.yml', yaml.dump({ book: { id: book, title: book } }));
    select(book, [a,b]);
  }
  write(a.source, publicDoc('Dossier', '# Hypothèse\n\n[preuve](evidence.md) [non sélectionné](secret.md) [externe](https://example.org) [invalide](javascript:alert%281%29)\n\n<script>alert(1)</script>\n\n![image](private.png)\n'));
  write(b.source, publicDoc('Preuve', 'Document.'));
  write('sources/secret.md', '---\nvisibility: private\ntitle: Secret\n---\nContenu secret');
  const first = build('first', 'out1');
  assert.deepEqual(first, build('first', 'out2'));
  assert.equal(fs.readFileSync(path.join(root, 'out1/receipt.json'), 'utf8'),
    fs.readFileSync(path.join(root, 'out2/receipt.json'), 'utf8'));
  const html = fs.readFileSync(path.join(root, 'out1/site/ressources/dossier.html'), 'utf8');
  assert.match(html, /href="\/ressources\/evidence.html"/);
  assert.match(html, /href="https:\/\/example.org"/);
  assert.match(html, /href="\/"/);
  assert.doesNotMatch(html, /secret\.md|private\.png|href="javascript:|<script>|github\.com/);
  assert.equal(first.unresolved.length, 3);
  assert.deepEqual(first.coverage, { scope:'declared-selection-only',
    selected:['dossier','evidence'], deferred:['later'], excluded:['not-in-scope'],
    unresolved_link_count:3 });
  assert.equal(first.resources[0].source_revision, null);
  assert.equal(first.selection_revision, null);
  assert.doesNotMatch(html, /Test disposition|sources\/secret.md/);
  assert.equal(fs.existsSync(path.join(root,'out1/site/receipt.json')), false);
  assert.throws(() => build('first', 'out1'), /already exists/);
  const second = build('second', 'out3');
  assert.equal(first.resources[0].sha256, second.resources[0].sha256);
  fs.appendFileSync(path.join(root,a.source), '\nUne nouvelle preuve.\n');
  const changed1 = build('first', 'out4');
  const changed2 = build('second', 'out5');
  assert.notEqual(first.resources[0].sha256, changed1.resources[0].sha256);
  assert.notEqual(second.resources[0].sha256, changed2.resources[0].sha256);
  assert.equal(changed1.resources[0].sha256, changed2.resources[0].sha256);
  fs.renameSync(path.join(root,a.source), path.join(root,'sources/moved.md'));
  const moved = {...a, source:'sources/moved.md'};
  select('first', [moved,b]);
  const afterMove = build('first', 'out6');
  assert.equal(afterMove.resources[0].id, a.id);
  assert.equal(afterMove.resources[0].route, a.route);
  assert.equal(afterMove.artifacts[0].sha256, changed1.artifacts[0].sha256);
  write('sources/unclassified.md', '# Not classified');
  fs.symlinkSync('/etc/passwd', path.join(root,'sources/outside.md'));
  const bad = [
    [moved, {...b,id:a.id}], [moved, {...b,route:a.route}],
    [moved, {...b,source:moved.source}], [{...a,source:'sources/missing.md'}],
    [{...a,source:'sources/secret.md'}], [{...a,source:'sources/unclassified.md'}],
    [{...a,source:'../outside.md'}], [{...a,source:'sources/outside.md'}],
    [{...a,route:'/ressources/index.html'}], [{...a,route:'/ressources/../x.html'}]
  ];
  for (const values of bad) {
    select('first', values);
    assert.throws(() => build('first','bad'));
    assert.equal(fs.existsSync(path.join(root,'bad')), false);
  }
  select('first',[moved,b],[disposition('wrong','INVENTED')]);
  assert.throws(() => build('first','bad'), /Delta Disposition/);
  assert.equal(fs.existsSync(path.join(root,'bad')), false);
  select('first',[moved,b]);
  fs.mkdirSync(path.join(root,'projects/first/site'));
  assert.throws(() => build('first','projects/first/site/new'), /existing site/);
  assert.throws(() => build('first','projects/first/edition-new'), /outside the book/);
  const git = (...args) => execFileSync('git', ['-C',root,...args], {
    stdio:['ignore','pipe','ignore'], encoding:'utf8'
  }).trim();
  git('init','-q');
  git('add','--','sources/moved.md','sources/evidence.md','projects/first/selection.yml');
  git('-c','user.name=Reality Test','-c','user.email=test@example.invalid',
    'commit','-qm','Sources');
  const revision = git('rev-parse','HEAD');
  const committed = build('first','out7');
  assert.equal(committed.resources[0].source_revision,revision);
  assert.equal(committed.selection_revision,revision);
  write('unrelated.txt','Not a dependency.');
  git('add','--','unrelated.txt');
  git('-c','user.name=Reality Test','-c','user.email=test@example.invalid',
    'commit','-qm','Unrelated');
  assert.deepEqual(committed,build('first','out8'));
  fs.appendFileSync(path.join(root,moved.source),'\\nUncommitted source.');
  const dirty = build('first','out9');
  assert.equal(dirty.resources[0].source_revision,null);
  assert.notEqual(dirty.resources[0].sha256,committed.resources[0].sha256);
  // Batch orchestration: two books share a source; the third is independent.
  const other = {id:'other',route:'/ressources/other.html',source:'sources/other.md'};
  write(other.source,publicDoc('Other','Independent.'));
  write('projects/third/manifest.yml',yaml.dump({book:{id:'third',title:'Third'}}));
  for (const [book, resources] of [['first',[moved,b]],['second',[moved,b]],['third',[other]]]) {
    write('projects/'+book+'/projections/resources-working.yml',yaml.dump({resources}));
  }
  // An ordinary book with no declared resource selection is not rebuilt.
  write('projects/legacy/manifest.yml',yaml.dump({book:{id:'legacy',title:'Legacy'}}));
  const cache=fs.mkdtempSync(path.join(os.tmpdir(),'lbf-cache-'));
  try {
    const batch=(plan=false)=>buildResourceBatch(root,{out:cache,plan}).books;
    assert.deepEqual(batch(true).map(x=>x.status),Array(3).fill('NEEDS_BUILD'));
    assert.equal(fs.readdirSync(cache).length,0);
    const built=batch();
    assert.deepEqual(built.map(x=>x.status),Array(3).fill('BUILT_VERIFIED'));
    assert.deepEqual(batch().map(x=>x.status),Array(3).fill('REUSED_VERIFIED'));
    write('unrelated.txt','A second unrelated change.');
    assert.deepEqual(batch().map(x=>x.status),Array(3).fill('REUSED_VERIFIED'));
    fs.appendFileSync(path.join(root,moved.source),'\\nNew shared fact.');
    assert.deepEqual(batch(true).map(x=>x.status),['NEEDS_BUILD','NEEDS_BUILD','REUSED_VERIFIED']);
    const changed=batch();
    assert.deepEqual(changed.map(x=>x.status),['BUILT_VERIFIED','BUILT_VERIFIED','REUSED_VERIFIED']);
    assert.equal(changed[2].directory,built[2].directory);
    fs.appendFileSync(path.join(changed[2].directory,'site/ressources/other.html'),'tampered');
    assert.throws(()=>batch(),/digest mismatch/);
  } finally { fs.rmSync(cache,{recursive:true,force:true}); }
  console.log('LIVING_BOOK_RESOURCES_REALITY_TEST_PASS');
} finally {
  fs.rmSync(root,{recursive:true,force:true});
}
