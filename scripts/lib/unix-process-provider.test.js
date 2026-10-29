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

test('nonzero exit is reported without confusing it with success', async () => {
  const r = await new UnixProcessProvider().invoke('host.process.run', {command:'exit 17'});
  assert.equal(r.ok,false); assert.equal(r.exit_code,17); assert.equal(r.timeout,false);
});
test('timeout is bounded and never reported as successful', async () => {
  const r = await new UnixProcessProvider({timeoutMs:75}).invoke('host.process.run', {command:'sleep 1'});
  assert.equal(r.ok,false); assert.equal(r.timeout,true); assert.notEqual(r.exit_code,0);
});
test('output buffer overflow fails with explicit truncation indication', async () => {
  const r = await new UnixProcessProvider({maxBuffer:512}).invoke('host.process.run', {command:'head -c 4096 /dev/zero'});
  assert.equal(r.ok,false); assert.equal(r.output_truncated,true); assert.notEqual(r.exit_code,0);
});
test('invalid timeouts and commands fail closed', async () => {
  const p = new UnixProcessProvider();
  await assert.rejects(p.invoke('host.process.run',{command:'echo yes',timeout_ms:-1}),/invalid timeout_ms/);
  await assert.rejects(p.invoke('host.process.run',{command:'  '}),/command must contain/);
});
