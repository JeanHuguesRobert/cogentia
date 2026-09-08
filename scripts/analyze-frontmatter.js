#!/usr/bin/env node
/**
 * analyze-frontmatter.js
 *
 * Outil d'analyse des frontmatters sur l'ensemble du corpus (périmètre large).
 * Objectif : collecter tous les attributs utilisés, détecter synonymes,
 * proposer un schéma canonique normalisé avec valeurs par défaut.
 *
 * Usage:
 *   node scripts/analyze-frontmatter.js
 *   node scripts/analyze-frontmatter.js --json
 */

import fs from "fs";
import path from "path";
import { extractFrontmatter } from "./lib/frontmatter-validator.js";

const ROOT = process.cwd();

// Répertoires principaux à scanner (périmètre large)
const REPO_DIRS = [
  "barons-Mariani",
  "cogentia",
  "inseme",
  "marenostrum",
  "FractaVolta",
  "Inox",
];

// Ignorer ces dossiers
const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "_site", ".jekyll-cache", "vendor",
]);

function parseFrontmatter(content) {
  const extracted = extractFrontmatter(content);
  return extracted.present && !extracted.error ? extracted.data : null;
}

function isMarkdown(file) {
  return file.endsWith(".md") || file.endsWith(".markdown");
}

function shouldIgnore(dirName) {
  return IGNORE_DIRS.has(dirName) || dirName.startsWith(".");
}

function walk(dir, repoName, results) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!shouldIgnore(entry.name)) {
        walk(fullPath, repoName, results);
      }
    } else if (entry.isFile() && isMarkdown(entry.name)) {
      try {
        const content = fs.readFileSync(fullPath, "utf8");
        const fm = parseFrontmatter(content);
        if (fm && Object.keys(fm).length > 0) {
          results.push({
            repo: repoName,
            path: path.relative(ROOT, fullPath).replace(/\\/g, "/"),
            frontmatter: fm,
          });
        }
      } catch (e) {
        // ignorer les fichiers illisibles
      }
    }
  }
}

function main() {
  const allDocs = [];

  console.log("🔍 Analyse des frontmatters sur le périmètre large...\n");

  for (const repo of REPO_DIRS) {
    const repoPath = path.join(ROOT, repo);
    if (!fs.existsSync(repoPath)) {
      console.warn(`  ⚠️  Dossier non trouvé : ${repo}`);
      continue;
    }
    console.log(`  → Scan de ${repo}...`);
    walk(repoPath, repo, allDocs);
  }

  console.log(`\n✓ ${allDocs.length} documents avec frontmatter analysés.\n`);

  // Agrégation des clés
  const keyStats = new Map();

  for (const doc of allDocs) {
    for (const [key, value] of Object.entries(doc.frontmatter)) {
      if (!keyStats.has(key)) {
        keyStats.set(key, {
          count: 0,
          repos: new Set(),
          sampleValues: [],
          types: new Set(),
        });
      }
      const stat = keyStats.get(key);
      stat.count++;
      stat.repos.add(doc.repo);
      if (stat.sampleValues.length < 5) {
        stat.sampleValues.push(value);
      }
      stat.types.add(Array.isArray(value) ? "array" : typeof value);
    }
  }

  // Affichage des résultats
  const sortedKeys = [...keyStats.entries()].sort((a, b) => b[1].count - a[1].count);

  console.log("=== Attributs détectés (triés par fréquence) ===\n");

  for (const [key, stat] of sortedKeys) {
    const repos = [...stat.repos].join(", ");
    const types = [...stat.types].join(" | ");
    console.log(`${key.padEnd(28)} | ${String(stat.count).padStart(4)}×  | ${types.padEnd(10)} | ${repos}`);
  }

  console.log("\n=== Proposition de schéma initial (v0.1) ===\n");
  console.log("Ce qui suit est une première proposition automatique. Elle sera affinée humainement.\n");

  // Proposition basique de schéma
  const proposed = {};

  for (const [key, stat] of sortedKeys) {
    let canonical = key;
    let description = `Attribut détecté ${stat.count} fois.`;
    let defaultValue = null;

    // Heuristiques simples de normalisation
    if (["author", "authors", "creator", "auteur"].includes(key)) {
      canonical = "creator";
      description = "Auteur ou créateur principal du document.";
    }
    if (["affiliation", "affiliations"].includes(key)) {
      canonical = "affiliation";
      description = "Institution ou organisation de rattachement.";
    }
    if (["date", "created", "published", "last_modified_at"].includes(key)) {
      canonical = "date";
      description = "Date principale du document (création ou publication).";
    }
    if (["license", "licence"].includes(key)) {
      canonical = "license";
      description = "Licence du document.";
      defaultValue = "CC BY-SA 4.0";
    }
    if (["status"].includes(key)) {
      canonical = "status";
      description = "Statut éditorial du document.";
    }
    if (["tags", "keywords"].includes(key)) {
      canonical = "tags";
      description = "Mots-clés ou catégories.";
    }

    proposed[canonical] = {
      original_keys: [...new Set([key, ...stat.sampleValues.map(v => typeof v === 'string' ? v : '').filter(Boolean)])],
      description,
      type: [...stat.types][0] || "string",
      default: defaultValue,
      frequency: stat.count,
    };
  }

  console.log(JSON.stringify(proposed, null, 2));
}

main();
