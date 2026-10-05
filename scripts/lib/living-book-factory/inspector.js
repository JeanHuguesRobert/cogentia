/**
 * Living Book Factory — Inspector
 * Evaluates living-book/v1 implementation against declared manifest and canonical doctrine.
 */

import fs from 'node:fs';
import path from 'node:path';
import * as jsYaml from 'js-yaml';
import { loadManifest, validateManifest } from './manifest.js';

export function inspectLivingBook(targetPath) {
  let projectDir = path.resolve(targetPath);
  let manifestFile = null;

  if (fs.existsSync(projectDir) && fs.statSync(projectDir).isFile()) {
    manifestFile = projectDir;
    projectDir = path.dirname(projectDir);
  } else {
    const candidates = ['manifest.yml', 'manifest.yaml', 'living-book.yml', 'living-book.yaml', 'living-book.json'];
    for (const c of candidates) {
      const p = path.join(projectDir, c);
      if (fs.existsSync(p)) {
        manifestFile = p;
        break;
      }
    }
  }

  if (!manifestFile || !fs.existsSync(manifestFile)) {
    throw new Error(`No Living Book manifest found at: ${targetPath}`);
  }

  const { manifest } = loadManifest(manifestFile);
  const validation = validateManifest(manifest);

  const report = {
    book_id: manifest.book?.id || 'unknown',
    title: manifest.book?.title || 'Unknown Title',
    project_dir: projectDir,
    manifest_file: manifestFile,
    manifest_valid: validation.valid,
    validation_errors: validation.errors,
    validation_warnings: validation.warnings,
    invariants: {},
    extensions: {},
    epistemic_surfaces: {},
    operational_surfaces: {},
    summary: {
      passed: 0,
      warnings: 0,
      failed: 0
    }
  };

  function check(category, key, label, condition, statusIfFalse = '✗', details = '') {
    const passed = Boolean(condition);
    let status = passed ? '✓' : statusIfFalse;
    if (passed) {
      report.summary.passed++;
    } else if (statusIfFalse === '⚠') {
      report.summary.warnings++;
    } else {
      report.summary.failed++;
    }

    report[category][key] = {
      label,
      status,
      passed,
      details
    };
  }

  // 1. Invariants Coverage
  const hasReadme = fs.existsSync(path.join(projectDir, 'README.md'));
  check('invariants', 'readme', 'Project entry point (README.md)', hasReadme, '✗');

  const hasManuscript = fs.existsSync(path.join(projectDir, 'manuscript'));
  const hasManuscriptFiles = hasManuscript && fs.readdirSync(path.join(projectDir, 'manuscript')).length > 0;
  check('invariants', 'book', 'Durable Book/Manuscript surface', hasManuscriptFiles, '✗', hasManuscript ? 'manuscript/ present' : 'missing manuscript/');

  const hasMagazine = fs.existsSync(path.join(projectDir, 'magazine'));
  const hasMagazineFiles = hasMagazine && fs.readdirSync(path.join(projectDir, 'magazine')).length > 0;
  check('invariants', 'magazine', 'Continuous delta Magazine surface', hasMagazineFiles, '✗', hasMagazine ? 'magazine/ present' : 'missing magazine/');

  const hasSite = fs.existsSync(path.join(projectDir, 'site', 'index.html'));
  check('invariants', 'site', 'Public reading projection (site/index.html)', hasSite, '✗');

  const hasEditorialResp = Boolean(manifest.institution?.publisher);
  check('invariants', 'editorial_responsibility', 'Editorial responsibility declared', hasEditorialResp, '✗', manifest.institution?.publisher || '');

  const hasContributionSurface = fs.existsSync(path.join(projectDir, 'site', 'contribuer.html')) ||
                                 fs.existsSync(path.join(projectDir, 'contribuer.md')) ||
                                 fs.existsSync(path.join(projectDir, 'site', 'contribute.html'));
  check('invariants', 'contribution_boundary', 'Controlled contribution boundary surface', hasContributionSurface, '⚠', 'contribuer.html or contribuer.md');

  // 2. Declared Extensions
  const declaredExts = manifest.extensions || [];
  const isJanus = manifest.editorial?.janus === true;

  if (isJanus) {
    const hasEdArch = fs.existsSync(path.join(projectDir, 'editorial-architecture.md'));
    let janusDoc = false;
    if (hasEdArch) {
      const edArchText = fs.readFileSync(path.join(projectDir, 'editorial-architecture.md'), 'utf8');
      janusDoc = /janus/i.test(edArchText) && (/pass[ée]/i.test(edArchText) || /past/i.test(edArchText)) && (/futur/i.test(edArchText) || /future/i.test(edArchText));
    }
    check('extensions', 'janus', 'Janus dual proof regime (past vs future)', janusDoc, '⚠', 'Distinct past reconstruction and future scenarios');
  }

  const isFederatedMag = manifest.magazine?.mode === 'federated' || manifest.magazine?.mode === 'hybrid';
  if (isFederatedMag) {
    const fedDir = path.join(projectDir, 'magazine', 'federated');
    const hasFedDir = fs.existsSync(fedDir);
    const hasFedItems = hasFedDir && fs.readdirSync(fedDir).filter(f => f.endsWith('.json') || f.endsWith('.yml')).length > 0;
    check('extensions', 'federated_magazine', 'Federated Magazine items', hasFedItems, '⚠', hasFedItems ? 'Federated items present' : 'No syndicated items in magazine/federated/');
  }

  if (declaredExts.includes('chronology')) {
    const hasChronology = fs.existsSync(path.join(projectDir, 'chronology')) || fs.existsSync(path.join(projectDir, 'site', 'chronologie.html'));
    check('extensions', 'chronology', 'Chronology extension', hasChronology, '⚠', 'chronology/ or site/chronologie.html');
  }

  if (declaredExts.includes('people-registry')) {
    const hasPeople = fs.existsSync(path.join(projectDir, 'people')) || fs.existsSync(path.join(projectDir, 'people.yml')) || fs.existsSync(path.join(projectDir, 'people-registry.md'));
    check('extensions', 'people_registry', 'People registry extension', hasPeople, '⚠', 'people/ or registry file');
  }

  if (declaredExts.includes('accounting')) {
    const hasAccounting = fs.existsSync(path.join(projectDir, 'accounting')) || fs.existsSync(path.join(projectDir, 'accounting.md'));
    check('extensions', 'accounting', 'Accounting extension', hasAccounting, '⚠', 'accounting/ or accounting.md');
  }

  if (declaredExts.includes('living-book-press')) {
    const hasPress = fs.existsSync(path.join(projectDir, 'press.yml')) || fs.existsSync(path.join(projectDir, 'press'));
    check('extensions', 'living_book_press', 'Living Book Press extension', hasPress, '⚠', 'press config or directory');
  }

  if (declaredExts.includes('cases')) {
    const hasCases = fs.existsSync(path.join(projectDir, 'cases')) || fs.existsSync(path.join(projectDir, 'site', 'cases.html'));
    check('extensions', 'cases', 'Reality Cases extension', hasCases, '⚠', 'cases/ or site/cases.html');
  }

  // 3. Epistemic Surfaces
  const hasCorpusYml = fs.existsSync(path.join(projectDir, 'corpus.yml'));
  check('epistemic_surfaces', 'corpus_projection_distinction', 'Source vs projection distinction (corpus.yml)', hasCorpusYml, '⚠', 'corpus.yml distinguishes living corpus from projections');

  const hasEditions = fs.existsSync(path.join(projectDir, 'editions', 'index.md'));
  let editionsDetail = 'missing editions/index.md';
  if (hasEditions) {
    const edText = fs.readFileSync(path.join(projectDir, 'editions', 'index.md'), 'utf8');
    if (/aucun|none/i.test(edText)) {
      editionsDetail = 'living projection active (no frozen edition yet)';
    } else {
      editionsDetail = 'frozen editions registered';
    }
  }
  check('epistemic_surfaces', 'frozen_editions', 'Frozen edition registry (editions/index.md)', hasEditions, '⚠', editionsDetail);

  let correctionPathFound = false;
  if (fs.existsSync(path.join(projectDir, 'editorial-architecture.md'))) {
    const text = fs.readFileSync(path.join(projectDir, 'editorial-architecture.md'), 'utf8');
    correctionPathFound = /correction/i.test(text) && (/asym[ée]trie/i.test(text) || /tra[çc]ab/i.test(text));
  }
  check('epistemic_surfaces', 'correction_path', 'Visible correction path documented', correctionPathFound, '⚠', 'correction is first-class content');

  // Check 3-axis state grammar (epistemic ≠ institutional ≠ effect)
  const threeAxis = checkThreeAxisGrammar(projectDir);
  if (threeAxis.issues.length > 0) {
    check('epistemic_surfaces', 'three_axis_grammar', 'Three-axis state grammar (epistemic ≠ institutional ≠ effect)', false, '⚠', threeAxis.issues.join('; '));
  } else if (threeAxis.declarationsCount > 0) {
    check('epistemic_surfaces', 'three_axis_grammar', 'Three-axis state grammar (epistemic ≠ institutional ≠ effect)', true, '⚠', `${threeAxis.declarationsCount} valid declarations`);
  } else {
    check('epistemic_surfaces', 'three_axis_grammar', 'Three-axis state grammar (epistemic ≠ institutional ≠ effect)', true, '⚠', 'admissible where needed (minimum sufficient locality)');
  }

  // Check concurrent projection duplication anti-pattern
  const duplicationWarnings = checkConcurrentProjectionDuplication(projectDir);
  if (duplicationWarnings.length > 0) {
    check('epistemic_surfaces', 'projection_lineage', 'No unlinked concurrent projection duplication', false, '⚠', `Potential unlinked duplication: ${duplicationWarnings.join('; ')}. Designate canonical source in sources/ and point working projections back to it.`);
  } else {
    check('epistemic_surfaces', 'projection_lineage', 'No unlinked concurrent projection duplication', true, '⚠', 'canonical source → working projection hierarchy maintained');
  }

  // 4. Operational Surfaces
  const hasSiteStyles = fs.existsSync(path.join(projectDir, 'site', 'styles.css'));
  check('operational_surfaces', 'site_assets', 'Static site assets (site/styles.css)', hasSiteStyles, '✗');

  const hasGuideProfile = fs.existsSync(path.join(projectDir, 'guide-profile.yml'));
  check('operational_surfaces', 'guide_profile', 'Cogentia Guide profile (guide-profile.yml)', hasGuideProfile, '⚠');

  const hasDeployDir = fs.existsSync(path.join(projectDir, 'deploy'));
  let deployDetail = 'Not deployed (prepared state)';
  if (hasDeployDir) {
    deployDetail = 'Prepared in deploy/ (deployment requires authorized Act)';
  }
  check('operational_surfaces', 'deployment_perimeter', 'Deployment perimeter prepared without live claims', true, '✓', deployDetail);

  return report;
}

