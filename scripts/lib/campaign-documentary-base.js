/**
 * Campaign Documentary Base & Idempotent Ingestion Manager.
 *
 * Maintains a live, structured, Git-versioned documentary base of facts,
 * media reports, and institutional developments for the Corsica Senate Campaign 2026.
 *
 * Storage location:
 * - research/campaign/chronique_senatoriales_2026/YYYY-MM-DD.md
 * - research/campaign/chronique_senatoriales_2026/index.md
 * - Persistent ledger: .cogentia/rossignol/seen_media_ledger.json
 */

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const docBaseDir = path.join(root, "research", "campaign", "chronique_senatoriales_2026");
const ledgerFile = path.join(root, ".cogentia", "rossignol", "seen_media_ledger.json");

/**
 * Loads the persistent ledger of processed URLs.
 */
export function loadMediaLedger() {
  if (fs.existsSync(ledgerFile)) {
    try {
      return JSON.parse(fs.readFileSync(ledgerFile, "utf8"));
    } catch (e) {
      // Fallback
    }
  }
  return {
    version: "1.0",
    last_updated: new Date().toISOString(),
    seen_urls: {}
  };
}

/**
 * Saves the persistent ledger to disk.
 */
export function saveMediaLedger(ledger) {
  const dir = path.dirname(ledgerFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  ledger.last_updated = new Date().toISOString();
  fs.writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2), "utf8");
}

/**
 * Classifies an article into one of the 5 campaign axes.
 */
export function classifyCampaignAxis(item) {
  const kw = (item.matched_keywords || []).map(k => k.toLowerCase());
  const text = `${item.title} ${item.summary}`.toLowerCase();

  if (kw.includes("sénat") || kw.includes("sénatorial") || kw.includes("parigi") || kw.includes("article 72-5") || kw.includes("autonomie") || text.includes("autonomie") || text.includes("sénat")) {
    return {
      code: "AXE_1_INSTITUTIONS",
      label: "Axe 1 : Autonomie de Capacité, Institutions & Communes Rurales"
    };
  }
  if (kw.includes("électricité") || kw.includes("edf") || kw.includes("solaire") || kw.includes("zni") || kw.includes("step") || text.includes("énergie")) {
    return {
      code: "AXE_2_ENERGIE",
      label: "Axe 2 : Énergie, Micro-Réseaux & FractaVolta"
    };
  }
  if (kw.includes("foncier") || kw.includes("logement") || kw.includes("indivision") || kw.includes("girtec") || kw.includes("brs") || kw.includes("résidence secondaire")) {
    return {
      code: "AXE_3_FONCIER",
      label: "Axe 3 : Foncier, Bâti Ancien & Statut du Résident Rural"
    };
  }
  if (kw.includes("eau") || kw.includes("sécheresse") || kw.includes("oehc") || kw.includes("déchets") || kw.includes("syvadec") || kw.includes("teom") || text.includes("incendie")) {
    return {
      code: "AXE_4_EAU_DECHETS",
      label: "Axe 4 : Eau, Déchets & Continuité des Services Publics"
    };
  }
  return {
    code: "AXE_5_TRANSPARENCE",
    label: "Axe 5 : Transparence Anti-Capture, Marchés Publics & Justice"
  };
}

/**
 * Idempotently appends new qualified articles to the daily campaign documentary log.
 * @param {Array<object>} items - List of candidate feed items.
 * @returns {object} Summary of newly recorded items vs skipped duplicates.
 */
