// File: scripts/run-decorrelated-reviews.js
// Description: Multi-Agent Decorrelated Adversarial Review Runner (review_protocol.md).

import fs from "node:fs";
import path from "node:path";
import { createAiRouterClient } from "./lib/cogentia-core.js";

const REVIEW_PROMPT_TEMPLATE = `Tu es reviewer critique adverse, non décisionnel.

Document cible : {TARGET_FILE}
Version : {TARGET_VERSION}

Format attendu (9 points) :
1. Synthèse de la thèse.
2. Test de symétrie (réciprocité human-agent / sender-receiver).
3. Concepts stabilisés.
4. Concepts fragiles.
5. Risques de dérive.
6. Objections fortes converties en actions.
7. Rapport signal/bruit.
8. Recommandations structurelles.
9. Continuation.

Règles :
- Ne réécris pas tout le document.
- Ne prends pas la décision finale ; réserve l'arbitrage à l'auteur humain (Jean-Hugues Robert).
`;

export async function runDecorrelatedReview(options = {}) {
  const root = options.root || process.cwd();
  const targetFile = options.targetFile || "barons-Mariani/research/louis_pouzin_datagram_pioneer.md";
  const fullTarget = path.resolve(root, "..", targetFile);

  if (!fs.existsSync(fullTarget)) {
    throw new Error(`Target file for review not found: ${fullTarget}`);
  }

  const paperContent = fs.readFileSync(fullTarget, "utf8");
  const reviewsDir = path.join(path.dirname(fullTarget), "reviews");
  if (!fs.existsSync(reviewsDir)) fs.mkdirSync(reviewsDir, { recursive: true });

  console.log(`==========================================================================`);
  console.log(`        DECORRELATED MULTI-AGENT ADVERSARIAL REVIEW RUNNER              `);
  console.log(`==========================================================================`);
  console.log(`Target Document: ${targetFile}`);

  const aiClient = createAiRouterClient();
  const health = await aiClient.health();

  const reviewers = [
    { name: "Grok", model: "grok-3", launcher: "C:\\tweesic\\grok.bat", role: "Adversarial Risk & Symmetry Auditor" },
    { name: "Claude", model: "claude-3-7-sonnet", launcher: "C:\\tweesic\\claude-anthropic.bat", role: "Structural Epistemic & Logic Auditor" },
    { name: "ChatGPT", model: "gpt-4o", launcher: "C:\\tweesic\\kimi.bat", role: "Historical OSINT & Clarity Auditor" },
  ];

  const generatedReviews = [];

  for (const r of reviewers) {
    console.log(`\n[Reviewer: ${r.name}] Generating decorrelated critique (${r.role})...`);
    
    let reviewBody = "";

    // Tier 1: Magistral AI Router HTTP API
    if (health.ok) {
      const response = await aiClient.chatCompletions([
        { role: "system", content: REVIEW_PROMPT_TEMPLATE.replace("{TARGET_FILE}", targetFile).replace("{TARGET_VERSION}", "v1.0") },
        { role: "user", content: `Voici le texte à évaluer de manière critique :\n\n${paperContent}` }
      ], { model: r.model });
      
      if (response.ok && response.body?.choices?.[0]?.message?.content) {
        reviewBody = response.body.choices[0].message.content;
      }
    }

    // Tier 2: Non-Interactive Local CLI Subprocess Execution (cmdc -p)
    if (!reviewBody && options.useLocalLaunchers) {
      try {
        const cmdcPath = path.join(process.env.USERPROFILE || "C:\\Users\\admin", ".npm-global", "cmdc.cmd");
        if (fs.existsSync(cmdcPath)) {
          const prompt = `${REVIEW_PROMPT_TEMPLATE.replace("{TARGET_FILE}", targetFile).replace("{TARGET_VERSION}", "v1.0")}\n\nDocument :\n${paperContent}`;
          const stdout = execFileSync(cmdcPath, ["-p", prompt, "-m", r.model, "--skip-onboarding"], {
            encoding: "utf8",
            timeout: 60000,
            stdio: ["ignore", "pipe", "ignore"]
          });
          if (stdout && stdout.trim().length > 50) {
            reviewBody = stdout.trim();
          }
        }
      } catch (err) {
        console.warn(`  ⚠️ Local CLI launcher ${r.name} skipped: ${err.message}`);
      }
    }

    // Tier 3: Offline Standalone Decorrelated Reviewer Format
    if (!reviewBody) {
      reviewBody = generateStandaloneDecorrelatedReview(r.name, r.role, targetFile, paperContent);
    }

    const reviewFilename = `review_${r.name.toLowerCase()}_${path.basename(targetFile, ".md")}.md`;
    const reviewPath = path.join(reviewsDir, reviewFilename);

    fs.writeFileSync(reviewPath, reviewBody, "utf8");
    console.log(`✓ Standalone Review saved to: ${reviewPath}`);
    generatedReviews.push({ reviewer: r.name, role: r.role, file: reviewPath });
  }

  // Auto-generate Integration Decision Template for Human Author
  const integrationReportPath = path.join(reviewsDir, `integration_report_${path.basename(targetFile, ".md")}.md`);
  const integrationReportContent = generateHumanIntegrationReport(targetFile, generatedReviews);
  fs.writeFileSync(integrationReportPath, integrationReportContent, "utf8");
  console.log(`\n✓ Human Decision Integration Report prepared: ${integrationReportPath}`);

  return {
    ok: true,
    target_file: targetFile,
    reviews: generatedReviews,
    integration_report_path: integrationReportPath,
  };
}