export function formatInspectReport(report) {
  const lines = [];
  lines.push(`=== Living Book Inspection: ${report.title} (${report.book_id}) ===`);
  lines.push(`Project Directory: ${report.project_dir}`);
  lines.push(`Manifest: ${report.manifest_file} (valid: ${report.manifest_valid ? 'yes' : 'no'})`);
  lines.push('');

  function printSection(title, obj) {
    lines.push(`## ${title}`);
    for (const [key, item] of Object.entries(obj)) {
      const details = item.details ? ` — ${item.details}` : '';
      lines.push(`  ${item.status} ${item.label}${details}`);
    }
    lines.push('');
  }

  printSection('Doctrine / Invariant Coverage', report.invariants);
  if (Object.keys(report.extensions).length > 0) {
    printSection('Declared Extensions', report.extensions);
  }
  printSection('Epistemic Surfaces', report.epistemic_surfaces);
  printSection('Operational Surfaces', report.operational_surfaces);

  lines.push(`Summary: ${report.summary.passed} passed, ${report.summary.warnings} warnings, ${report.summary.failed} failed.`);
  return lines.join('\n');
}

export function checkThreeAxisGrammar(projectDir) {
  const allowedEpistemic = ['ESTABLISHED', 'REPORTED', 'RECONSTRUCTED', 'INFERRED', 'HYPOTHESIS', 'SCENARIO', 'UNKNOWN'];
  const allowedInstitutional = ['DRAFT', 'PREPARATORY', 'PROPOSED', 'SUBMITTED', 'ADOPTED', 'REJECTED', 'WITHDRAWN', 'SUPERSEDED', 'EXPIRED', 'UNKNOWN', 'N/A'];
  const allowedEffect = ['NOT_EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'EFFECTIVE', 'SUSPENDED', 'CEASED', 'UNKNOWN', 'N/A'];

  const issues = [];
  let declarationsCount = 0;

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== '.git' && ent.name !== '.cogentia') {
        scanDir(full);
      } else if (ent.isFile() && ent.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
          if (m) {
            const fm = jsYaml.load(m[1]);
            if (fm && typeof fm === 'object') {
              if (fm.epistemic_status !== undefined) {
                declarationsCount++;
                const val = (typeof fm.epistemic_status === 'object' && fm.epistemic_status !== null ? fm.epistemic_status.value : fm.epistemic_status);
                if (typeof val === 'string' && !allowedEpistemic.includes(val.toUpperCase())) {
                  issues.push(`${ent.name}: invalid epistemic_status "${val}"`);
                }
              }
              if (fm.institutional_status !== undefined) {
                declarationsCount++;
                const val = (typeof fm.institutional_status === 'object' && fm.institutional_status !== null ? fm.institutional_status.value : fm.institutional_status);
                if (typeof val === 'string' && !allowedInstitutional.includes(val.toUpperCase())) {
                  issues.push(`${ent.name}: invalid institutional_status "${val}"`);
                }
              }
              if (fm.effect_status !== undefined) {
                declarationsCount++;
                const val = (typeof fm.effect_status === 'object' && fm.effect_status !== null ? fm.effect_status.value : fm.effect_status);
                if (typeof val === 'string' && !allowedEffect.includes(val.toUpperCase())) {
                  issues.push(`${ent.name}: invalid effect_status "${val}"`);
                }
              }
              // Check collision: ensure frontmatter status is not overwritten by domain 3-axis status
              if (typeof fm.status === 'string') {
                const upperStatus = fm.status.toUpperCase();
                if (['ESTABLISHED', 'EFFECTIVE', 'NOT_EFFECTIVE', 'RECONSTRUCTED', 'INFERRED'].includes(upperStatus)) {
                  issues.push(`${ent.name}: frontmatter "status" collides with 3-axis domain vocabulary`);
                }
              }
            }
          }
        } catch {
          // ignore yaml parse errors
        }
      }
    }
  }

  scanDir(projectDir);
  return { issues, declarationsCount };
}

