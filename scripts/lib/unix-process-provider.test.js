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

test('timeout terminates descendants, not just the parent shell', async () => {
  const { mkdtempSync, existsSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'cogentia-process-group-'));
  const marker = join(dir, 'orphan');
  try {
    const p = new UnixProcessProvider({timeoutMs: 80});
    const command = `(sleep 0.25; printf orphan > "${marker}") & wait`;
    const result = await p.invoke('host.process.run', {command});
    assert.equal(result.timeout, true);
    await new Promise(resolve => setTimeout(resolve, 320));
    assert.equal(existsSync(marker), false, 'descendant survived command timeout');
  } finally {
    rmSync(dir, {recursive:true, force:true});
  }
});

test('FIFO scheduler serializes commands by default', async () => {
  const p = new UnixProcessProvider();
  let active = 0, maximum = 0;
  const jobs = Array.from({length: 4}, (_, i) => p.enqueue(async () => {
    active++; maximum = Math.max(maximum, active);
    await new Promise(r => setTimeout(r, 15));
    active--; return i;
  }));
  assert.deepEqual(await Promise.all(jobs), [0,1,2,3]);
  assert.equal(maximum, 1);
});
test('FIFO scheduler supports bounded parallel execution', async () => {
  const p = new UnixProcessProvider({maxConcurrent: 2});
  let active = 0, maximum = 0;
  await Promise.all(Array.from({length: 4}, () => p.enqueue(async () => {
    active++; maximum = Math.max(maximum, active);
    await new Promise(r => setTimeout(r, 20)); active--;
  })));
  assert.equal(maximum, 2);
});
test('FIFO scheduler refuses requests beyond bounded queue', async () => {
  const p = new UnixProcessProvider({maxConcurrent:1,maxQueued:1});
  let release;
  const gate = new Promise(r => {release=r;});
  const running = p.enqueue(() => gate);
  const waiting = p.enqueue(async () => 2);
  await assert.rejects(p.enqueue(async () => 3), /host_process_queue_full/);
  release();
  assert.equal(await running, undefined);
  assert.equal(await waiting, 2);
});

test('shell can request external judgment without making the decision', async () => {
  const p = new UnixProcessProvider();
  const command = "printf '%s\\n' 'COGENTIA_JUDGMENT_REQUEST_V1:{\"question\":\"Proceed with test? \"}'";
  const result = await p.invoke('host.process.run', { command });
  assert.equal(result.ok, true);
  assert.equal(result.judgment.status, 'needs_judgment');
  assert.equal(result.judgment.request.question, 'Proceed with test? ');
});
test('invalid shell judgment produces diagnostic, never implied approval', async () => {
  const p = new UnixProcessProvider();
  const r = await p.invoke('host.process.run', { command: "printf '%s\\n' 'COGENTIA_JUDGMENT_REQUEST_V1:invalid'" });
  assert.equal(r.judgment.status, 'invalid_judgment_request');
});