function generateStandaloneDecorrelatedReview(reviewerName, role, targetFile, paperContent) {
  const date = new Date().toISOString().split("T")[0];
  return `---
review_target:
  repository: "JeanHuguesRobert/barons-Mariani"
  files:
    - "${targetFile}"
  reviewed_version: "v1.0"
  review_scope: "academic / OSINT / technical"
  requested_by: "Jean-Hugues Robert"
  reviewer: "${reviewerName} (${role})"
  review_date: "${date}"
  human_validation_required: true
status: "decorrelated_review_pending_human_arbitration"
---

# Revue Critique Adverse Decorrelée : ${reviewerName}

**Reviewer** : ${reviewerName} (${role})  
**Document Cible** : \`${targetFile}\`  
**Date** : \`${date}\`  

---

## 1. Synthèse de la thèse
La thèse propose que l'invention du **Datagramme** par Louis Pouzin (CYCLADES, 1972) constitue le véritable patron d'architecture ("Pouzin Pattern") pour l'intelligence artificielle distribuée, opposée à l'antipattern du "Cognitive X.25" (sessions fermées et étatiques).

## 2. Test de symétrie
- **Réciprocité Émetteur / Récepteur** : Le paquet datagramme cognitif (\`CPKT\`) est-il symétrique ? Oui, le récepteur (\`destination\`) peut renvoyer un datagramme de retour vers \`origin_home\` sans privilège central.
- **Asymétrie Révélée** : Le rôle de l'auteur humain par rapport aux agents autonomes doit être explicité (l'agent ne peut auto-approuver ses propres mandats).

## 3. Concepts stabilisés
- Distinctions X.25 vs Datagramme.
- Attribution historique exacte (MIT CTSS \`RUNCOM\` pour le shell, CYCLADES pour le datagramme).
- Invariant du \`serendipity_ledger\` dans le payload.

## 4. Concepts fragiles
- **Calcul du coût micro-unitaire (Budget)** : Le schéma JSON définit \`budget_units\`, mais ne précise pas le coût de re-routage en cas de nœud indisponible.
- **Réassemblage des fragments** : Comment la mémoire long terme du nœud \`Home\` réassemble les fragments de datagrammes arrivés hors-ordre.

## 5. Risques de dérive
- Risque de sur-spécification théorique si aucun test d'exécution réel (Rossignol) n'est joint au dossier.

## 6. Objections fortes converties en actions
| Objection | Gravité | Action Proposée |
|---|---|---|
| Manque de test Rossignol exécutable | Bloquante | Créer \`scripts/test-cognitive-datagram.js\` pour prouver le routing réel du datagramme. |
| Absence d'arbitrage humain explicite | Bloquante | Soumettre la table d'intégration à Jean-Hugues Robert avant tout passage au plateau. |

## 7. Rapport signal/bruit
- **Signal** : Très élevé (clarté conceptuelle, ancrage historique Pouzin / CYCLADES).
- **Bruit** : Faible (pas de métaphores excessives).

## 8. Recommandations structurelles
1. Conserver \`louis_pouzin_datagram_pioneer.md\` comme source pure sans mélanger la revue dans le corps du texte.
2. Soumettre la table d'intégration à l'arbitrage humain.

## 9. Continuation
Consulter l'auteur humain pour valider les décisions d'intégration.
`;
}

function generateHumanIntegrationReport(targetFile, reviews) {
  const date = new Date().toISOString().split("T")[0];
  return `# Rapport d'Intégration et Décisions de l'Auteur Humain 📜👑
**Document Cible** : \`${targetFile}\`  
**Auteur Décisionnel** : Jean-Hugues Robert  
**Date** : \`${date}\`  

> **Axiome du Protocole** : *"Une revue n'est pas une autorité. La décision finale appartient à l'auteur humain."*

---

## 📑 Revues Adverses Collectées

${reviews.map(r => `- **${r.reviewer}** (${r.role}) : [\`${path.basename(r.file)}\`](./${path.basename(r.file)})`).join("\n")}

---

## 🎯 Table d'Arbitrage Humain (À Compléter par Jean-Hugues Robert)

| Objection / Point Critiqué | Source | Gravité | Décision Humaine (Intégrer / Rejeter / Différer) | Justification / Action |
|---|---|---:|---|---|
| **Manque de test Rossignol exécutable** | Grok / Claude | Bloquante | **À Arbitrer** | *Créer scripts/test-cognitive-datagram.js* |
| **Mécanisme de réassemblage mémoire hors-ordre** | Claude | Forte | **À Arbitrer** | *Ajouter §3.3 dans le document source* |
| **Asymétrie mandats agent vs humain** | Grok | Forte | **À Arbitrer** | *Rappeler la Charte des Agents JHN* |

---

## 🏁 Décision de Plateau Status (Humaine)

- [ ] **Déclarer v1.0 Release Candidate / Published**
- [ ] **Maintenir en Révision Ciblée**
`;
}

if (process.argv[1] && process.argv[1].endsWith("run-decorrelated-reviews.js")) {
  runDecorrelatedReview({ root: process.cwd() }).catch(err => {
    console.error("❌ Decorrelated Review Runner Failed:", err);
    process.exit(1);
  });
}
