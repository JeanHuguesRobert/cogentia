#!/usr/bin/env node
/**
 * CLI Demonstration of the Two-Step Cascade Relay:
 * @baronsmariani (Official Declaration) -> @suvranu (Popular Sovereignty Quote Tweet)
 * for Fiche Maire 01 (Autonomie de Capacité & Finances Communales).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { executeTwoStepRelay, prepareSuvranuRelayPayload } from "./lib/x-publisher.js";
import { deriveFromFile } from "./lib/social-derivation.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fiche1Path = path.join(root, "research", "campaign", "fiches_maires", "fiche_01_autonomie_de_capacite_finances_communales.md");
const outputDir = path.join(root, ".cogentia", "social_packets");

async function run() {
  console.log("==========================================================================");
  console.log(" 🦅 SIMULATION CASCADE X/TWITTER : @baronsmariani ➔ @suvranu");
  console.log("    Fiche 01 : Autonomie de Capacité & Garantie Financière des Communes");
  console.log("==========================================================================\n");

  const derivation = deriveFromFile(fiche1Path);

  const officialPayload = {
    title: "Fiche 01 : Autonomie de Capacité & Garantie Financière des Communes Rurales",
    axis: "Autonomie de Capacité",
    tweets: derivation.x_thread.map(t => t.text)
  };

  const cascadeResult = await executeTwoStepRelay(officialPayload, { simulate: true });

  const packetId = "ctn_soc_cascade_f1";
  const cascadePacket = {
    protocol: "cogentia.x_cascade_relay/v1",
    continuation_id: packetId,
    created_at: new Date().toISOString(),
    status: "pending_human_approval",
    dhitl_checkpoint: {
      required_human: "Jean Hugues Robert",
      action: `approve ${packetId}`,
      channel: "WhatsApp Mobile Cockpit"
    },
    step_1_baronsmariani: {
      account: "@baronsmariani",
      role: "Declaration Officielle JHR",
      thread: officialPayload.tweets
    },
    step_2_suvranu: {
      account: "@suvranu",
      role: "Souverainete Populaire & Relais 5000 comptes",
      quote_url: cascadeResult.step_1_official.tweet_url,
      thread: prepareSuvranuRelayPayload(officialPayload, cascadeResult.step_1_official.tweet_url).commentary_thread
    }
  };

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, `${packetId}.json`), JSON.stringify(cascadePacket, null, 2), "utf8");

  console.log("1️⃣ [ÉMETTEUR OFFICIEL] @baronsmariani (Thread officiel 4 tweets) :");
  officialPayload.tweets.forEach((t, i) => console.log(`   ${t}`));

  console.log("\n2️⃣ [RELAIS POPULAIRE] @suvranu (Quote Tweet + 3 tweets de contexte) :");
  console.log(`   🔁 Quote Tweet de : ${cascadeResult.step_1_official.tweet_url}`);
  cascadePacket.step_2_suvranu.thread.forEach((t, i) => console.log(`   ${t}`));

  console.log("\n📲 [NOTIFICATION WHATSAPP MOBILE COCKPIT JHR] :");
  console.log("--------------------------------------------------------------------------");
  console.log(`📢 *Agent John — Proposition de Cascade X/Twitter*`);
  console.log(``);
  console.log(`1️⃣ *@baronsmariani :* Thread officiel (4 tweets) sur l'Autonomie Communale`);
  console.log(`2️⃣ *@suvranu :* Quote-Tweet contextuel pour les 5 000 comptes insulaires`);
  console.log(``);
  console.log(`👉 Pour approuver et déclencher la cascade en 2 temps, tapez :`);
  console.log(`*approve ${packetId}*`);
  console.log("--------------------------------------------------------------------------\n");

  console.log(`✅ Paquet de continuation enregistré dans : .cogentia/social_packets/${packetId}.json\n`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
