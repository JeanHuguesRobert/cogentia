#!/usr/bin/env node
/** Offline tests for bounded reconnection policy. No WhatsApp access or auth files. */
import assert from 'node:assert/strict';
import { createReconnectPolicy } from './lib/agent-jhn-whatsapp/reconnect-policy.js';

let clock = 0;
const policy = createReconnectPolicy({ now: () => clock, random: () => 0, jitterFraction: 0 });
assert.deepEqual(policy.nextDelay(), { delayMs: 5000, consecutiveFailures: 1 });
assert.deepEqual(policy.nextDelay(), { delayMs: 10000, consecutiveFailures: 2 });
policy.onOpen();
clock += 1000;
assert.deepEqual(policy.nextDelay(), { delayMs: 20000, consecutiveFailures: 3 }, 'short open must not reset backoff');
for (let i = 0; i < 30; i++) {
  assert.ok(policy.nextDelay().delayMs <= 15 * 60_000);
}
policy.onOpen();
clock += 61_000;
assert.deepEqual(policy.nextDelay(), { delayMs: 5000, consecutiveFailures: 1 }, 'stable session resets backoff');
const jitter = createReconnectPolicy({ random: () => 1 });
assert.equal(jitter.nextDelay().delayMs, 4000);
assert.equal(jitter.nextDelay().delayMs, 8000);
console.log('PASS: bounded exponential reconnect policy, short-cycle protection, cap, stable reset, jitter');
