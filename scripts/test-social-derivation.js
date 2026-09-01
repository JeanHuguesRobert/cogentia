#!/usr/bin/env node
/**
 * Test Suite: Social Media Derivation & DHITL Invariants.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveSocialProposals, deriveFromFile, SOCIAL_DERIVATION_PROTOCOL } from "./lib/social-derivation.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
  console.log(" 🧪 SOCIAL MEDIA DERIVATION & DHITL INVARIANT TESTS");
  console.log("==========================================================================\n");

  await test("Invariant 1: Derivation schema & protocol compliance", () => {
    const sampleText = "L'autonomie de capacité garantit des dotations directes aux communes.";
    const res = deriveSocialProposals(sampleText, { title: "Test Fiche", axis: "Autonomie" });

    assert.equal(res.continuation_packet.protocol, SOCIAL_DERIVATION_PROTOCOL);
    assert.ok(res.continuation_id.startsWith("ctn_soc_"));
    assert.equal(res.continuation_packet.status, "pending_human_approval");
    assert.equal(res.continuation_packet.dhitl_checkpoint.required_human, "Jean Hugues Robert");
  });

  await test("Invariant 2: Tweet length constraints (<= 280 chars)", () => {
    const sampleText = "Texte long de politique générale sur la Corse et les maires ruraux...".repeat(10);
    const res = deriveSocialProposals(sampleText, { title: "Test Fiche Longue" });

    assert.ok(res.x_thread.length >= 3);
    for (const tweet of res.x_thread) {
      assert.ok(tweet.text.length <= 280, `Tweet should not exceed 280 chars (was ${tweet.text.length})`);
    }
  });

  await test("Invariant 3: Facebook post structure and hashtags", () => {
    const sampleText = "L'énergie solaire villageoise avec FractaVolta.";
    const res = deriveSocialProposals(sampleText, { title: "FractaVolta Corse" });

    assert.ok(res.facebook_post.includes("#Sénatoriales2026"));
    assert.ok(res.facebook_post.includes("#AutonomieDeCapacité"));
    assert.ok(res.facebook_post.includes("https://jhn.baronsmariani.org/senatoriales"));
  });

  await test("Invariant 4: Derivation from actual Fiches Maires files", () => {
    const fiche1 = path.join(root, "research", "campaign", "fiches_maires", "fiche_01_autonomie_de_capacite_finances_communales.md");
    if (fs.existsSync(fiche1)) {
      const res = deriveFromFile(fiche1);
      assert.ok(res.continuation_id);
      assert.ok(res.whatsapp_notification.includes("approve ctn_soc_"));
    }
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
