#!/usr/bin/env node
/**
 * FBF #238: adversarial regression tests for LivingBookRegistry.
 * Independent instances model separate worker processes, and corrupted persistence
 * MUST fail closed. This suite is expected to FAIL until the allocator is repaired.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LivingBookPress } from './lib/living-book-press/press.js';
import { LivingBookRegistry } from './lib/living-book-press/registry.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'living-press-fbf-'));
const issue = () => new LivingBookPress({registry: new LivingBookRegistry({storageDir: tmp})}).requestCopy({
  bookId: 'suicide-corse', editionId: '2026-09-20-n2'
});
try {
  // Separate processes also have separate in-memory instances:
  // reproducible without timing or non-deterministic concurrency.
  const first = issue();
  const second = issue();
  assert.notEqual(first.record.copy_id, second.record.copy_id,
    'P0: distinct registry instances must never allocate the same copy_id');
  const loaded = new LivingBookRegistry({storageDir:tmp});
  assert.equal(loaded.listRecords({bookId:'suicide-corse'}).length, 2,
    'Both registered copies must survive restart');

  // No silent recovery to empty sequence following corruption.
  const file = path.join(tmp, 'press-registry-suicide-corse.json');
  fs.writeFileSync(file, '{ corrupt JSON', 'utf8');
  assert.throws(() => new LivingBookRegistry({storageDir:tmp}),
    'Corrupted authoritative registry must fail closed');

  console.log('PASS — FBF #238 independent instance uniqueness and fail-closed recovery');
} finally {
  fs.rmSync(tmp, {recursive:true,force:true});
}