export function checkConcurrentProjectionDuplication(projectDir) {
  const candidates = [];
  const searchDirs = ['sources', 'preparation', 'projections'];
  for (const d of searchDirs) {
    const fullDir = path.join(projectDir, d);
    if (!fs.existsSync(fullDir)) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(fullDir);
    } catch {
      continue;
    }
    for (const file of entries) {
      if (!file.endsWith('.md')) continue;
      const filePath = path.join(fullDir, file);
      try {
        if (!fs.statSync(filePath).isFile()) continue;
        const content = fs.readFileSync(filePath, 'utf8');
        const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        let fm = {};
        if (m) {
          fm = jsYaml.load(m[1]) || {};
        }
        candidates.push({
          dir: d,
          file,
          relPath: `${d}/${file}`,
          title: fm.title || file,
          role: fm.document_role || '',
          derivedFrom: Array.isArray(fm.derived_from) ? fm.derived_from : (fm.derived_from ? [fm.derived_from] : []),
          canonicalSource: fm.canonical_source || '',
          content
        });
      } catch {
        // ignore parse/read errors
      }
    }
  }

  const warnings = [];
  const transcriptions = candidates.filter(c =>
    c.file.toLowerCase().includes('transcription') ||
    (typeof c.role === 'string' && c.role.toLowerCase().includes('transcription')) ||
    (typeof c.title === 'string' && c.title.toLowerCase().includes('transcription'))
  );

  const seenPairs = new Set();
  for (let i = 0; i < transcriptions.length; i++) {
    for (let j = i + 1; j < transcriptions.length; j++) {
      const a = transcriptions[i];
      const b = transcriptions[j];
      if (a.dir === b.dir && a.file === b.file) continue;

      // Extract subject tokens, ignoring dates (e.g. 1995) and common repo/domain stopwords
      const stopwords = new Set(['corsica', 'mariani', 'institut', 'transcription', 'transcriptions', 'scan', 'scanned', 'document', 'source', 'sources']);
      const isYear = t => /^\d{4}$/.test(t);
      const aTokens = a.file.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(t => t.length >= 3 && !isYear(t) && !stopwords.has(t));
      const bTokens = b.file.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(t => t.length >= 3 && !isYear(t) && !stopwords.has(t));

      const stemNormalizedA = aTokens.map(t => t.replace(/es$/, '').replace(/s$/, ''));
      const stemNormalizedB = bTokens.map(t => t.replace(/es$/, '').replace(/s$/, ''));
      const overlap = stemNormalizedA.filter(t => stemNormalizedB.includes(t));

      const hasSubjectOverlap = overlap.length > 0;

      if (hasSubjectOverlap) {
        // Check if one explicitly links/points to the other
        const aMentionsB = a.content.includes(b.file) || (typeof a.canonicalSource === 'string' && a.canonicalSource.includes(b.file)) || a.derivedFrom.some(d => typeof d === 'string' && d.includes(b.file));
        const bMentionsA = b.content.includes(a.file) || (typeof b.canonicalSource === 'string' && b.canonicalSource.includes(a.file)) || b.derivedFrom.some(d => typeof d === 'string' && d.includes(a.file));

        if (!aMentionsB && !bMentionsA) {
          const pairKey = [a.relPath, b.relPath].sort().join(' vs ');
          if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey);
            warnings.push(pairKey);
          }
        }
      }
    }
  }

  return warnings;
}

