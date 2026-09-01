#!/usr/bin/env node
/**
 * CDP Hosted Browser CLI Tool.
 *
 * Usage:
 *   node scripts/ops/cdp-browser-cli.js --tabs
 *   node scripts/ops/cdp-browser-cli.js --extract-x=baronsmariani
 *   node scripts/ops/cdp-browser-cli.js --eval="document.title"
 */

import { listActiveTabs, extractCookiesForUrls, extractAndSaveXSession, evaluateJsInTab, detectActiveXAccount, DEFAULT_CDP_ENDPOINT } from "./cdp-browser-extractor.js";

async function main() {
  const args = process.argv.slice(2);
  const endpoint = process.env.CDP_ENDPOINT || DEFAULT_CDP_ENDPOINT;

  console.log("==========================================================================");
  console.log(" 🌐 CDP HOSTED BROWSER CONTROLLER & SESSION EXTRACTOR");
  console.log(`    Endpoint : ${endpoint}`);
  console.log("==========================================================================\n");

  if (args.includes("--whoami")) {
    console.log("🕵️ Détection du compte X actuellement connecté via CDP...");
    const accountInfo = await detectActiveXAccount(endpoint);
    console.log("Résultat de l'analyse DOM :", JSON.stringify(accountInfo, null, 2));
    return;
  }

  if (args.includes("--tabs") || args.length === 0) {
    console.log("📑 Liste des onglets actifs dans Chromium :");
    const tabs = await listActiveTabs(endpoint);
    for (const t of tabs) {
      console.log(`   • [${t.id}] ${t.title}`);
      console.log(`     URL: ${t.url}\n`);
    }
  }

  const extractArg = args.find(a => a.startsWith("--extract-x="));
  if (extractArg) {
    const account = extractArg.split("=")[1];
    console.log(`🔐 Extraction automatique de session X pour le compte : ${account}...`);
    const res = await extractAndSaveXSession(account, endpoint);
    if (res.success) {
      console.log(`✅ Session extraite avec succès !`);
      console.log(`   • auth_token : ${res.auth_token_preview}`);
      console.log(`   • ct0        : ${res.ct0_preview}`);
      console.log(`   • Fichier    : ${res.secret_file}\n`);
    } else {
      console.log(`⚠️ Échec de l'extraction : ${res.error}`);
      console.log(`   (Assurez-vous que x.com est ouvert et connecté dans le navigateur hébergé)\n`);
    }
  }

  const evalArg = args.find(a => a.startsWith("--eval="));
  if (evalArg) {
    const expr = evalArg.split("=")[1];
    console.log(`⚡ Exécution JavaScript dans l'onglet actif : "${expr}"...`);
    const res = await evaluateJsInTab(null, expr, endpoint);
    console.log(`Résultat :`, res.result?.value || res.result);
  }
}

main().catch(err => {
  console.error("Erreur CDP CLI :", err.message);
  process.exit(1);
});
