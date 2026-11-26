#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
const select = (book, resources) => write('projects/' + book + '/selection.yml', yaml.dump({resources}));
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
  select('first',[moved,b]);
  fs.mkdirSync(path.join(root,'projects/first/site'));
  assert.throws(() => build('first','projects/first/site/new'), /existing site/);
  console.log('LIVING_BOOK_RESOURCES_REALITY_TEST_PASS');
} finally {
  fs.rmSync(root,{recursive:true,force:true});
}
