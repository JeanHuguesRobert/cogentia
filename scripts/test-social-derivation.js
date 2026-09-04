#!/usr/bin/env node
/**
 * Test Suite: Social Media Derivation & DHITL Invariants.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveSocialProposals, deriveFromFile, deriveFromRossignolPacket, SOCIAL_DERIVATION_PROTOCOL } from "./lib/social-derivation.js";

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
    assert.ok(res.facebook_post.includes("https://jhn.baronsmariani.org"));
  });

  await test("Invariant 4: Derivation from actual Fiches Maires files", () => {
    const fiche1 = path.join(root, "research", "campaign", "fiches_maires", "fiche_01_autonomie_de_capacite_finances_communales.md");
    if (fs.existsSync(fiche1)) {
      const res = deriveFromFile(fiche1);
      assert.ok(res.continuation_id);
      assert.ok(res.whatsapp_notification.includes("approve ctn_soc_"));
    }
  });

  await test("Invariant 5: Instagram Package compliance (Carrousel, Reel, Meta/CNIL safety)", () => {
    const sampleText = "L'énergie villageoise avec FractaVolta et les batteries seconde vie.";
    const res = deriveSocialProposals(sampleText, { title: "FractaVolta Corse" });

    // Instagram Carrousel (5 cards)
    assert.ok(res.instagram_carrousel);
    assert.equal(res.instagram_carrousel.length, 5);
    assert.equal(res.instagram_carrousel[0].card_type, "constat_terrain");
    assert.equal(res.instagram_carrousel[1].card_type, "distinction_cle");
    assert.equal(res.instagram_carrousel[4].card_type, "conclusion_source");

    // Instagram Reel script (<= 60s, visual plans, spoken text, captions)
    assert.ok(res.instagram_reel);
    assert.ok(res.instagram_reel.duration_sec <= 60);
    assert.ok(res.instagram_reel.spoken_text.length > 50);
    assert.ok(res.instagram_reel.on_screen_captions.length >= 3);

    // Instagram Risk Checklist
    assert.equal(res.continuation_packet.instagram_payload.risk_checklist.organic_only, true);
    assert.ok(res.continuation_packet.instagram_payload.risk_checklist.ai_disclosure);
    assert.ok(res.whatsapp_notification.includes("Instagram"));
  });

  await test("Invariant 6: Réponse Grand Électeur (Maire rural) personalization", () => {
    const sampleText = "Protéger la DGF des communes rurales et garantir le statut de résident rural.";
    const res = deriveSocialProposals(sampleText, { title: "Statut Résident Rural" });

    assert.ok(res.reponse_maire);
    assert.ok(res.reponse_maire.includes("Monsieur le Maire"));
    assert.ok(res.reponse_maire.includes("Jean Hugues Noël Robert"));
    assert.ok(res.continuation_packet.reponse_maire_payload.subject.includes("Statut Résident Rural"));
    assert.ok(res.whatsapp_notification.includes("Réponse Maire"));
  });

  await test("Invariant 7: Direct derivation from Rossignol Watch Packet", () => {
    const rossignolPacket = {
      packet_id: "CPKT-ROSSIGNOL-1756972800-corsica1",
      title: "Rapport d'information sénatorial sur la décentralisation en Corse",
      category: "institutions_autonomie",
      source_name: "Sénat / Commission des Lois",
      url: "https://www.senat.fr/dossiers-legislatifs/autonomie-corse.html",
      content: "Examen des modalités de transfert de pouvoir normatif et fiscal. Débat crucial sur l'impact financier pour les communes rurales et la préservation de la Dotation Globale de Fonctionnement (DGF).",
      campaign_metadata: {
        axis: "Autonomie de Capacité vs Autonomie de papier",
        target_electorate: "Maires et conseillers municipaux ruraux"
      }
    };

    const res = deriveFromRossignolPacket(rossignolPacket);

    assert.equal(res.continuation_packet.provenance.rossignol_packet_id, "CPKT-ROSSIGNOL-1756972800-corsica1");
    assert.ok(res.facebook_post.toLowerCase().includes("rapport d'information sénatorial"));
    assert.ok(res.x_thread.length >= 3);
    assert.ok(res.instagram_carrousel.length === 5);
    assert.ok(res.reponse_maire.includes("Rapport d'information sénatorial"));
    assert.ok(res.whatsapp_notification.includes("approve ctn_soc_"));
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
