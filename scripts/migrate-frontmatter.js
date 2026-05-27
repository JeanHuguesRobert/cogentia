#!/usr/bin/env node
/**
 * migrate-frontmatter.js
 *
 * Outil de migration des frontmatters vers le schéma v0.1.
 *
 * Philosophie :
 * - Flexible en entrée (tolère les synonymes et styles existants)
 * - Strict en sortie (applique le schéma canonique)
 * - Supporte le dry-run
 * - Génère des rapports clairs
 *
 * Usage :
 *   node scripts/migrate-frontmatter.js --dry-run
 *   node scripts/migrate-frontmatter.js --apply --repo barons-Mariani
 *   node scripts/migrate-frontmatter.js --apply
 */

import fs from "fs";
import path from "path";

const ROOT = process.cwd();

// TODO: Charger ce fichier de mapping (à compléter)
const MAPPING_FILE = path.join(ROOT, "cogentia/docs/frontmatter-mapping-v0.1.yaml");

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    apply: args.includes("--apply"),
    repo: args.includes("--repo") ? args[args.indexOf("--repo") + 1] : null,
  };
}

function main() {
  const opts = parseArgs();

  console.log("Frontmatter Migration Tool — v0.1");
  console.log("Mode :", opts.dryRun ? "DRY-RUN" : "APPLY");

  if (!opts.dryRun && !opts.apply) {
    console.log("\nUsage :");
    console.log("  node scripts/migrate-frontmatter.js --dry-run [--repo <name>]");
    console.log("  node scripts/migrate-frontmatter.js --apply [--repo <name>]");
    process.exit(1);
  }

  // TODO: Charger le mapping depuis le fichier YAML
  // TODO: Scanner les repos (en utilisant la logique existante de cogentia.js si possible)
  // TODO: Pour chaque fichier .md :
  //   - Parser le frontmatter
  //   - Appliquer le mapping
  //   - Gérer les suppressions
  //   - Réécrire le fichier (si apply)
  //   - Logger les changements

  console.log("\n[Travail en cours]");
  console.log("Ce script est en cours de construction.");
  console.log("Prochaines étapes prévues :");
  console.log("  - Lecture du fichier de mapping");
  console.log("  - Support du dry-run détaillé");
  console.log("  - Application réelle des changements");
  console.log("  - Rapport par dépôt");
}

main();