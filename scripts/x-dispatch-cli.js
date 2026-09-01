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
    console.log(`\n🎉 TWEET PUBLIÉ AVEC SUCCÈS !`);
    console.log(`   • ID du Tweet :`, res ? (res.id || JSON.stringify(res)) : "OK");
    console.log(`   • Compte      : ${accountConfig.handle}`);
    console.log(`   • Horodatage  : ${new Date().toISOString()}\n`);
  } catch (err) {
    console.error(`\n❌ Erreur lors de l'envoi du tweet via agent-twitter-client :`, err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Erreur générale :", err);
  process.exit(1);
});
