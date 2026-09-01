#!/usr/bin/env node
/**
 * CLI tool to fetch and filter live Corsican media for the Senate campaign.
 *
 * Usage:
 *   node scripts/corsica-live-media-cli.js
 *   node scripts/corsica-live-media-cli.js --relevant-only
 */

import { fetchAllLiveCorsicaFeeds } from "./lib/corsica-live-media-feed.js";

async function main() {
  const args = process.argv.slice(2);
  const relevantOnly = args.includes("--relevant-only") || true;

  console.log("==========================================================================");
  console.log(" 📡 VEILLE LIVE MÉDIAS CORSE — CAMPAGNE SÉNATORIALES 2026");
  console.log("    Sources: Corse Net Infos, France 3 ViaStella, Alta Frequenza...");
  console.log("==========================================================================\n");

  console.log("Interrogation en direct des flux RSS régionaux...");
  const items = await fetchAllLiveCorsicaFeeds(8000);

  const filtered = relevantOnly ? items.filter(i => i.is_senate_relevant) : items;

  console.log(`\n✅ ${items.length} dépêches récupérées (${filtered.length} qualifiées pertinentes pour la campagne)\n`);

  for (const item of filtered.slice(0, 10)) {
    console.log(`📌 [${item.source_feed}] ${item.title}`);
    console.log(`   • Pertinence Sénat : ${(item.relevance_score * 100).toFixed(0)}% (Mots-clés: ${item.matched_keywords.join(", ")})`);
    console.log(`   • Date : ${item.published_at}`);
    console.log(`   • Lien : ${item.url}`);
    console.log(`   • Résumé : ${item.summary.slice(0, 140)}...\n`);
  }

  console.log("==========================================================================");
}

main().catch(err => {
  console.error("Erreur veille live médias:", err);
  process.exit(1);
});