export function recordArticlesToDocumentaryBase(items) {
  if (!fs.existsSync(docBaseDir)) fs.mkdirSync(docBaseDir, { recursive: true });

  const ledger = loadMediaLedger();
  const today = new Date().toISOString().split("T")[0];
  const dailyFile = path.join(docBaseDir, `${today}.md`);

  const newlyAdded = [];
  const skipped = [];

  for (const item of items) {
    if (!item.url && !item.title) continue;
    const itemKey = item.url || createHash("sha256").update(item.title).digest("hex");

    // Idempotency check
    if (ledger.seen_urls[itemKey]) {
      skipped.push(item);
      continue;
    }

    const axis = classifyCampaignAxis(item);
    const hash = createHash("sha256").update(`${item.title}${item.url}`).digest("hex").slice(0, 10);

    const record = {
      hash,
      recorded_at: new Date().toISOString(),
      source_feed: item.source_feed,
      title: item.title,
      url: item.url,
      published_at: item.published_at,
      summary: item.summary,
      relevance_score: item.relevance_score,
      matched_keywords: item.matched_keywords || [],
      axis_code: axis.code,
      axis_label: axis.label
    };

    newlyAdded.push(record);
    ledger.seen_urls[itemKey] = {
      title: item.title,
      recorded_at: record.recorded_at,
      daily_file: `${today}.md`,
      axis: axis.code
    };
  }

  if (newlyAdded.length === 0) {
    return { newly_added_count: 0, skipped_count: skipped.length, daily_file: dailyFile };
  }

  // Ensure daily file exists with frontmatter
  if (!fs.existsSync(dailyFile)) {
    const header = [
      `---`,
      `title: "Chronique des Sénatoriales 2026 — Dépêches et Faits du ${today}"`,
      `date: "${today}"`,
      `author: "Veille Rossignol / Institut Mariani"`,
      `status: "published"`,
      `corpus_role: "source"`,
      `document_role: "campaign-chronicle"`,
      `document_kind: "daily-digest"`,
      `visibility: "public"`,
      `---`,
      ``,
      `# Chronique des Sénatoriales 2026 — Dépêches et Faits du ${today}`,
      ``,
      `Ce document consigne en continu et de manière infalsifiable les faits, déclarations, arrêtés et débats publics relatifs à la Corse et à l'élection sénatoriale du 27 septembre 2026.`,
      ``,
      `---`,
      ``
    ].join("\n");
    fs.writeFileSync(dailyFile, header, "utf8");
  }

  // Append new entries
  let appendContent = "";
  for (const r of newlyAdded) {
    appendContent += [
      `### 📌 [${r.source_feed}] ${r.title}`,
      ``,
      `- **Date de publication :** ${r.published_at}`,
      `- **Axe Thématique :** \`${r.axis_label}\``,
      `- **Score de pertinence Sénat :** ${(r.relevance_score * 100).toFixed(0)}% *(Mots-clés : ${r.matched_keywords.join(", ") || "général"})*`,
      `- **Source originale :** [Consulter l'article en ligne](${r.url})`,
      ``,
      `> **Synthèse des faits :**  `,
      `> ${r.summary}`,
      ``,
      `**💡 Éclairage pour la campagne de Jean Hugues Robert :**  `,
      `Ce fait illustre l'impératif de l'**${r.axis_label.split(" : ")[1] || "Autonomie de Capacité"}**. À mobiliser lors des échanges avec les maires ruraux.`,
      ``,
      `---`,
      ``
    ].join("\n");
  }

  fs.appendFileSync(dailyFile, appendContent, "utf8");
  saveMediaLedger(ledger);
  updateCampaignIndex();

  return {
    newly_added_count: newlyAdded.length,
    skipped_count: skipped.length,
    daily_file: dailyFile,
    records: newlyAdded
  };
}

/**
 * Updates the global campaign chronicle index (research/campaign/chronique_senatoriales_2026/index.md).
 */
export function updateCampaignIndex() {
  if (!fs.existsSync(docBaseDir)) return;

  const files = fs.readdirSync(docBaseDir).filter(f => f.endsWith(".md") && f !== "index.md" && f !== "README.md").sort().reverse();
  const ledger = loadMediaLedger();
  const totalEntries = Object.keys(ledger.seen_urls).length;

  const indexContent = [
    `---`,
    `title: "Chronique Vivante & Base Documentaire — Élections Sénatoriales Corse 2026"`,
    `subtitle: "Registre continu, horodaté et auditable des faits et débats territoriaux pour le scrutin du 27 septembre 2026"`,
    `author: "Jean Hugues Noël Robert, baron Mariani — Institut Mariani / Cogentia"`,
    `date: "${new Date().toISOString().split("T")[0]}"`,
    `status: "active"`,
    `corpus_role: "source"`,
    `document_role: "campaign-chronicle"`,
    `document_kind: "registry-index"`,
    `visibility: "public"`,
    `---`,
    ``,
    `# Chronique Vivante & Base Documentaire — Élections Sénatoriales Corse 2026`,
    ``,
    `## Présentation & Objet`,
    ``,
    `Cette base documentaire enregistre automatiquement et de façon **idempotente** l'ensemble des dépêches, déclarations de candidats, rapports institutionnels (Chambre Régionale des Comptes, Sénat, CRE, OEHC) et événements territoriaux survenus durant la campagne des Sénatoriales de Haute-Corse (Scrutin du **27 septembre 2026**).`,
    ``,
    `* **Total des faits et articles indexés :** **${totalEntries}** dépêches qualifiées.`,
    `* **Dernière synchronisation :** \`${new Date().toISOString()}\``,
    `* **Nœud d'exécution de veille :** Fracta2 (\`100.108.221.96\`)`,
    ``,
    `---`,
    ``,
    `## 📅 Journaux Quotidiens de Campagne`,
    ``,
    files.map(f => `* 📄 [Chronique du ${f.replace(/\.md$/, "")}](${f})`).join("\n"),
    ``,
    `---`,
    ``,
    `## 🏛️ Les 5 Piliers Documentaires`,
    ``,
    `1. **Axe 1 :** [Autonomie de Capacité, Institutions & Communes Rurales](../fiches_maires/fiche_01_autonomie_de_capacite_finances_communales.md)`,
    `2. **Axe 2 :** [Énergie, Micro-Réseaux & FractaVolta](../fiches_maires/fiche_02_fractavolta_energie_villageoise.md)`,
    `3. **Axe 3 :** [Foncier, Logement & Statut du Résident Rural](../fiches_maires/fiche_03_statut_resident_rural_logement_foncier.md)`,
    `4. **Axe 4 :** [Eau, Déchets & Continuité des Services Publics](../fiches_maires/fiche_04_eau_dechets_services_publics.md)`,
    `5. **Axe 5 :** [Transparence Anti-Capture & Marchés Publics](../fiches_maires/fiche_05_transparence_anti_capture_marches_publics.md)`,
    ``
  ].join("\n");

  fs.writeFileSync(path.join(docBaseDir, "index.md"), indexContent, "utf8");
}
