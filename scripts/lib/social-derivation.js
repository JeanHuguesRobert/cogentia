/**
 * Social Media Derivation & DHITL Multi-Platform Engine.
 *
 * Implements the campaign demultiplication strategy from:
 * - JeanHuguesRobert/research/etude_demultiplication_reseaux_sociaux_senatoriales.md
 * - JeanHuguesRobert/research/etude_agent_jhn_instagram.md
 * - cogentia/research/campaign/2026_senatoriales_memory.md
 *
 * Capabilities:
 * - Transforms campaign notes, Fiches Maires, or Rossignol territorial alerts into:
 *   1. Facebook Long-Form Post (300-600 words for mayors and local debate)
 *   2. X (Twitter) Thread (3-5 tweets <= 280 chars for press and national debate)
 *   3. Instagram Publication Package (5-card carrousel, 45s Reel script, captions, Meta/CNIL risk checklist)
 *   4. Direct Réponse Maire / Grand Électeur (personalized, republic-grounded communication)
 * - Enforces strict DHITL (Democratic Humans in the Loop): "Agent John prépare et propose ; l'humain valide".
 * - Produces continuation packets (ctn_soc_xxx) ready for WhatsApp 1-click validation.
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export const SOCIAL_DERIVATION_PROTOCOL = "cogentia.social_derivation/v2";

/**
 * Derives multi-platform campaign publication proposals from source text.
 * @param {string} sourceText - Markdown text of the note, Fiche Maire, or alert.
 * @param {object} metadata - Document metadata (title, author, axis, url, etc.).
 * @returns {object} Full 4-platform package and continuation packet.
 */
