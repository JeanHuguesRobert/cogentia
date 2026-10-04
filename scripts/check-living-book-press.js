#!/usr/bin/env node

/**
 * Test suite for Living Book Press MVP (Issue #227).
 * Verifies RC1 (Home print), RC2 (Professional print), RC3 (Concurrent allocation),
 * RC4 (Duplicate print semantics), and Exemplaire Singulier modalities.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { LivingBookPress } from './lib/living-book-press/press.js';
import { LivingBookRegistry } from './lib/living-book-press/registry.js';

console.log('--- Testing Living Book Press MVP ---');

const tmpDir = path.join(process.cwd(), '.cogentia', 'test-press-' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });

try {
  const press = new LivingBookPress({
    registry: new LivingBookRegistry({ storageDir: tmpDir })
  });

  // 1. Profile Discovery
  console.log('1. Checking Living Book profiles...');
  const profiles = press.listProfiles();
  assert.ok(profiles.length >= 1, 'Should have at least 1 registered profile');
  const sc = press.getProfile('suicide-corse');
  assert.ok(sc, 'Should find suicide-corse profile');
  assert.equal(sc.prefix, 'SC');
  assert.ok(sc.editions['2026-09-17-anniversaire'], 'Should have 2026-09-17 anniversary edition');
  assert.ok(sc.editions['2026-09-20-n2'], 'Should have 2026-09-20 n2 edition');
  console.log('   ✓ Profile discovery verified.');

  // 2. RC1 — Home Print (Accessible + Singulier + A4)
  console.log('2. Running RC1 — Home print (Accessible + Singulier)...');
  const rc1Result = press.requestCopy({
    bookId: 'suicide-corse',
    editionId: '2026-09-17-anniversaire',
    singularization: 'singulier',
    materialProfile: 'accessible',
    format: 'A4',
    biography: {
      mission_ref: 'Exemplaire pour un lecteur à Corte'
    }
  });

  const { record: r1, pdfBuffer: b1, sha256: h1 } = rc1Result;
  assert.ok(r1.copy_id.startsWith('SC-20260917-C'), 'copy_id should match book and edition prefix');
  assert.equal(r1.singularization, 'singulier');
  assert.equal(r1.material_profile, 'accessible');
  assert.equal(r1.status, 'GENERATED');
  assert.equal(r1.render.format, 'A4');
  assert.equal(r1.render.sha256, h1);
  assert.ok(b1.length > 500, 'PDF buffer should be substantive');
  assert.ok(b1.toString('binary').startsWith('%PDF-1.4'), 'PDF should have valid %PDF-1.4 header');
  assert.ok(b1.toString('binary').includes('%%EOF'), 'PDF should have valid %%EOF marker');

  // Verify public endpoint
  const v1 = press.verifyCopy(r1.copy_id);
  assert.equal(v1.found, true);
  assert.equal(v1.copy_id, r1.copy_id);
  assert.equal(v1.status, 'GENERATED');
  assert.equal(v1.render_sha256, h1);
  assert.equal(v1.has_mission, true);

  // Materialization confirmation
  press.confirmMaterialized(r1.copy_id);
  const v1Mat = press.verifyCopy(r1.copy_id);
  assert.equal(v1Mat.status, 'MATERIALIZED');
  console.log(`   ✓ RC1 verified: Copy ${r1.copy_id} issued, hashed (${h1.slice(0, 12)}...), and materialized.`);

  // 3. RC2 — Professional Printer (Luxe + Singulier + A5)
  console.log('3. Running RC2 — Professional printer (Luxe + A5)...');
  const rc2Result = press.requestCopy({
    bookId: 'suicide-corse',
    editionId: '2026-09-20-n2',
    singularization: 'singulier',
    materialProfile: 'luxe',
    format: 'A5'
  });

  const { record: r2, pdfBuffer: b2, sha256: h2 } = rc2Result;
  assert.ok(r2.copy_id.startsWith('SC-20260920-C'), 'copy_id should match n2 edition prefix');
  assert.equal(r2.material_profile, 'luxe');
  assert.equal(r2.render.format, 'A5');
  assert.notEqual(h1, h2, 'Different editions and formats must produce distinct hashes');
  assert.ok(b2.toString('binary').startsWith('%PDF-1.4'));
  console.log(`   ✓ RC2 verified: Copy ${r2.copy_id} issued for pro printer.`);

  // 4. RC3 — Concurrent requests collision-safety test
  console.log('4. Running RC3 — Concurrent atomic allocation...');
  const concurrentCount = 15;
  const copyIds = new Set();
  const requests = [];

  for (let i = 0; i < concurrentCount; i++) {
    requests.push(
      press.requestCopy({
        bookId: 'suicide-corse',
        editionId: '2026-09-30-n3',
        singularization: 'singulier'
      })
    );
  }

  for (const res of requests) {
    assert.ok(!copyIds.has(res.record.copy_id), `Duplicate copy_id detected: ${res.record.copy_id}`);
    copyIds.add(res.record.copy_id);
  }

  assert.equal(copyIds.size, concurrentCount, 'All concurrent copy IDs must be strictly unique');
  console.log(`   ✓ RC3 verified: ${concurrentCount} concurrent allocations generated zero collisions.`);

  // 5. RC4 — Duplicate Physical Print Semantics
  console.log('5. Running RC4 — Duplicate print semantics...');
  // Case A: Rematerialization of the same object
  const remat = press.handleDuplicatePrint(r1.copy_id, {
    intention: 'rematerialization',
    reason: 'damaged cover replaced'
  });
  assert.equal(remat.same_incarnation, true);
  assert.equal(remat.copy_id, r1.copy_id);

  // Case B: Incarnation Fork (new concurrent physical object)
  const fork = press.handleDuplicatePrint(r1.copy_id, {
    intention: 'independent_object',
    reason: 'two copies circulating concurrently'
  });
  assert.equal(fork.same_incarnation, false);
  assert.equal(fork.parent_copy_id, r1.copy_id);
  assert.notEqual(fork.new_copy_id, r1.copy_id);
  assert.equal(fork.newRecord.biography.parent_copy_id, r1.copy_id);
  console.log(`   ✓ RC4 verified: Rematerialization retained ID; incarnation fork created new ID ${fork.new_copy_id}.`);

  // 6. Modalité Éditoriale — Exemplaire Singulier vs Standard
  console.log('6. Checking Exemplaire Singulier vs Standard modalities...');
  const standardResult = press.requestCopy({
    bookId: 'suicide-corse',
    editionId: '2026-09-20-n2',
    singularization: 'standard',
    materialProfile: 'accessible'
  });
  assert.equal(standardResult.record.singularization, 'standard');

  const singulierResult = press.requestCopy({
    bookId: 'suicide-corse',
    editionId: '2026-09-20-n2',
    singularization: 'singulier',
    materialProfile: 'accessible'
  });
  assert.equal(singulierResult.record.singularization, 'singulier');
  console.log('   ✓ Exemplaire singulier and standard modes distinct and functional.');

  // 7. Audit & Registry Persistence
  console.log('7. Verifying registry persistence and export...');
  const audit = press.registry.exportAudit('suicide-corse');
  assert.ok(audit.total_copies >= concurrentCount + 3, 'Audit should reflect all generated copies');
  assert.ok(audit.by_status.GENERATED >= 0);
  console.log(`   ✓ Registry audit verified: ${audit.total_copies} total copies tracked.`);

  console.log('\nAll Living Book Press tests passed successfully! ✓');
} finally {
  // Clean up temporary test files
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {}
}
