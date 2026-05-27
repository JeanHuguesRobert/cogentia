#!/usr/bin/env node
/**
 * migrate-frontmatter.js
 *
 * Outil de migration des frontmatters vers le schéma v0.1 (Cogentia).
 *
 * Stratégie "Option A" (choisie explicitement) :
 * - Nettoyages UNIQUEMENT MÉCANIQUES et sûrs (suppression des champs legacy).
 * - Émission de CONTINUATIONS pour tout ce qui nécessite un jugement humain/agent.
 * - Zéro "intelligence" embarquée sur les cas ambigus (author vs creator, status complexe, provenance).
 * - Principe Cogentia : l'outil émet la continuation, il ne décide pas.
 *
 * Usage :
 *   node scripts/migrate-frontmatter.js --dry-run [--root <tweesic>] [--repo <name>] [--all]
 *   node scripts/migrate-frontmatter.js --apply   [--root <tweesic>] [--repo <name>]
 *
 * Legacy supprimés (mécanique) :
 *   repository, path, intended_path, canonical_path, canonical_slug, repository_candidate
 */

import fs from "fs";
import path from "path";

// Racine tweesic par défaut (peut être surchargée)
const DEFAULT_TWEESIC_ROOT = "C:\\tweesic";

function parseArgs() {
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf("--root");
  const repoIdx = args.indexOf("--repo");
  return {
    dryRun: args.includes("--dry-run"),
    apply: args.includes("--apply"),
    all: args.includes("--all"),
    broad: args.includes("--broad") || args.includes("--collect"),
    root: rootIdx !== -1 ? args[rootIdx + 1] : DEFAULT_TWEESIC_ROOT,
    repo: repoIdx !== -1 ? args[repoIdx + 1] : null,
    help: args.includes("--help") || args.includes("-h"),
  };
}

