import test from 'node:test';
import assert from 'node:assert/strict';
import { UnixProcessProvider } from './unix-process-provider.js';
import { createHostCapabilityRouter } from './host-capability-router.js';

test('native Unix provider executes bounded command with identity', async () => {
  const p = new UnixProcessProvider({ timeoutMs: 3000 });
  const result = await p.invoke('host.process.run', { command: 'printf UNIX_PROVIDER_OK' });
  assert.equal(result.ok, true);
  assert.equal(result.exit_code, 0);
  assert.equal(result.stdout, 'UNIX_PROVIDER_OK');
  assert.ok(result.identity.uid >= 0);
});

test('router denies execution without identity and mandate', async () => {
  const router = createHostCapabilityRouter({ providerName: 'unix-process' });
  await assert.rejects(router.invoke('host.process.run', { command: 'printf forbidden' }), /identity_required/);
  await assert.rejects(router.invoke('host.process.run', { command: 'printf forbidden' }, { actor: 'test' }), /mandate_required/);
  await assert.rejects(router.invoke('host.process.run', { command: 'printf forbidden' }, {
    actor: 'test', mandate: 'test-mandate',
  }), /authorization_missing|authorization/);
});

test('Unix provider does not expose host filesystem capabilities', async () => {
  const p = new UnixProcessProvider();
  await assert.rejects(p.invoke('host.fs.read', {path:'/tmp'}), /unsupported_capability/);
});
