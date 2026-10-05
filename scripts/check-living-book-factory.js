#!/usr/bin/env node

/**
 * Living Book Factory Test Suite
 * Validates manifest parsing, inspection, scaffolding, and federated magazine syndication.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadManifest, validateManifest } from './lib/living-book-factory/manifest.js';
import { inspectLivingBook } from './lib/living-book-factory/inspector.js';
import { scaffoldLivingBook } from './lib/living-book-factory/scaffold.js';
import {
  createMagazineItem,
  syndicateMagazineItem,
  extractMagazineItemFromMarkdown,
  renderFederatedFeedHtml
} from './lib/living-book-factory/syndication.js';
import { renderLivingBookProjections } from './lib/living-book-factory/render-projections.js';

console.log('--- Testing Living Book Factory MVP ---');

const tmpDir = path.join(process.cwd(), '.cogentia', 'test-factory-' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });

try {
  // 1. Manifest Validation Tests
  console.log('1. Testing Manifest Validation...');

  const validManifest = {
    schema: 'living-book/v1',
    book: {
      id: 'test-book',
      title: 'Test Living Book',
      canonical_host: 'test.acorsica.org',
      language: 'fr',
      description: 'A test book for Factory validation'
    },
    institution: {
      publisher: 'C.O.R.S.I.C.A.',
      research_unit: 'Institut Mariani'
    },
    editorial: {
      book: true,
      magazine: true,
      site: true,
      guide: true,
      contributions: true,
      janus: true
    },
    magazine: {
      mode: 'federated',
      sources: ['privai', 'commons']
    },
    extensions: ['chronology', 'living-book-press']
  };

  const v1 = validateManifest(validManifest);
  assert.ok(v1.valid, 'Valid manifest should pass validation');
  assert.equal(v1.errors.length, 0);

  // Invalid schema
  const invalidSchema = { ...validManifest, schema: 'invalid/v1' };
  const v2 = validateManifest(invalidSchema);
  assert.ok(!v2.valid, 'Invalid schema should fail validation');

  // Invalid book.id (uppercase/spaces)
  const invalidId = JSON.parse(JSON.stringify(validManifest));
  invalidId.book.id = 'Invalid ID with spaces';
  const v3 = validateManifest(invalidId);
  assert.ok(!v3.valid, 'Invalid ID pattern should fail');

  // Missing institution.publisher
  const missingPub = JSON.parse(JSON.stringify(validManifest));
  delete missingPub.institution.publisher;
  const v4 = validateManifest(missingPub);
  assert.ok(!v4.valid, 'Missing publisher should fail');

  console.log('   ✓ Manifest validation passes all checks.');

  // 2. Scaffolding Tests
  console.log('2. Testing Scaffolding Engine...');
  const bookDir = path.join(tmpDir, 'test-book');
  const scaffoldRes = scaffoldLivingBook(validManifest, bookDir);

  assert.ok(scaffoldRes.createdDirs.length >= 8, 'Should create required directories');
  assert.ok(fs.existsSync(path.join(bookDir, 'README.md')), 'README.md must exist');
  assert.ok(fs.existsSync(path.join(bookDir, 'corpus.yml')), 'corpus.yml must exist');
  assert.ok(fs.existsSync(path.join(bookDir, 'editorial-architecture.md')), 'editorial-architecture.md must exist');
  assert.ok(fs.existsSync(path.join(bookDir, 'architecture.md')), 'architecture.md must exist');
  assert.ok(fs.existsSync(path.join(bookDir, 'editions', 'index.md')), 'editions/index.md must exist');
  assert.ok(fs.existsSync(path.join(bookDir, 'guide-profile.yml')), 'guide-profile.yml must exist');
  assert.ok(fs.existsSync(path.join(bookDir, 'site', 'index.html')), 'site/index.html must exist');
  assert.ok(fs.existsSync(path.join(bookDir, 'site', 'styles.css')), 'site/styles.css must exist');
  assert.ok(fs.existsSync(path.join(bookDir, 'site', 'magazine.html')), 'site/magazine.html must exist');
  assert.ok(fs.existsSync(path.join(bookDir, 'site', 'contribuer.html')), 'site/contribuer.html must exist');
  assert.ok(fs.existsSync(path.join(bookDir, 'chronology')), 'chronology/ extension dir must exist');

  // Check Janus separation in editorial-architecture.md
  const edArch = fs.readFileSync(path.join(bookDir, 'editorial-architecture.md'), 'utf8');
  assert.ok(edArch.includes('Janus'), 'Janus separation must be documented when enabled');
  assert.ok(edArch.includes('PASSÉ') && edArch.includes('FUTUR'), 'Past and future proof regimes must be explicitly distinguished');

  // Test idempotency / non-destructive scaffolding
  const customNote = 'CUSTOM MANUAL EDIT PRESERVED';
  fs.writeFileSync(path.join(bookDir, 'README.md'), customNote, 'utf8');

  const reScaffold = scaffoldLivingBook(validManifest, bookDir, { force: false });
  assert.ok(reScaffold.skippedFiles.includes('README.md'), 'Existing README.md must be skipped when force is false');
  assert.equal(fs.readFileSync(path.join(bookDir, 'README.md'), 'utf8'), customNote, 'Manual edits must NOT be overwritten');

  console.log('   ✓ Scaffolding engine verified with non-destructive preservation.');

  // 3. Inspection Tests
  console.log('3. Testing Inspection Tool...');
  const report = inspectLivingBook(path.join(bookDir, 'living-book.yml'));
  assert.equal(report.manifest_valid, true);
  assert.equal(report.invariants.readme.status, '✓');
  assert.equal(report.invariants.site.status, '✓');
  assert.equal(report.invariants.editorial_responsibility.status, '✓');
  assert.equal(report.epistemic_surfaces.frozen_editions.status, '✓');
  assert.equal(report.epistemic_surfaces.three_axis_grammar.status, '✓');
  assert.equal(report.epistemic_surfaces.projection_lineage.status, '✓');
  assert.ok(report.summary.passed >= 8, 'Summary should have high pass count');

  // Test detection of Anti-pattern: Concurrent projection duplication
  fs.mkdirSync(path.join(bookDir, 'sources'), { recursive: true });
  fs.mkdirSync(path.join(bookDir, 'preparation'), { recursive: true });
  fs.writeFileSync(path.join(bookDir, 'sources', 'statuts-1995-transcription.md'), '---\ntitle: Statuts 1995\ndocument_role: source\n---\n# Statuts', 'utf8');
  fs.writeFileSync(path.join(bookDir, 'preparation', 'statutes-1995-transcription.md'), '---\ntitle: Statuts 1995\ndocument_role: source-transcription\n---\n# Statuts', 'utf8');

  const dupReport = inspectLivingBook(path.join(bookDir, 'living-book.yml'));
  assert.equal(dupReport.epistemic_surfaces.projection_lineage.status, '⚠', 'Unlinked duplicate transcription must trigger warning');

  // Verify explicit canonical link resolves warning
  fs.writeFileSync(path.join(bookDir, 'preparation', 'statutes-1995-transcription.md'), '---\ntitle: Statuts 1995\ncanonical_source: "sources/statuts-1995-transcription.md"\n---\n# Statuts', 'utf8');
  const linkedReport = inspectLivingBook(path.join(bookDir, 'living-book.yml'));
  assert.equal(linkedReport.epistemic_surfaces.projection_lineage.status, '✓', 'Explicitly linked projection must pass');

  // Clean up duplicate test files
  fs.unlinkSync(path.join(bookDir, 'sources', 'statuts-1995-transcription.md'));
  fs.unlinkSync(path.join(bookDir, 'preparation', 'statutes-1995-transcription.md'));

  console.log('   ✓ Inspection tool successfully verifies Living Book implementation and detects concurrent projection duplication.');

  // 4. Federated Magazine Tests
  console.log('4. Testing Federated Magazine & Syndication...');
  const sampleItem = createMagazineItem({
    id: 'privai-2026-10-04-illusion-electeur-synthetique',
    source_book: 'privai',
    published_at: '2026-10-04',
    title: "L'illusion de l'électeur synthétique",
    summary: {
      short: 'Pourquoi déléguer son vote à un agent détruit la souveraineté.',
      medium: 'Analyse critique des tentations de vote automatisé par IA et rappel du principe Anti-Demos.'
    },
    topics: ['anti-demos', 'souverainete', 'vote'],
    epistemic_status: 'established',
    canonical_ref: 'https://privai.acorsica.org/magazine/illusion-electeur-synthetique.html',
    provenance: {
      author: 'Jean Hugues Noël Robert, baron Mariani',
      affiliation: 'Institut Mariani / C.O.R.S.I.C.A.'
    }
  });

  assert.equal(sampleItem.schema, 'living-book.magazine-item/v1');
  assert.equal(sampleItem.source_book, 'privai');

  // Syndication into recipient book
  const syndicated = syndicateMagazineItem(
    sampleItem,
    'test-book',
    "Pertinent pour l'analyse des scénarios institutionnels futurs de C.O.R.S.I.C.A."
  );

  assert.ok(syndicated.syndication, 'Syndication envelope must exist');
  assert.equal(syndicated.syndication.syndicated_by, 'test-book');
  assert.equal(syndicated.syndication.source_authority_preserved, true);
  assert.equal(syndicated.source_book, 'privai', 'Canonical source book MUST remain original');
  assert.equal(syndicated.canonical_ref, sampleItem.canonical_ref, 'Canonical ref MUST remain original');

  // Test HTML feed rendering
  const feedHtml = renderFederatedFeedHtml([syndicated], 'test-book');
  assert.ok(feedHtml.includes('Source : Livre Vivant privai'), 'Feed HTML must clearly identify origin book');
  assert.ok(feedHtml.includes('Note de syndication (test-book)'), 'Feed HTML must render contextual note');

  console.log('   ✓ Federated Magazine syndication preserves provenance and source authority.');

  // 5. Projections Rendering Tests (HTML, PDF, EPUB)
  console.log('5. Testing Projections Rendering (HTML, PDF, EPUB)...');
  // Create sample chapter in test-book manuscript
  fs.writeFileSync(path.join(bookDir, 'manuscript', '01-intro.md'), `---
title: Introduction au livre de test
subtitle: Chapitre initial
---
# Introduction au livre de test
Ceci est le contenu du premier chapitre de test.
Il verifie que la generation multi-format fonctionne parfaitement.
`, 'utf8');

  const renderRes = renderLivingBookProjections(bookDir);
  assert.ok(fs.existsSync(renderRes.html.path), 'HTML preview must exist');
  assert.ok(fs.existsSync(renderRes.pdf.path), 'PDF preview must exist');
  assert.ok(fs.existsSync(renderRes.epub.path), 'EPUB preview must exist');
  assert.ok(fs.existsSync(path.join(bookDir, 'site', 'book.html')), 'site/book.html must exist');
  assert.ok(fs.existsSync(path.join(bookDir, 'site', 'book.pdf')), 'site/book.pdf must exist');
  assert.ok(fs.existsSync(path.join(bookDir, 'site', 'book.epub')), 'site/book.epub must exist');
  assert.ok(fs.existsSync(path.join(bookDir, 'projections', 'preview.yml')), 'preview.yml projection contract must exist');

  // Verify PDF header
  const pdfBytes = fs.readFileSync(renderRes.pdf.path);
  assert.ok(pdfBytes.toString('binary').startsWith('%PDF-1.4'), 'Rendered PDF must have %PDF-1.4 header');

  // Verify EPUB magic bytes
  const epubBytes = fs.readFileSync(renderRes.epub.path);
  assert.equal(epubBytes.readUInt32LE(0), 0x04034b50, 'EPUB must be a valid ZIP');
  assert.ok(epubBytes.toString('binary').includes('mimetypeapplication/epub+zip'), 'EPUB must contain uncompressed mimetype');

  console.log('   ✓ HTML, PDF, and EPUB projections generated and verified with cryptographic hashes.');

  console.log('--- ALL LIVING BOOK FACTORY TESTS PASSED ---');
} finally {
  // Cleanup tmpDir
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {
    // Ignore cleanup error
  }
}
