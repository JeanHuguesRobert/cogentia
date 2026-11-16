#!/usr/bin/env node
// FractaCognitive Reality Test: declarative editorial selection + safe fallback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as yaml from 'js-yaml';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'scripts/living-book.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'living-book-selection-'));
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function run(args, expected = 0) {
  const r = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status === 0 ? 0 : 1, expected, r.stderr + r.stdout);
  return r;
}
function write(project, relative, content) {
  const p = path.join(project, relative);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, 'utf8');
}
try {
  const manifest = [
    'schema: living-book/v1',
    'book:',
    '  id: ortatest',
    '  title: Orta Test',
    '  canonical_host: ortatest.acorsica.org',
    '  language: fr',
    'institution:',
    '  publisher: C.O.R.S.I.C.A.',
    '  editorial_director: Source-Declared Author',
    'editorial:',
    '  book: true',
    '  magazine: true',
    '  site: true',
    '  guide: false',
    '  janus: false',
    'magazine:',
    '  mode: local',
    'extensions:',
    '  - maps',
    'projection:',
    '  selection: projections/n1-working.yml',
    ''
  ].join('\n');
  const outside = path.join(tmp, 'orta.yml');
  fs.writeFileSync(outside, manifest);
  const book = path.join(tmp, 'projects/ortatest');
  const scaffold = JSON.parse(run(['scaffold', outside, '--out', book, '--json']).stdout);
  assert.ok(scaffold.createdFiles.includes('README.md'));
  assert.match(fs.readFileSync(path.join(book, 'README.md'), 'utf8'), /Source-Declared Author/);
  assert.doesNotMatch(fs.readFileSync(path.join(book, 'corpus.yml'), 'utf8'), /DNS check did not resolve/);
  assert.ok(!fs.existsSync(path.join(book, 'site/guide.html')));
  assert.ok(!fs.existsSync(path.join(book, 'guide-profile.yml')));
  assert.ok(!fs.readFileSync(path.join(book, 'site/index.html'), 'utf8').includes('href="guide.html"'));
  assert.ok(!fs.readFileSync(path.join(book, 'site/sitemap.xml'), 'utf8').includes('/guide.html'));

  write(book, 'manuscript/01-origines.md', '# Source du Livre\nL Orta dans le temps.\n');
  write(book, 'magazine/2026-11-16-echo.md', '# Première chronique\nMagazine du test.\n');
  write(book, 'annexes/notes.md', '# Note des Annexes\nSources du test.\n');
  const selection = [
    'schema: living-book.selection/v0',
    'chapters:',
    '  - manuscript/01-origines.md',
    'magazine:',
    '  - magazine/2026-11-16-echo.md',
    'annexes:',
    '  - annexes/notes.md',
    ''
  ].join('\n');
  write(book, 'projections/n1-working.yml', selection);
  const result = JSON.parse(run(['render', book, '--json']).stdout);
  assert.equal(result.sourceCount, 3);
  const siteBook = path.join(book, 'site/book.html');
  const html = fs.readFileSync(siteBook, 'utf8');
  for (const s of ['Source du Livre', 'Première chronique', 'Note des Annexes']) {
    assert.ok(html.includes(s), 'missing selected section: ' + s);
  }
  const contract = yaml.load(fs.readFileSync(path.join(book, 'projections/preview.yml'), 'utf8'));
  assert.deepEqual(contract.sources.map(s => s.part), ['Livre', 'Magazine', 'Annexes']);
  const initialHashes = ['html', 'pdf', 'epub'].map(x => digest(path.join(book, 'projections/preview.' + x)));
  run(['render', book, '--json']);
  assert.deepEqual(initialHashes, ['html', 'pdf', 'epub'].map(x => digest(path.join(book, 'projections/preview.' + x))),
    'working outputs must be byte-identical for unchanged sources and projection date');
  const originalSiteHash = digest(siteBook);
  for (const bad of [
    selection.replace('magazine/2026-11-16-echo.md', '../../../../etc/passwd'),
    selection.replace('magazine/2026-11-16-echo.md', 'magazine/not-found.md'),
    selection.replace('magazine/2026-11-16-echo.md', 'manuscript/01-origines.md')
  ]) {
    write(book, 'projections/n1-working.yml', bad);
    run(['render', book, '--json'], 1);
    assert.equal(digest(siteBook), originalSiteHash, 'failed selection must not corrupt old artifact');
  }
  write(book, 'projections/n1-working.yml', selection);
  const currentChapter = path.join(book, 'manuscript/01-origines.md');
  const original = fs.readFileSync(currentChapter, 'utf8');
  run(['render', book, '--json']);
  const pre = yaml.load(fs.readFileSync(path.join(book, 'projections/preview.yml'), 'utf8'));
  fs.appendFileSync(currentChapter, '\nNouvel apport factuel.\n');
  run(['render', book, '--json']);
  const post = yaml.load(fs.readFileSync(path.join(book, 'projections/preview.yml'), 'utf8'));
  assert.notEqual(pre.sources[0].sha256, post.sources[0].sha256, 'source change must invalidate provenance');
  write(book, 'projections/n1-working.yml', selection.replace('schema: living-book.selection/v0',
    'schema: living-book.selection/v0' + String.fromCharCode(10) + 'frozen: true'));
  run(['render', book, '--json'], 1);
  write(book, 'projections/n1-working.yml', selection);

  const inspect = JSON.parse(run(['inspect', book, '--json']).stdout);
  assert.equal(inspect.extensions.maps.status, '⚠', 'map declaration is not proof of map implementation');

  // Legacy layout without a selection remains supported.
  const legacy = path.join(tmp, 'projects/legacy');
  const legacyManifest = manifest.replace('id: ortatest', 'id: legacy').replace(
    '  selection: projections/n1-working.yml', '  selection:');
  fs.writeFileSync(path.join(tmp, 'legacy.yml'), legacyManifest);
  JSON.parse(run(['scaffold', path.join(tmp, 'legacy.yml'), '--out', legacy, '--json']).stdout);
  write(legacy, 'manuscript/01.md', '# Premier texte\nRégression.\n');
  const old = JSON.parse(run(['render', legacy, '--json']).stdout);
  assert.equal(old.sourceCount, 1);
  console.log('LIVING_BOOK_SELECTION_REALITY_TEST_PASS');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