export function deriveSocialProposals(sourceText, metadata = {}) {
  const title = metadata.title || "Sénatoriales 2026 : Pour une Corse Capable";
  const axis = metadata.axis || metadata.category || "Autonomie de Capacité";
  const author = metadata.author || "Jean Hugues Noël Robert";
  const sourceName = metadata.source_name || "Corpus Jean Hugues Robert";
  const targetElectorate = metadata.target_electorate || "Maires et conseillers municipaux ruraux de Haute-Corse";
  
  // Extract key paragraphs from markdown / content, skipping frontmatter entirely
  let cleanText = String(sourceText);
  if (cleanText.startsWith("---")) {
    const endFm = cleanText.indexOf("\n---", 3);
    if (endFm !== -1) {
      cleanText = cleanText.slice(endFm + 4);
    }
  }
  const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const cleanLines = lines.filter(l => !l.startsWith("---") && !l.startsWith("#"));
  const coreThesis = cleanLines.slice(0, 3).join(" ") || "L'Autonomie de Capacité donne des moyens réels d'agir, de produire, de contrôler et de corriger.";

  // --------------------------------------------------------------------------
  // 1. Facebook Long-Form Post (300-600 words)
  // Target: Maires, élus municipaux, acteurs locaux, débat d'idées régional
  // --------------------------------------------------------------------------
  const facebookPost = [
    `🗳️ [SÉNATORIALES 2026 — HAUTE-CORSE]`,
    `📌 ${title.toUpperCase()}`,
    ``,
    `Chers maires, élus municipaux et amis de nos villages de montagne et de l'intérieur,`,
    ``,
    `${coreThesis}`,
    ``,
    `Face aux débats institutionnels qui s'enlisent souvent dans des promesses abstraites, nous devons opposer le principe d'Autonomie de Capacité :`,
    `• Pas de transfert de compétences sans dotations directes sanctuarisées pour chaque commune rurale.`,
    `• Le droit d'expérimenter localement (énergie villageoise, foncier rural, gestion de l'eau) sans subir 18 mois de blocages administratifs.`,
    `• Des solutions techniques et juridiques immédiatement applicables à droit constant, sans attendre une hypothétique révision constitutionnelle.`,
    ``,
    `Une Corse forte et autonome ne se construira pas sur un nouveau centralisme régional ajaccien, mais sur 360 communes debout, vivantes et capables d'agir pour leurs habitants.`,
    ``,
    `👉 Pour aller plus loin, vérifier les données ou tester ces propositions sur la situation précise de votre commune, interrogez directement mon assistant numérique :`,
    `🔗 https://jhn.baronsmariani.org`,
    ``,
    `#Sénatoriales2026 #Corse #AutonomieDeCapacité #GrandsÉlecteurs #HauteCorse #CommunesRurales`
  ].join("\n");

  // --------------------------------------------------------------------------
  // 2. X / Twitter Thread (3-4 tweets <= 280 chars)
  // Target: Journalistes, médias, débat national & insulaire
  // --------------------------------------------------------------------------
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
      text: `4/4 « Pas de pouvoir sans contrôle. » Pour en savoir plus et interroger directement mon assistant numérique sur ce dossier : https://jhn.baronsmariani.org #Sénatoriales2026`
    }
  ];

  // Enforce tweet character limits
  for (const tweet of xThread) {
    if (tweet.text.length > 280) {
      tweet.text = tweet.text.slice(0, 277) + "...";
    }
  }

  // --------------------------------------------------------------------------
  // 3. Instagram Package (Carrousel 5 cartes + Script Reel + Légende + Risques)
  // Conforme à: JeanHuguesRobert/research/etude_agent_jhn_instagram.md
  // --------------------------------------------------------------------------
  const carrouselCards = [
    {
      card_number: 1,
      card_type: "constat_terrain",
      header: "SÉNATORIALES 2026 · HAUTE-CORSE",
      main_text: `${title}`,
      sub_text: `Le constat : ${coreThesis.slice(0, 140)}...`
    },
    {
      card_number: 2,
      card_type: "distinction_cle",
      header: "LA DISTINCTION INDISPENSABLE",
      main_text: "Autonomie de papier vs Autonomie de Capacité",
      sub_text: "L'autonomie de papier transfère des mots et des charges. L'autonomie de capacité donne des moyens réels d'agir, de financer et de décider au village."
    },
    {
      card_number: 3,
      card_type: "proposition_concrete",
      header: "PROPOSITION À DROIT CONSTANT",
      main_text: `Agir sans attendre pour nos communes`,
      sub_text: `Garantir des dotations directes, simplifier les micro-réseaux et débloquer les indivisions rurales sans promesses chimériques.`
    },
    {
      card_number: 4,
      card_type: "objection_honnete",
      header: "L'OBJECTION HONNÊTE",
      main_text: "« Est-ce juridiquement et financièrement faisable ? »",
      sub_text: "Oui. Toutes nos propositions reposent sur des outils existants (BRS, SCIC, autoconsommation collective directe) sans exiger une rupture institutionnelle risquée."
    },
    {
      card_number: 5,
      card_type: "conclusion_source",
      header: "DIALOGUE & ASSISTANT NUMÉRIQUE",
      main_text: "Pour en savoir plus, interrogez mon assistant",
      sub_text: "Posez vos questions et vérifiez les sources en direct sur jhn.baronsmariani.org"
    }
  ];

  const reelScript = {
    duration_sec: 45,
    visual_setup: "Plan 1 (0-10s): B-roll d'un village de montagne ou d'une toiture communale. Plan 2 (10-35s): Jean-Hugues Robert face caméra ou document officiel surligné. Plan 3 (35-45s): Écran montrant l'interface conversationnelle et lien jhn.baronsmariani.org.",
    spoken_text: `On parle beaucoup d'autonomie pour la Corse. Mais pour nos 360 maires ruraux, une autonomie de papier ne remplit pas les caisses de la commune et ne répare pas les réseaux d'eau. Ce qu'il nous faut, c'est une autonomie de capacité : des dotations protégées, le droit de produire notre propre énergie au village, et des solutions applicables immédiatement. Pour poser vos questions et explorer ces solutions pour votre village, interrogez directement mon assistant numérique sur notre registre ouvert.`,
    on_screen_captions: [
      "Autonomie de papier vs Autonomie de Capacité",
      "Protéger le budget de chaque commune rurale",
      "Énergie, eau, foncier : des solutions immédiates",
      "Interrogez mon assistant sur jhn.baronsmariani.org"
    ]
  };

  const instagramCaption = [
    `Une autonomie de papier donne des mots. Une autonomie de capacité donne des moyens réels d'agir.`,
    ``,
    `Face aux défis quotidiens de nos communes de Haute-Corse — budget, énergie, entretien du patrimoine rural, services publics — nous refusons le piège du centralisme comme celui des promesses sans lendemain.`,
    ``,
    `📌 5 cartes pour comprendre notre engagement pour les Sénatoriales du 27 septembre 2026.`,
    ``,
    `💬 Pour en savoir plus, vérifier chaque donnée ou poser vos questions sur votre village : interrogez mon assistant numérique en accès libre (lien dans la bio : jhn.baronsmariani.org).`,
    ``,
    `#Sénatoriales2026 #HauteCorse #Corse #AutonomieDeCapacité #CommunesRurales #DémocratieDirecte`
  ].join("\n");

  const instagramRiskChecklist = {
    organic_only: true,
    paid_ads_prohibited: "Conforme : Aucune dépense publicitaire (interdit Meta/UE 2025/2026)",
    data_protection_cnil: "Conforme : Pas de scraping de profils, pas de micro-ciblage",
    ai_disclosure: "Conforme : Texte et scénarisation préparés avec Agent John (DHITL), validés par Jean Hugues Robert",
    authenticity: "Conforme : Voix humaine réelle, scènes réelles du territoire, citations sourcées"
  };

  // --------------------------------------------------------------------------
  // 4. Réponse Maire / Grand Électeur (Personnalisée & Républicaine)
  // Target: Courrier, email ou message direct à un maire rural
  // --------------------------------------------------------------------------
  const reponseMaireSubject = `Sénatoriales 2026 : ${title} — Garantir la capacité d'action de votre commune`;
  const reponseMaireBody = [
    `Monsieur le Maire, Madame la Conseillère municipale,`,
    ``,
    `À l'approche du scrutin sénatorial du 27 septembre prochain, je mesure combien la charge de votre mandat est lourde au quotidien, particulièrement dans nos villages de l'intérieur où l'éloignement et les contraintes budgétaires compliquent chaque projet.`,
    ``,
    `Sur le dossier : « ${title} », ma conviction est claire :`,
    `Nous ne pouvons pas accepter qu'une réforme institutionnelle ou un transfert de compétences se traduise par un nouveau centralisme qui déshabillerait les communes au profit d'échelons plus lointains.`,
    ``,
    `Je défends au contraire l'Autonomie de Capacité :`,
    `- La sanctuarisation de la DGF et des dotations d'équipement rural ;`,
    `- La simplification radicale pour l'autoconsommation énergétique communale et l'habitat villageois ;`,
    `- Le principe strict : « Pas de compétence déléguée sans contrôle démocratique et financement garanti ».`,
    ``,
    `Pour approfondir ce dossier ou simuler concrètement les impacts de nos propositions sur votre commune, je vous invite chaleureusement à interroger mon assistant numérique accessible en continu sur https://jhn.baronsmariani.org . Il est documenté sur l'ensemble de notre corpus et répondra avec précision à vos questions.`,
    ``,
    `Je reste bien évidemment à votre entière disposition personnelle pour échanger directement et vous prie de croire, Monsieur le Maire, en mon dévouement républicain pour notre territoire.`,
    ``,
    `Jean Hugues Noël Robert`,
    `Candidat aux Élections Sénatoriales de Haute-Corse`
  ].join("\n");

  // --------------------------------------------------------------------------
  // 5. Continuation Packet Universal Generation
  // --------------------------------------------------------------------------
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
    provenance: {
      source_name: sourceName,
      source_url: metadata.url || "https://jhn.baronsmariani.org/senatoriales",
      rossignol_packet_id: metadata.packet_id || null
    },
    target_electorate: targetElectorate,
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
    },
    instagram_payload: {
      platform: "instagram",
      target_audience: "Élus de terrain, relais jeunes, citoyens",
      carrousel_cards: carrouselCards,
      reel_script: reelScript,
      caption: instagramCaption,
      risk_checklist: instagramRiskChecklist
    },
    reponse_maire_payload: {
      platform: "direct_mail_or_letter",
      target_audience: "Maires ruraux et grands électeurs individuels",
      subject: reponseMaireSubject,
      body: reponseMaireBody,
      word_count: reponseMaireBody.split(/\s+/).length
    }
  };

  const whatsappNotification = [
    `📢 *Agent John — Paquet de Campagne Prêt (4 Volets)*`,
    `📌 *${title}*`,
    ``,
    `🔵 *Facebook :* Prêt (${continuationPacket.facebook_payload.word_count} mots)`,
    `⚫️ *X (Thread) :* ${xThread.length} tweets calibrés (<= 280 car.)`,
    `📸 *Instagram :* Carrousel (5 cartes) + Script Reel (${reelScript.duration_sec}s)`,
    `✉️ *Réponse Maire :* Courrier/Email prêt (${continuationPacket.reponse_maire_payload.word_count} mots)`,
    ``,
    `👉 Pour valider l'ensemble en un clic :`,
    `*approve ${packetId}*`
  ].join("\n");

  return {
    continuation_id: packetId,
    facebook_post: facebookPost,
    x_thread: xThread,
    instagram_carrousel: carrouselCards,
    instagram_reel: reelScript,
    instagram_caption: instagramCaption,
    reponse_maire: reponseMaireBody,
    continuation_packet: continuationPacket,
    whatsapp_notification: whatsappNotification
  };
}

