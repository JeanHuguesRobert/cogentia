/**
 * Social Media Derivation & DHITL Multi-Platform Engine.
 *
 * Implements the social demultiplication strategy from:
 * JeanHuguesRobert/research/etude_demultiplication_reseaux_sociaux_senatoriales.md
 * and research/campaign/2026_senatoriales_memory.md.
 *
 * Capabilities:
 * - Transforms campaign notes / Fiches Maires into tailored Facebook posts & X (Twitter) threads.
 * - Enforces strict DHITL (Democratic Humans in the Loop): "Agent John propose, l'humain valide".
 * - Produces continuation packets (ctn_soc_xxx) ready for WhatsApp 1-click validation.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const SOCIAL_DERIVATION_PROTOCOL = "cogentia.social_derivation/v1";

/**
 * Derives social media publication proposals from a source markdown document.
 * @param {string} sourceText - Markdown text of the note or Fiche Maire.
 * @param {object} metadata - Document metadata (title, author, axis, url).
 * @returns {object} Derived Facebook post, X thread, and continuation packet.
 */
export function deriveSocialProposals(sourceText, metadata = {}) {
  const title = metadata.title || "Sénatoriales 2026 : Pour une Corse Capable";
  const axis = metadata.axis || "Autonomie de Capacité";
  const author = metadata.author || "Jean Hugues Noël Robert";
  
  // Extract key paragraphs from markdown
  const lines = sourceText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const cleanLines = lines.filter(l => !l.startsWith("---") && !l.startsWith("#"));
  const coreThesis = cleanLines.slice(0, 3).join(" ");

  // 1. Generate Facebook Long-Form Post (300-600 words)
  const facebookPost = [
    `🗳️ [SÉNATORIALES 2026 — HAUTE-CORSE]`,
    `📌 ${title.toUpperCase()}`,
    ``,
    `Chers maires, élus municipaux et amis de nos villages,`,
    ``,
    `${coreThesis}`,
    ``,
    `Face aux débats institutionnels qui s'enlisent souvent dans des promesses abstraites, nous devons opposer le principe d'Autonomie de Capacité :`,
    `• Pas de transfert de charges sans dotations communales directes sanctuarisées.`,
    `• Le droit d'expérimenter localement sans subir 18 mois de lenteur administrative.`,
    `• Des solutions techniques et juridiques immédiatement applicables à droit constant.`,
    ``,
    `Une Corse forte et autonome ne se construira pas sur un nouveau centralisme, mais sur 360 communes debout, vivantes et capables d'agir pour leurs enfants.`,
    ``,
    `👉 Retrouvez l'intégralité de la fiche d'action et nos propositions sur le corpus ouvert :`,
    `https://jhn.baronsmariani.org/senatoriales`,
    ``,
    `#Sénatoriales2026 #Corse #AutonomieDeCapacité #GrandsÉlecteurs #HauteCorse #CommunesRurales`
  ].join("\n");

  // 2. Generate X / Twitter Thread (3-4 tweets <= 280 chars)
  const xThread = [
    {
      index: 1,
      total: 4,
      text: `1/4 🗳️ #Sénatoriales2026 | ${title} : pourquoi l'autonomie ne doit pas devenir un centralisme régional sans moyens pour les villages. Analyse et propositions concrètes ⤵️`
    },
    {
      index: 2,
      total: 4,
      text: `2/4 Une autonomie de papier transfère des compétences sans recettes. L'Autonomie de Capacité garantit un plancher financier direct pour chaque commune rurale et le droit d'expérimenter sans carcan étatique. #Corse`
    },
    {
      index: 3,
      total: 4,
      text: `3/4 Énergie villageoise (FractaVolta), Statut du Résident Rural via BRS à droit constant, retenues d'eau locales : nous apportons aux maires des solutions clés en main, testées et financées. #HauteCorse`
    },
    {
      index: 4,
      total: 4,
      text: `4/4 « Pas de pouvoir sans contrôle. » Retrouvez la fiche d'intervention complète et le manifeste de campagne sur notre registre ouvert : https://jhn.baronsmariani.org/senatoriales`
    }
  ];

  // Enforce tweet character limits
  for (const tweet of xThread) {
    if (tweet.text.length > 280) {
      tweet.text = tweet.text.slice(0, 277) + "...";
    }
  }

  // 3. Generate Continuation Packet for WhatsApp Cockpit
  const hash = createHash("sha256").update(title + coreThesis).digest("hex").slice(0, 8);
  const packetId = `ctn_soc_${hash}`;

  const continuationPacket = {
    protocol: SOCIAL_DERIVATION_PROTOCOL,
    continuation_id: packetId,
    created_at: new Date().toISOString(),
    status: "pending_human_approval",
    title,
    axis,
    author,
    dhitl_checkpoint: {
      required_human: "Jean Hugues Robert",
      action: `approve ${packetId}`,
      channel: "WhatsApp Mobile Cockpit / Telegram"
    },
    facebook_payload: {
      platform: "facebook",
      target_audience: "Maires et élus locaux de Corse",
      post_body: facebookPost,
      word_count: facebookPost.split(/\s+/).length
    },
    x_payload: {
      platform: "x_twitter",
      target_audience: "Journalistes, médias, débat national & insulaire",
      thread_tweets: xThread,
      tweets_count: xThread.length
    }
  };

  return {
    continuation_id: packetId,
    facebook_post: facebookPost,
    x_thread: xThread,
    continuation_packet: continuationPacket,
    whatsapp_notification: [
      `📢 *Agent John — Proposition de Publication Sociale*`,
      ``,
      `🔵 *Facebook :* "${title}" (${facebookPost.split(/\s+/).length} mots)`,
      `⚫️ *X (Thread) :* ${xThread.length} tweets prêts`,
      ``,
      `👉 Pour approuver l'envoi simultané, tapez :`,
      `*approve ${packetId}*`
    ].join("\n")
  };
}

/**
 * Derives social media proposals from a file path.
 */
export function deriveFromFile(filePath, extraMeta = {}) {
  const content = fs.readFileSync(filePath, "utf8");
  const fileName = path.basename(filePath);
  return deriveSocialProposals(content, {
    title: extraMeta.title || fileName.replace(/\.md$/, "").replace(/_/g, " "),
    ...extraMeta
  });
}
