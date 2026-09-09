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

function extractFrontmatterKeys(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const km = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (km) fields[km[1]] = km[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return fields;
}

const LEGACY_KEYS = new Set([
  "repository", "path", "intended_path", "canonical_path", "canonical_slug", "repository_candidate",
]);

function removeLegacyKeysMechanically(content) {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return { changed: false, content, removed: [] };
  const lines = fmMatch[1].split(/\r?\n/);
  const keptLines = [];
  const removed = [];
  for (const line of lines) {
    const keyMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:/);
    if (keyMatch && LEGACY_KEYS.has(keyMatch[1])) {
      removed.push(keyMatch[1]);
      continue;
    }
    keptLines.push(line);
  }
  if (removed.length === 0) return { changed: false, content, removed: [] };
  let newYaml = keptLines.join("\n");
  newYaml = newYaml.replace(/\n{3,}$/, "\n").replace(/^\n+/, "");
  const newFm = "---\n" + newYaml + "\n---";
  return { changed: true, content: newFm + content.slice(fmMatch[0].length), removed };
}

function findRegistryPath(explicitRoot) {
  if (explicitRoot) {
    const candidate = path.join(explicitRoot, "JeanHuguesRobert", ".cogentia.json");
    if (fs.existsSync(candidate)) return candidate;
  }
  const known = path.join(DEFAULT_TWEESIC_ROOT, "JeanHuguesRobert", ".cogentia.json");
  if (fs.existsSync(known)) return known;
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
  const hex = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `ctn_${hex}`;
}