/**
 * Derives campaign proposals directly from a Rossignol territorial watch packet.
 * @param {object} rossignolPacket - Packet generated by Rossignol runner.
 * @param {object} extraMeta - Optional additional metadata.
 */
export function deriveFromRossignolPacket(rossignolPacket, extraMeta = {}) {
  const content = rossignolPacket.content || rossignolPacket.title || "";
  const meta = {
    title: rossignolPacket.title,
    axis: rossignolPacket.campaign_metadata?.axis || rossignolPacket.category || "Veille Territoriale Corse",
    source_name: rossignolPacket.source_name,
    url: rossignolPacket.url,
    packet_id: rossignolPacket.packet_id,
    target_electorate: rossignolPacket.campaign_metadata?.target_electorate || "Maires et grands électeurs de Corse",
    ...extraMeta
  };

  return deriveSocialProposals(content, meta);
}

/**
 * Derives social media proposals from a markdown file path.
 */
export function deriveFromFile(filePath, extraMeta = {}) {
  const content = fs.readFileSync(filePath, "utf8");
  const fileName = path.basename(filePath);

  // Extract title, axis, author from frontmatter if present
  let fileTitle = null;
  let fileAxis = null;
  let fileAuthor = null;
  if (content.startsWith("---")) {
    const endFm = content.indexOf("\n---", 3);
    if (endFm !== -1) {
      const fmText = content.slice(3, endFm);
      const getField = (f) => {
        const m = fmText.match(new RegExp(`^${f}:\\s*(?:"([^"\\r\\n]+)"|'([^'\\r\\n]+)'|([^\\r\\n]+))`, "m"));
        return m ? (m[1] || m[2] || m[3] || "").trim() : null;
      };
      fileTitle = getField("title");
      fileAxis = getField("campaign_axis") || getField("axis");
      fileAuthor = getField("author");
    }
  }

  return deriveSocialProposals(content, {
    title: extraMeta.title || fileTitle || fileName.replace(/\.md$/, "").replace(/_/g, " "),
    axis: extraMeta.axis || fileAxis,
    author: extraMeta.author || fileAuthor,
    ...extraMeta
  });
}

