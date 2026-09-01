#!/usr/bin/env node
/**
 * CDP Hosted Browser CLI Tool.
 *
 * Usage:
 *   node scripts/ops/cdp-browser-cli.js --tabs
 *   node scripts/ops/cdp-browser-cli.js --extract-x=baronsmariani
 *   node scripts/ops/cdp-browser-cli.js --eval="document.title"
 */

import { listActiveTabs, extractCookiesForUrls, extractAndSaveXSession, extractAllConnectedAccounts, switchToAccountInTab, evaluateJsInTab, detectActiveXAccount, DEFAULT_CDP_ENDPOINT } from "./cdp-browser-extractor.js";

async function main() {
  const args = process.argv.slice(2);
  const endpoint = process.env.CDP_ENDPOINT || DEFAULT_CDP_ENDPOINT;

  const switchArg = args.find(a => a.startsWith("--switch-to="));
  if (switchArg) {
    const targetHandle = switchArg.split("=")[1];
    console.log(`🔄 Bascule programmatique du compte X vers : ${targetHandle}...`);
    const res = await switchToAccountInTab(targetHandle, endpoint);
    if (res.success) {
      console.log(`✅ Bascule réussie !`);
      console.log(`   • Nouveau compte actif : ${res.nouveau_compte_actif}`);
      console.log(`   • Horodatage           : ${res.timestamp}\n`);
    } else {
      console.log(`⚠️ Échec de la bascule : ${res.error}`);
      if (res.comptes_disponibles_dans_le_menu) {
        console.log(`   Comptes trouvés dans le menu :`, res.comptes_disponibles_dans_le_menu);
      }
    }
    return;
  }

  if (args.includes("--inspect-sessions")) {
    console.log("🔍 Inspection détaillée des sessions et cookies dans chaque onglet...");
    const { sendCdpCommand } = await import("./cdp-browser-extractor.js");
    const tabs = await listActiveTabs(endpoint);
    for (const t of tabs) {
      if (t.url.includes("x.com") || t.url.includes("twitter.com")) {
        const expr = `(() => {
          return {
            tab_title: document.title,
            url: window.location.href,
            account_btn: document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]')?.innerText,
            profile_link: document.querySelector('[data-testid="AppTabBar_Profile_Link"]')?.getAttribute('href'),
            twid: decodeURIComponent((document.cookie.match(/twid=([^;]+)/) || [])[1] || '')
          };
        })()`;
        const res = await sendCdpCommand(t.webSocketDebuggerUrl, "Runtime.evaluate", {
          expression: expr,
          returnByValue: true
        });
        console.log(`\n• Onglet [${t.id}] :`);
        console.log(JSON.stringify(res.result?.value, null, 2));
      }
    }
    return;
  }

  if (args.includes("--extract-all")) {
    console.log("🚀 Extraction automatique en chaîne de TOUS les comptes X connectés...");
    const results = await extractAllConnectedAccounts(endpoint);
    console.log(`\n🎉 Bilan de l'extraction multi-comptes : ${results.length} compte(s) capturé(s) !`);
    for (const r of results) {
      console.log(`   • Compte : ${r.handle || r.account}`);
      console.log(`     Token  : ${r.auth_token_preview}`);
      console.log(`     Fichier: ${r.secret_file}\n`);
    }
    return;
  }

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
