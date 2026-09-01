#!/usr/bin/env node
/**
 * Social Media Derivation CLI.
 *
 * Usage:
 *   node scripts/social-derivation-cli.js research/campaign/fiches_maires/fiche_01_autonomie_de_capacite_finances_communales.md
 *   node scripts/social-derivation-cli.js --all-fiches
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveFromFile, deriveSocialProposals } from "./lib/social-derivation.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fichesDir = path.join(root, "research", "campaign", "fiches_maires");
const outputDir = path.join(root, ".cogentia", "social_packets");

async function runCli() {
  const args = process.argv.slice(2);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log("==========================================================================");
  console.log(" 📲 DÉMULTIPLICATION SOCIALE DHITL — SÉNATORIALES 2026 (Facebook & X)");
  console.log("    Principe : « Agent John prépare et propose ; l'humain valide. »");
  console.log("==========================================================================\n");

  const filesToProcess = [];
  if (args.includes("--all-fiches") || args.length === 0) {
    if (fs.existsSync(fichesDir)) {
      const files = fs.readdirSync(fichesDir).filter(f => f.endsWith(".md"));
      for (const f of files) filesToProcess.push(path.join(fichesDir, f));
    }
  } else {
    for (const a of args) {
      if (!a.startsWith("--")) filesToProcess.push(path.resolve(a));
    }
  }

  if (filesToProcess.length === 0) {
    console.log("Aucun fichier à traiter. Spécifiez un fichier markdown ou --all-fiches.");
    return;
  }

  for (const filePath of filesToProcess) {
    if (!fs.existsSync(filePath)) {
      console.warn(`Fichier introuvable : ${filePath}`);
      continue;
    }

    console.log(`📄 Traitement du document : ${path.basename(filePath)}`);
    const derivation = deriveFromFile(filePath);
    
    // Save packet to .cogentia/social_packets/
    const packetFile = path.join(outputDir, `${derivation.continuation_id}.json`);
    fs.writeFileSync(packetFile, JSON.stringify(derivation.continuation_packet, null, 2), "utf8");

    console.log(`   ✓ Paquet généré : ${derivation.continuation_id} -> ${packetFile}`);
    console.log(`   ✓ Post Facebook : ${derivation.continuation_packet.facebook_payload.word_count} mots`);
    console.log(`   ✓ Thread X      : ${derivation.x_thread.length} tweets (tous <= 280 car.)`);
    console.log(`\n📲 [Notification WhatsApp Mobile Cockpit] :`);
    console.log("--------------------------------------------------------------------------");
    console.log(derivation.whatsapp_notification);
    console.log("--------------------------------------------------------------------------\n");
  }

  console.log(`✅ Tous les paquets de continuation sociale sont prêts dans : ${outputDir}\n`);
}

runCli().catch(err => {
  console.error("Erreur CLI démultiplication sociale :", err);
  process.exit(1);
});
