#!/usr/bin/env node
import assert from 'node:assert/strict';
import {reconnectDelayMs, nextFailureCount, MAX_RECONNECT_DELAY_MS, STABLE_CONNECTION_MS} from '../browser-extension/reconnect-policy.js';
assert.equal(reconnectDelayMs(1,1),2000);
assert.equal(reconnectDelayMs(2,1),4000);
assert.equal(reconnectDelayMs(3,1),8000);
assert.equal(reconnectDelayMs(30,1),MAX_RECONNECT_DELAY_MS);
assert.equal(reconnectDelayMs(30,0),45000);
assert.equal(reconnectDelayMs(1,0),1500);
assert.equal(nextFailureCount(3, 1000),4);
assert.equal(nextFailureCount(3, STABLE_CONNECTION_MS),1);
console.log('navigation reconnect policy: ok');
