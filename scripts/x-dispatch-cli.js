#!/usr/bin/env node
/**
 * X/Twitter Dispatcher using open-source agent-twitter-client.
 *
 * Usage:
 *   node scripts/x-dispatch-cli.js --account=jhr --text="Test tweet... https://github.com/JeanHuguesRobert"
 *   node scripts/x-dispatch-cli.js --account=jhr --dry-run
 */

import { Scraper } from "agent-twitter-client";
import { getAccountCredentials, X_ACCOUNTS } from "./lib/x-publisher.js";

async function main() {
  const args = process.argv.slice(2);
  const accountArg = args.find(a => a.startsWith("--account="));
  const textArg = args.find(a => a.startsWith("--text="));
  const isDryRun = args.includes("--dry-run");

  const accountKey = accountArg ? accountArg.split("=")[1] : "jhr";
  const accountConfig = X_ACCOUNTS[accountKey];

  if (!accountConfig) {
    console.error(`❌ Compte inconnu: ${accountKey}. Comptes valides : ${Object.keys(X_ACCOUNTS).join(", ")}`);
    process.exit(1);
  }

  console.log("==========================================================================");
  console.log(` 🦅 X DISPATCHER (agent-twitter-client open-source engine)`);
  console.log(`    Compte Cible : ${accountConfig.handle} (${accountConfig.name})`);
  console.log(`    Mode         : ${isDryRun ? "SIMULATION (Dry-Run)" : "DIRECT / RÉEL"}`);
  console.log("==========================================================================\n");

  const creds = getAccountCredentials(accountKey);
  if (!creds || !creds.auth_token || !creds.ct0) {
    console.error(`❌ Impossible de charger les cookies de session pour ${accountKey}.`);
    console.error(`   Vérifiez que le fichier .cogentia/secrets/x_session_${accountKey}.json existe.`);
    process.exit(1);
  }

  console.log(`🔑 Chargement des cookies de session pour ${accountConfig.handle} :`);
  console.log(`   • auth_token : ${creds.auth_token.slice(0, 6)}...`);
  console.log(`   • ct0        : ${creds.ct0.slice(0, 6)}...`);

  const tweetText = textArg 
    ? textArg.slice(7)
    : `Test d'infrastructure de campagne et de souveraineté cognitive. Retrouvez l'ensemble de nos travaux, architectures et corpus ouverts : https://github.com/JeanHuguesRobert`;

  console.log(`\n📝 Texte du Tweet (${tweetText.length} caractères) :`);
  console.log(`   "${tweetText}"\n`);

  if (tweetText.length > 280) {
    console.error(`❌ Le texte dépasse la limite de 280 caractères (${tweetText.length} car.) !`);
    process.exit(1);
  }

  if (isDryRun) {
    console.log(`✅ Simulation réussie ! Le tweet est prêt à être émis.`);
    return;
  }

  console.log(`🚀 Initialisation de l'instance Scraper (agent-twitter-client)...`);
  const scraper = new Scraper();

  // Inject all cookies (agent-twitter-client uses twitter.com requests under the hood)
  let cookieStrings = [];
  if (creds.full_cookies && Array.isArray(creds.full_cookies)) {
    cookieStrings = creds.full_cookies.map(c => {
      return `${c.name}=${c.value}; Domain=.twitter.com; Path=/; Secure; SameSite=None`;
    });
  } else {
    cookieStrings = [
      `auth_token=${creds.auth_token}; Domain=.twitter.com; Path=/; Secure; SameSite=None`,
      `ct0=${creds.ct0}; Domain=.twitter.com; Path=/; Secure; SameSite=None`
    ];
  }

  await scraper.setCookies(cookieStrings);

  console.log(`📡 Vérification de la session en ligne...`);
  const isLoggedIn = await scraper.isLoggedIn();
  console.log(`   Statut de connexion retourné par X : ${isLoggedIn ? "✅ CONNECTÉ" : "⚠️ NON RECONNU (ou défi X)"}`);

  console.log(`📤 Envoi du Tweet en cours...`);
  try {
    const res = await scraper.sendTweet(tweetText);
    console.log(`\n🎉 TWEET PUBLIÉ AVEC SUCCÈS (via agent-twitter-client) !`);
    console.log(`   • ID du Tweet :`, res ? (res.id || JSON.stringify(res)) : "OK");
    console.log(`   • Compte      : ${accountConfig.handle}`);
    console.log(`   • Horodatage  : ${new Date().toISOString()}\n`);
  } catch (err) {
    console.warn(`⚠️ agent-twitter-client a échoué (${err.message}). Bascule sur l'émetteur direct de session du navigateur hébergé...`);
    
    // Fallback: Use direct tab DOM dispatch in the live Chrome session on fracta2
    const { listActiveTabs, detectActiveXAccount, sendCdpCommand, DEFAULT_CDP_ENDPOINT } = await import("./ops/cdp-browser-extractor.js");
    const tabs = await listActiveTabs(DEFAULT_CDP_ENDPOINT);
    const detected = await detectActiveXAccount(DEFAULT_CDP_ENDPOINT);
    const accountsList = Array.isArray(detected) ? detected : [detected];

    const target = accountsList.find(a => 
      a.raw_text?.toLowerCase().includes(accountKey.toLowerCase()) ||
      a.profile_href?.toLowerCase().includes(accountKey.toLowerCase())
    );

    if (!target) {
      throw new Error(`Aucun onglet actif trouvé pour le compte ${accountKey} dans le navigateur.`);
    }

    const targetTab = tabs.find(t => t.id === target.tab_id);
    const wsUrl = targetTab.webSocketDebuggerUrl;

    const domExpr = `(async () => {
      // Step 1: Verify and switch to the target account if needed
      const btn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      const targetHandle = ${JSON.stringify(accountConfig.handle)}; // e.g. "@jhr"
      
      if (btn && !btn.innerText.toLowerCase().includes(targetHandle.toLowerCase().replace('@', ''))) {
        btn.click();
        await new Promise(r => setTimeout(r, 800));
        const menu = document.querySelector('[data-testid="AccountSwitcher_Menu"]') || document.querySelector('[role="menu"]');
        if (menu) {
          const rows = Array.from(menu.querySelectorAll('[data-testid="AccountSwitcher_User_Row"], [role="menuitem"]'));
          const targetRow = rows.find(r => r.innerText.toLowerCase().includes(targetHandle.toLowerCase()));
          if (targetRow) {
            targetRow.click();
            await new Promise(r => setTimeout(r, 2500));
          }
        }
      }

      // Step 2: Locate editor or open modal
      let editor = document.querySelector('[data-testid="tweetTextarea_0"]') || 
                   document.querySelector('div[role="textbox"][contenteditable="true"]');

      if (!editor) {
        const composeBtn = document.querySelector('[data-testid="SideNav_NewTweet_Button"]');
        if (composeBtn) {
          composeBtn.click();
          await new Promise(r => setTimeout(r, 1000));
          editor = document.querySelector('[data-testid="tweetTextarea_0"]') || 
                   document.querySelector('div[role="textbox"][contenteditable="true"]');
        }
      }

      if (!editor) return { success: false, error: "Zone de saisie introuvable dans la page." };

      editor.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, ${JSON.stringify(tweetText)});
      
      await new Promise(r => setTimeout(r, 800));

      const postBtn = document.querySelector('[data-testid="tweetButton"]') || 
                      document.querySelector('[data-testid="tweetButtonInline"]');

      if (!postBtn) return { success: false, error: "Bouton de publication introuvable." };
      if (postBtn.getAttribute('aria-disabled') === 'true') {
        return { success: false, error: "Bouton désactivé." };
      }

      postBtn.click();
      await new Promise(r => setTimeout(r, 2000));

      return {
        success: true,
        method: "browser_session_direct",
        account: targetHandle,
        timestamp: new Date().toISOString()
      };
    })()`;

    const domRes = await sendCdpCommand(wsUrl, "Runtime.evaluate", {
      expression: domExpr,
      returnByValue: true,
      awaitPromise: true
    });

    const result = domRes.result?.value || domRes.result;
    if (result && result.success) {
      console.log(`\n🎉 TWEET PUBLIÉ AVEC SUCCÈS (via Session Directe du Navigateur) !`);
      console.log(`   • Compte      : ${accountConfig.handle}`);
      console.log(`   • Méthode     : ${result.method}`);
      console.log(`   • Horodatage  : ${result.timestamp}\n`);
    } else {
      console.error(`\n❌ Échec de la publication :`, result?.error || result);
      process.exit(1);
    }
  }
}

main().catch(err => {
  console.error("Erreur générale :", err);
  process.exit(1);
});