function emitContinuation(registryPath, fileRel, repo, reasons, snapshot, legacyRemoved) {
  const contDir = getContinuationsDir(registryPath);
  if (!contDir) return { emitted: false, reason: "no registry found for continuations" };
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

const BASE_STATUS_VALUES = new Set([
  "draft", "working-paper", "stable", "under-review", "deprecated", "superceded",
]);

function detectJudgmentNeeds(fields, yamlText, opts = {}) {
  const reasons = [];
  const broad = opts.broad || false;

  if (fields.author && fields.creator) reasons.push("author_vs_creator");
  if (fields.source_document && fields.additional_sources) reasons.push("provenance_clarification");

  if (fields.generated_by && fields.author) {
    const g = String(fields.generated_by).toLowerCase();
    if (g.includes("claude") || g.includes("grok") || g.includes("100%")) reasons.push("generated_by_vs_author");
  }

  if (fields.status) {
    const s = String(fields.status).toLowerCase().trim();
    const startsWithBase = Array.from(BASE_STATUS_VALUES).some(base => s.startsWith(base));
    if (!startsWithBase) reasons.push("non_canonical_status");
    else if (s.includes("—") || s.includes(" - ") || s.length > 80) reasons.push("complex_status");
  }

  if (broad) {
    if (fields.created || fields.date_created) reasons.push("synonym_created");
    if (fields.updated || fields.last_updated) reasons.push("synonym_updated");
    if (fields.lang && !fields.language) reasons.push("synonym_lang");
    if (fields.derived_from) reasons.push("synonym_derived_from");
    if (fields.authors) reasons.push("synonym_authors");
    if (fields.licence || fields["spdx-license-identifier"]) reasons.push("synonym_license");

    // Unregistered or repository-local fields are intentionally not judgment
    // failures. Their natural names may remain while semantics evolve. Recurrence
    // can later justify documentation, synonym mapping, or schema promotion. The
    // x- prefix is optional and must never be introduced merely because a key is
    // unfamiliar to this migration tool.

    if (!fields.canonical_url) reasons.push("missing_canonical_url");

    if (fields.status) {
      const s = String(fields.status).toLowerCase();
      const hasBase = Array.from(BASE_STATUS_VALUES).some(b => s.includes(b));
      if (!hasBase) reasons.push("status_without_base_value");
    }

    const coreFields = ["title", "date", "canonical_url", "license", "author", "creator"];
    const presentCore = coreFields.filter(f => fields[f]).length;
    if (presentCore <= 2) reasons.push("very_poor_frontmatter");
  }

  return [...new Set(reasons)];
}

function main() {
  const opts = parseArgs();

  if (opts.help) {
    console.log("Frontmatter Migration Tool — v0.1 (Option A + broad collect)");
    console.log("Nettoyages mécaniques sûrs + émission large de continuations pour étude ultérieure.");
    console.log("\nUsage:");
    console.log("  node scripts/migrate-frontmatter.js --dry-run --all --broad");
    console.log("  node scripts/migrate-frontmatter.js --apply --all --broad   # enchaine les continuations + collecte");
    console.log("  node scripts/migrate-frontmatter.js --apply --repo barons-Mariani --broad");
    console.log("\n--broad / --collect : active la détection large sans considérer les champs locaux non enregistrés comme invalides.");
    process.exit(0);
  }

  const mode = opts.apply ? "APPLY" : "DRY-RUN";
  console.log("Frontmatter Migration Tool — v0.1 (Option A + broad collect mode)");
  console.log("Mode :", mode);
  if (opts.broad) console.log("Mode BROAD activé : collecte des jugements réels, avec tolérance des vocabulaires locaux.");
  else console.log("Principe : nettoyages mécaniques uniquement. Jugements → continuations émises.");

  const registryPath = findRegistryPath(opts.root);
  const tweesicRoot = registryPath ? path.dirname(path.dirname(registryPath)) : opts.root || DEFAULT_TWEESIC_ROOT;
  console.log("Registry :", registryPath || "(non trouvé — continuations limitées)");
  console.log("Tweesic root :", tweesicRoot);

  if (!opts.dryRun && !opts.apply) {
    console.log("\nUtilise --dry-run ou --apply");
    process.exit(1);
  }

  const REPOS = ["barons-Mariani", "cogentia", "inseme", "marenostrum", "FractaVolta", "Inox"];
  let targets = opts.repo ? [opts.repo] : opts.all ? REPOS : ["barons-Mariani", "cogentia"];

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
    const searchDirs = [path.join(repoPath, "research")];

    function walk(dir) {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (["node_modules", ".git", "_site", "dist", "build", ".jekyll-cache", "vendor"].includes(entry.name)) continue;
          walk(full);
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          totalFiles++;
          const content = fs.readFileSync(full, "utf8");
          const keys = extractFrontmatterKeys(content);
          const mech = removeLegacyKeysMechanically(content);
          const hasLegacy = mech.removed.length > 0;
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
              const emitRes = emitContinuation(registryPath, rel, repoName, judgmentReasons, keys, hasLegacy ? mech.removed : []);
              if (emitRes.emitted) {
                console.log(`   [CONTINUATION ÉMISE] ${emitRes.id}`);
                console.log(`   Fichier : ${emitRes.file}`);
              } else console.log(`   [CONTINUATION NON ÉMISE] ${emitRes.reason}`);
            } else console.log(`   [DRY] Continuation serait émise pour : ${judgmentReasons.join(", ")}`);
            judgmentFiles.push({ file: rel, reasons: judgmentReasons });
          }
        }
      }
    }

    for (const d of searchDirs) if (fs.existsSync(d)) walk(d);
  }

  for (const r of targets) processRepo(r);

  console.log("\n=== RÉSUMÉ ===");
  console.log(`${totalFiles} fichiers .md analysés`);
  console.log(`${mechanicalCount} nettoyages mécaniques ${opts.apply ? "appliqués" : "identifiés"}`);
  console.log(`${continuationCount} continuations émises pour jugement ultérieur`);
  if (opts.broad) console.log("(mode broad/collect : les champs locaux non enregistrés sont tolérés)");

  if (judgmentFiles.length > 0) {
    console.log("\nFichiers nécessitant un jugement (continuations) :");
    for (const j of judgmentFiles) console.log(`  - ${j.file}  [${j.reasons.join(", ")}]`);
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
