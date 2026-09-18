#!/usr/bin/env node
/**
 * Test Suite: Multi-Account X Publisher & Cascade Relay Invariants.
 */

import assert from "node:assert/strict";
import { X_ACCOUNTS, prepareSuvranuRelayPayload, dispatchToX, executeTwoStepRelay } from "./lib/x-publisher.js";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.stack || err.message}`);
    failed++;
  }
}

async function runAll() {
  console.log("==========================================================================");
  console.log(" 🧪 MULTI-ACCOUNT X PUBLISHER & CASCADE RELAY TESTS");
  console.log("==========================================================================\n");

  await test("Invariant 1: Three distinct account configurations exist", () => {
    assert.ok(X_ACCOUNTS.baronsmariani);
    assert.ok(X_ACCOUNTS.suvranu);
    assert.ok(X_ACCOUNTS.jhr);
    assert.equal(X_ACCOUNTS.baronsmariani.handle, "@baronsmariani");
    assert.equal(X_ACCOUNTS.suvranu.handle, "@suvranu");
    assert.equal(X_ACCOUNTS.jhr.handle, "@jhr");
  });

  await test("Invariant 2: Suvranu relay payload builds valid quote tweet thread", () => {
    const officialPost = { title: "Fiche 01 Autonomie", axis: "Institutions" };
    const mockUrl = "https://x.com/baronsmariani/status/123456";
    const relay = prepareSuvranuRelayPayload(officialPost, mockUrl);

    assert.equal(relay.account, "suvranu");
    assert.equal(relay.quote_tweet_url, mockUrl);
    assert.ok(relay.commentary_thread.length >= 3);
    for (const t of relay.commentary_thread) {
      assert.ok(t.length <= 280, `Tweet length should be <= 280 chars (was ${t.length})`);
    }
  });

  await test("Invariant 3: Two-step cascade execution (@baronsmariani -> @suvranu)", async () => {
    const officialPayload = {
      title: "Autonomie de Capacité & Maires Ruraux",
      axis: "Institutions",
      tweets: [
        "1/2 Déclaration officielle de campagne : pourquoi nous défendons les maires ruraux. #Sénatoriales2026",
        "2/2 Lien vers la fiche complète : https://jhn.baronsmariani.org/senatoriales"
      ]
    };

    const res = await executeTwoStepRelay(officialPayload, { simulate: true });
    assert.equal(res.cascade_status, "completed");
    assert.equal(res.step_1_official.account, "@baronsmariani");
    assert.equal(res.step_2_relay.account, "@suvranu");
    assert.ok(res.step_1_official.tweet_url);
  });

  console.log("\n==========================================================================");
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed.`);
  console.log("==========================================================================");

  if (failed > 0) process.exit(1);
}

runAll().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