// Parseur minimal pour DÉTECTION seulement (présence de clés, pas de reconstruction)
function extractFrontmatterKeys(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const km = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (km) {
      fields[km[1]] = km[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
  return fields;
}

// Suppression MÉCANIQUE et SÛRE des champs legacy (filtre textuel pur, zéro parsing YAML)
// Préserve EXACTEMENT tout le reste : listes, guillemets, ordre, commentaires, whitespace, etc.
const LEGACY_KEYS = new Set([
  "repository",
  "path",
  "intended_path",
  "canonical_path",
  "canonical_slug",
  "repository_candidate",
]);

function removeLegacyKeysMechanically(content) {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return { changed: false, content, removed: [] };

  const yamlBlock = fmMatch[1];
  const lines = yamlBlock.split(/\r?\n/);
  const keptLines = [];
  const removed = [];

  for (const line of lines) {
    const keyMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:/);
    if (keyMatch && LEGACY_KEYS.has(keyMatch[1])) {
      removed.push(keyMatch[1]);
      continue; // suppression purement mécanique
    }
    keptLines.push(line);
  }

  if (removed.length === 0) {
    return { changed: false, content, removed: [] };
  }

  // Reconstitue le bloc frontmatter en préservant la structure
  let newYaml = keptLines.join("\n");
  // Nettoyage léger des lignes vides en fin de bloc (esthétique seulement)
  newYaml = newYaml.replace(/\n{3,}$/, "\n").replace(/^\n+/, "");
  const newFm = "---\n" + newYaml + "\n---";
  const newContent = newFm + content.slice(fmMatch[0].length);

  return { changed: true, content: newContent, removed };
}

// ============================================================
// LOCALISATION DU REGISTRY (pour les continuations)
// ============================================================

function findRegistryPath(explicitRoot) {
  // 1. Priorité à --root
  if (explicitRoot) {
    const candidate = path.join(explicitRoot, "JeanHuguesRobert", ".cogentia.json");
    if (fs.existsSync(candidate)) return candidate;
  }
  // 2. Cherche le .cogentia.json connu (JeanHuguesRobert)
  const known = path.join(DEFAULT_TWEESIC_ROOT, "JeanHuguesRobert", ".cogentia.json");
  if (fs.existsSync(known)) return known;
  // 3. Cherche .cogentia.json en remontant depuis cwd
  let current = process.cwd();
  const visited = new Set();
  while (current && !visited.has(current)) {
    visited.add(current);
    const candidate = path.join(current, ".cogentia.json");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function getContinuationsDir(registryPath) {
  if (!registryPath) return null;
  const dir = path.join(path.dirname(registryPath), ".cogentia", "continuations");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function generateContinuationId() {
  const hex = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return `ctn_${hex}`;
}

// ============================================================
// ÉMISSION DE CONTINUATION (format cogentia.continuation.v1)
// ============================================================

function emitContinuation(registryPath, fileRel, repo, reasons, snapshot, legacyRemoved) {
  const contDir = getContinuationsDir(registryPath);
  if (!contDir) {
    return { emitted: false, reason: "no registry found for continuations" };
  }

  const id = generateContinuationId();
  const now = new Date().toISOString();

  const continuation = {
    type: "continuation",
    protocol: "cogentia.continuation.v1",
    id,
    topicId: "urn:cop:topic:cogentia/frontmatter-migration-v0.1",
    agent: "*",
    task: "resolve_frontmatter_judgment",
    context: {
      file: fileRel,
      repo,
      reasons,
      frontmatter_snapshot: snapshot,
      legacy_cleaned: legacyRemoved || [],
      note: "Émis automatiquement par migrate-frontmatter.js (Option A : mechanical cleanups only + continuation emission). Aucun jugement n'a été pris par l'outil.",
      emitted_by: "migrate-frontmatter.js",
    },
    expected_result_schema: {
      decision: "string (ex: 'author_for_human_droit_auteur' | 'creator_for_mechanical' | 'keep_both_with_clarification')",
      author: "string|null",
      creator: "string|null",
      status: "string|null",
      source_document: "string|null",
      additional_sources: "array|null",
      reason: "string (justification courte du jugement)",
      confidence: "number (0-1)",
    },
    status: "dormant",
    createdAt: now,
    resume: {
      command: `node scripts/cogentia.js continuation resume ${id} <step_result.json>`,
      hint: "Voir research/agent_resumable_cli.md et la section CONTINUATION PROTOCOL dans scripts/cogentia.js",
    },
  };

  const filePath = path.join(contDir, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(continuation, null, 2) + "\n", "utf8");

  return { emitted: true, id, file: filePath };
}

// ============================================================
// DÉTECTION DES CAS DE JUGEMENT — MODE BROAD / COLLECT
// ============================================================
//
// Philosophie mise à jour (clarification utilisateur 2026-05-27) :
// On peut (et on doit) être assez large dans la détection pour "enchainer les continuations".
// L'outil ne décide rien. Il émet massivement des continuations pour tout ce qui
// mérite une étude humaine ultérieure. Les "échecs"/jugements sont collectés
// et traités dans un second temps (batch).
//
// Le mode "broad" est volontairement généreux dans la détection.

const BASE_STATUS_VALUES = new Set([
  "draft", "working-paper", "stable", "under-review", "deprecated", "superceded"
]);

function detectJudgmentNeeds(fields, yamlText, opts = {}) {
  const reasons = [];
  const broad = opts.broad || false;

  // === Cas toujours détectés (même en mode strict) ===

  if (fields.author && fields.creator) {
    reasons.push("author_vs_creator");
  }

  if (fields.source_document && fields.additional_sources) {
    reasons.push("provenance_clarification");
  }

  if (fields.generated_by && fields.author) {
    const g = String(fields.generated_by).toLowerCase();
    if (g.includes("claude") || g.includes("grok") || g.includes("100%")) {
      reasons.push("generated_by_vs_author");
    }
  }

  // Status non standard ou trop libre
  if (fields.status) {
    const s = String(fields.status).toLowerCase().trim();
    const startsWithBase = Array.from(BASE_STATUS_VALUES).some(base => s.startsWith(base));
    if (!startsWithBase) {
      reasons.push("non_canonical_status");
    } else if (s.includes("—") || s.includes(" - ") || s.length > 80) {
      reasons.push("complex_status");
    }
  }

  // === Détections élargies (activées en mode --broad ou par défaut pour collecter) ===

  if (broad) {
    // Synonymes connus qui devraient être normalisés
    if (fields.created || fields.date_created) reasons.push("synonym_created");
    if (fields.updated || fields.last_updated) reasons.push("synonym_updated");
    if (fields.lang && !fields.language) reasons.push("synonym_lang");
    if (fields.derived_from) reasons.push("synonym_derived_from");
    if (fields.authors) reasons.push("synonym_authors");
    if (fields.licence || fields["spdx-license-identifier"]) reasons.push("synonym_license");

    // Champs legacy expérimentaux qui ne sont pas en x-
    const experimental = ["type", "branch", "source_file", "merge_audit", "decision_stack", "vector_clock", "claimed_ops", "ghost_ops", "repository_candidate"];
    for (const exp of experimental) {
      if (fields[exp]) {
        reasons.push("experimental_field_" + exp);
      }
    }

    // Champs qui existent mais ne commencent pas par x- et ne sont pas dans le schéma connu
    const knownGood = new Set([
      "title", "subtitle", "description", "author", "creator", "affiliation", "date", "last_modified_at",
      "license", "language", "version", "canonical_url", "last_stamped_at", "status", "methodology",
      "generated_by", "ai_assisted_by", "reviewed_by", "human_arbitration_by", "version_history",
      "source_document", "additional_sources", "derived_from", "webid", "rights", "tags", "related_documents",
      "related_projects", "document_role", "layout", "permalink", "nav_order", "parent", "has_children",
      "privacy", "x-"
    ]);

    for (const key of Object.keys(fields)) {
      if (!knownGood.has(key) && !key.startsWith("x-")) {
        reasons.push("unknown_non_x_field_" + key);
      }
    }

    // Documents research-grade sans canonical_url (fortement recommandé)
    if (!fields.canonical_url) {
      reasons.push("missing_canonical_url");
    }

    // Status qui n'utilise aucune des valeurs de base officielles
    if (fields.status) {
      const s = String(fields.status).toLowerCase();
      const hasBase = Array.from(BASE_STATUS_VALUES).some(b => s.includes(b));
      if (!hasBase) {
        reasons.push("status_without_base_value");
      }
    }

    // Fichiers avec frontmatter très pauvre (peu de champs structurants)
    const coreFields = ["title", "date", "canonical_url", "license", "author", "creator"];
    const presentCore = coreFields.filter(f => fields[f]).length;
    if (presentCore <= 2) {
      reasons.push("very_poor_frontmatter");
    }
  }

  // Déduplique
  return [...new Set(reasons)];
}

// ============================================================
// MAIN
// ============================================================

function main() {
  const opts = parseArgs();

  if (opts.help) {
    console.log("Frontmatter Migration Tool — v0.1 (Option A + broad collect)");
    console.log("Nettoyages mécaniques sûrs + émission large de continuations pour étude ultérieure.");
    console.log("\nUsage:");
    console.log("  node scripts/migrate-frontmatter.js --dry-run --all --broad");
    console.log("  node scripts/migrate-frontmatter.js --apply --all --broad   # enchaine les continuations + collecte");
    console.log("  node scripts/migrate-frontmatter.js --apply --repo barons-Mariani --broad");
    console.log("\n--broad / --collect : active la détection large (beaucoup plus de continuations émises pour étude en second temps).");
    process.exit(0);
  }

  const mode = opts.apply ? "APPLY" : "DRY-RUN";
  console.log("Frontmatter Migration Tool — v0.1 (Option A + broad collect mode)");
  console.log("Mode :", mode);
  if (opts.broad) {
    console.log("Mode BROAD activé : détection large de jugements → on enchaîne les continuations et on collecte pour étude ultérieure.");
  } else {
    console.log("Principe : nettoyages mécaniques uniquement. Jugements → continuations émises.");
  }

  const registryPath = findRegistryPath(opts.root);
  const tweesicRoot = registryPath
    ? path.dirname(path.dirname(registryPath))
    : opts.root || DEFAULT_TWEESIC_ROOT;

  console.log("Registry :", registryPath || "(non trouvé — continuations limitées)");
  console.log("Tweesic root :", tweesicRoot);

  if (!opts.dryRun && !opts.apply) {
    console.log("\nUtilise --dry-run ou --apply");
    process.exit(1);
  }

  // Périmètre
  const REPOS = ["barons-Mariani", "cogentia", "inseme", "marenostrum", "FractaVolta", "Inox"];
  let targets = [];

  if (opts.repo) {
    targets = [opts.repo];
  } else if (opts.all) {
    targets = REPOS;
  } else {
    // Par défaut : barons-Mariani (le plus gros) + cogentia
    targets = ["barons-Mariani", "cogentia"];
  }

  console.log("\nCibles :", targets.join(", "));
  console.log("Scan des dossiers research/ + racine des repos...\n");

  let totalFiles = 0;
  let mechanicalCount = 0;
  let continuationCount = 0;
  const judgmentFiles = [];

  function processRepo(repoName) {
    const repoPath = path.join(tweesicRoot, repoName);
    if (!fs.existsSync(repoPath)) {
      console.log(`  [SKIP] ${repoName} (introuvable)`);
      return;
    }

    // Scan principal : research/ (le corpus de fond). On peut élargir plus tard.
    // On évite de scanner la racine complète pour ne pas doubler les research/.
    const searchDirs = [
      path.join(repoPath, "research"),
    ];

    function walk(dir, repo) {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }

      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (["node_modules", ".git", "_site", "dist", "build", ".jekyll-cache", "vendor"].includes(entry.name)) continue;
          walk(full, repo);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          totalFiles++;
          const content = fs.readFileSync(full, "utf8");
          const keys = extractFrontmatterKeys(content);

          // 1) Nettoyage mécanique (toujours sûr)
          const mech = removeLegacyKeysMechanically(content);
          const hasLegacy = mech.removed.length > 0;

          // 2) Détection jugement (indépendante du nettoyage)
          // En mode --broad on est volontairement large pour collecter le maximum de cas à étudier plus tard
          const judgmentReasons = detectJudgmentNeeds(keys, content, { broad: opts.broad });

          const rel = path.relative(tweesicRoot, full).replace(/\\/g, "/");

          if (hasLegacy) {
            mechanicalCount++;
            console.log(`→ ${rel}`);
            console.log(`   [MECHANICAL] Suppression : ${mech.removed.join(", ")}`);

            if (opts.apply) {
              fs.writeFileSync(full, mech.content, "utf8");
              console.log("   [APPLIQUÉ]");
            }
          }

          if (judgmentReasons.length > 0) {
            continuationCount++;
            console.log(`→ ${rel}`);
            console.log(`   [JUDGMENT] Raisons : ${judgmentReasons.join(", ")}`);

            if (opts.apply) {
              const emitRes = emitContinuation(
                registryPath,
                rel,
                repoName,
                judgmentReasons,
                keys,
                hasLegacy ? mech.removed : []
              );
              if (emitRes.emitted) {
                console.log(`   [CONTINUATION ÉMISE] ${emitRes.id}`);
                console.log(`   Fichier : ${emitRes.file}`);
              } else {
                console.log(`   [CONTINUATION NON ÉMISE] ${emitRes.reason}`);
              }
            } else {
              // En dry-run on simule
              console.log(`   [DRY] Continuation serait émise pour : ${judgmentReasons.join(", ")}`);
            }

            judgmentFiles.push({ file: rel, reasons: judgmentReasons });
          }
        }
      }
    }

    for (const d of searchDirs) {
      if (fs.existsSync(d)) walk(d, repoName);
    }
  }

  for (const r of targets) {
    processRepo(r);
  }

  console.log(`\n=== RÉSUMÉ ===`);
  console.log(`${totalFiles} fichiers .md analysés`);
  console.log(`${mechanicalCount} nettoyages mécaniques ${opts.apply ? "appliqués" : "identifiés"}`);
  console.log(`${continuationCount} continuations émises pour jugement ultérieur`);
  if (opts.broad) {
    console.log("(mode broad/collect : beaucoup de cas collectés pour étude en second temps)");
  }

  if (judgmentFiles.length > 0) {
    console.log(`\nFichiers nécessitant un jugement (continuations) :`);
    for (const j of judgmentFiles) {
      console.log(`  - ${j.file}  [${j.reasons.join(", ")}]`);
    }
  }

  if (!opts.apply) {
    console.log("\nMode DRY-RUN : aucun fichier modifié, aucune continuation créée.");
    console.log("Relance avec --apply pour exécuter les nettoyages mécaniques et émettre les continuations.");
  } else {
    console.log("\n[APPLY] Nettoyages mécaniques terminés. Continuations émises pour les jugements.");
    console.log("Utilise `node scripts/cogentia.js continuation list` pour les voir.");
  }
}

main();