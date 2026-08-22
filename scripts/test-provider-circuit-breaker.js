#!/usr/bin/env node
/**
 * test-provider-circuit-breaker.js — Unit test suite for ProviderCircuitBreaker
 */

import assert from "node:assert/strict";
import { createProviderCircuitBreaker } from "./lib/provider-circuit-breaker.js";

const cb = createProviderCircuitBreaker({
  quotaQuarantineMs: 500, // short for test
  networkQuarantineMs: 100,
});

// Test 1: Initial state is CLOSED and available
assert.equal(cb.isOpen("openai"), false);
assert.equal(cb.isAvailable("openai"), true);
assert.equal(cb.getStatus("openai").state, "CLOSED");

// Test 2: Quota failure (429) triggers OPEN state with quota quarantine
cb.recordFailure("openai", "Your project has reached its configured enforced spend limit.", 429);
assert.equal(cb.isOpen("openai"), true);
assert.equal(cb.isAvailable("openai"), false);
assert.equal(cb.getStatus("openai").state, "OPEN");
assert.equal(cb.getStatus("openai").reason, "quota_or_spend_limit");

// Test 3: Other providers remain unaffected
assert.equal(cb.isOpen("openrouter"), false);
assert.equal(cb.isAvailable("openrouter"), true);

// Test 4: OpenRouter 402 triggers OPEN state
cb.recordFailure("openrouter", "Insufficient credits", 402);
assert.equal(cb.isOpen("openrouter"), true);
assert.equal(cb.isAvailable("openrouter"), false);

// Test 5: Quarantine expiration transitions to HALF_OPEN
await new Promise(r => setTimeout(r, 550));
assert.equal(cb.getStatus("openai").state, "HALF_OPEN");
assert.equal(cb.isAvailable("openai"), true); // Half-open allows probe request
assert.equal(cb.isOpen("openai"), false);

// Test 6: Successful probe resets to CLOSED
cb.recordSuccess("openai");
assert.equal(cb.getStatus("openai").state, "CLOSED");
assert.equal(cb.getStatus("openai").failures, 0);

// Test 7: Snapshot exports all current provider states
const snap = cb.snapshot();
assert.ok(snap.openai);
assert.ok(snap.openrouter);
assert.equal(snap.openai.state, "CLOSED");
assert.equal(snap.openrouter.state, "HALF_OPEN");

console.log(JSON.stringify({
  ok: true,
  test: "provider_circuit_breaker",
  providers_tested: ["openai", "openrouter"],
  states_verified: ["CLOSED", "OPEN", "HALF_OPEN"],
  completed: true,
}, null, 2));
