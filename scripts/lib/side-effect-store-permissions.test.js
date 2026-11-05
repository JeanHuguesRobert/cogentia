import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFileStore } from './side-effect-store.js';

test('COP authorization store is private on creation and on subsequent writes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cop-auth-perms-'));
  try {
    const file = path.join(dir, 'authorization.json');
    const store = createFileStore(file);
    store.putGrant({ authorization_id: 'test-1', status: 'granted' });
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    fs.chmodSync(file, 0o644);
    store.putGrant({ authorization_id: 'test-2', status: 'granted' });
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.ok(store.getGrant('test-1'));
    assert.ok(store.getGrant('test-2'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
