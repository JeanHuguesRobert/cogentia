import fs from "node:fs";
import path from "node:path";
import {
  PUBLIC_VIEW,
  PRIVATE_VIEW,
  filterReposForView,
  isPrivateRepo,
  isCogentiaGeneratedProjection,
} from "./privacy-views.js";

/**
 * Static seed concept aliases (S3)
 * Ensures load-bearing doctrines resolve deterministically.
 */
export const SEED_CONCEPT_ALIASES = [
  {
    name: "Potentics",
    aliases: ["potentics", "science des possibles", "transition possibiliste", "potentialite graduee"],
    canonical_repo: "barons-Mariani",
    canonical_rel: "research/potentics.md",
    canonical_url: "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/potentics.md"
  },
  {
    name: "Channels Fragmentation",
    aliases: ["fragmentation des canaux", "channel fragmentation", "canaux fragmentes", "vigilia"],
    canonical_repo: "barons-Mariani",
    canonical_rel: "research/vigilia.md",
    canonical_url: "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/vigilia.md"
  },
  {
    name: "Interaction Register",
    aliases: ["interaction register", "registre des interactions", "mail_trace", "mail trace", "registre d'interaction"],
    canonical_repo: "JeanHuguesRobert",
    canonical_rel: "interaction_packets/mail_trace.md",
    canonical_url: "https://github.com/JeanHuguesRobert/JeanHuguesRobert/blob/main/interaction_packets/mail_trace.md"
  },
  {
    name: "Exploration Rationnelle du Possible",
    aliases: ["exploration rationnelle du possible", "erp", "rational exploration of the possible"],
    canonical_repo: "barons-Mariani",
    canonical_rel: "research/potentics.md",
    canonical_url: "https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/potentics.md"
  },
  {
    name: "Seconde Methode",
    aliases: ["seconde methode", "seconde méthode", "second method", "conserved negative returns"],
    canonical_repo: "cogentia",
    canonical_rel: "research/corpus_navigation_audit.md",
    canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/corpus_navigation_audit.md"
  },
  {
    name: "Conceptual Gravity",
    aliases: ["conceptual gravity", "self-orienting corpus", "self-orienting reactive corpus", "corpus.orient"],
    canonical_repo: "cogentia",
    canonical_rel: "research/conceptual_gravity.md",
    canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/conceptual_gravity.md"
  },
  {
    name: "Autonomie de Capacité",
    aliases: ["autonomie de capacite", "autonomie de capacité", "finances communales", "dgf", "dotation globale de fonctionnement", "perequation", "péréquation", "communes rurales", "autonomie de papier", "sanctuarisation dgf"],
    canonical_repo: "cogentia",
    canonical_rel: "research/campaign/fiches_maires/fiche_01_autonomie_de_capacite_finances_communales.md",
    canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/campaign/fiches_maires/fiche_01_autonomie_de_capacite_finances_communales.md"
  },
  {
    name: "FractaVolta Énergie Villageoise",
    aliases: ["fractavolta", "energie villageoise", "énergie villageoise", "batteries seconde vie", "seconde vie", "autoconsommation collective", "boucle locale energie", "agrivoltaisme", "agrivoltaïsme", "vignes friches"],
    canonical_repo: "cogentia",
    canonical_rel: "research/campaign/fiches_maires/fiche_02_fractavolta_energie_villageoise.md",
    canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/campaign/fiches_maires/fiche_02_fractavolta_energie_villageoise.md"
  },
  {
    name: "Statut Résident Rural et Foncier",
    aliases: ["statut resident rural", "statut résident rural", "bail reel solidaire", "bail réel solidaire", "brs", "indivision fonciere", "indivision foncière", "girtec", "logement communal", "residence secondaire corse"],
    canonical_repo: "cogentia",
    canonical_rel: "research/campaign/fiches_maires/fiche_03_statut_resident_rural_logement_foncier.md",
    canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/campaign/fiches_maires/fiche_03_statut_resident_rural_logement_foncier.md"
  },
  {
    name: "Eau Déchets et Services Publics",
    aliases: ["eau et dechets", "eau et déchets", "teom", "taxe ordures menageres", "taxe ordures ménagères", "exportation dechets", "retenues collinaires", "oehc", "secheresse corse", "sécheresse corse", "gestion de l'eau"],
    canonical_repo: "cogentia",
    canonical_rel: "research/campaign/fiches_maires/fiche_04_eau_dechets_services_publics.md",
    canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/campaign/fiches_maires/fiche_04_eau_dechets_services_publics.md"
  },
  {
    name: "Transparence Marchés Publics et Anti-Capture",
    aliases: ["transparence marches publics", "transparence marchés publics", "dossier 1755", "anti capture", "chambre regionale des comptes", "chambre régionale des comptes", "subventions territoriales", "marches publics corse"],
    canonical_repo: "cogentia",
    canonical_rel: "research/campaign/fiches_maires/fiche_05_transparence_anti_capture_marches_publics.md",
    canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/campaign/fiches_maires/fiche_05_transparence_anti_capture_marches_publics.md"
  },
  {
    name: "Agent John Compagnon Numérique",
    aliases: ["agent john", "agent jhn", "assistant numerique", "assistant numérique", "dhitl", "you draft he decides", "demultiplication", "démultiplication", "compagnon numerique"],
    canonical_repo: "cogentia",
    canonical_rel: "research/reasoning_loop.md",
    canonical_url: "https://github.com/JeanHuguesRobert/cogentia/blob/main/research/reasoning_loop.md"
  },
  {
    name: "Kudocracy",
    aliases: ["kudocracy", "kudocratie", "democratie directe", "démocratie directe", "democratie liquide", "démocratie liquide", "vote vivant", "grands electeurs vote", "john vote"],
    canonical_repo: "survey",
    canonical_rel: "README.md",
    canonical_url: "https://github.com/JeanHuguesRobert/survey/blob/main/README.md"
  }
];

/**
 * S1 — Static Projection Generator
 * Generates llms.txt / llms-full.txt for a privacy view.
 *
 * @param {object} ctx
 * @param {Array} [inventory=[]]
 * @param {{ view?: "public"|"private", fanOut?: boolean }} [options]
 *
 * Public view:
 *   - Lists only public repos
 *   - Writes `llms.txt` + `llms-full.txt` at registry root and fans out to public repos only
 *   - Removes stale cogentia-generated projections from private repo roots (leak cleanup)
 *
 * Private view:
 *   - Lists all non-secret repos (including private)
 *   - Writes only under `.cogentia/projections/` (never fans out to public repo roots)
 */
export function emitStaticProjection(ctx, inventory = [], options = {}) {
  const rootDir = ctx.registryRoot || ctx.rootPath || process.cwd();
  const view = options.view === PRIVATE_VIEW ? PRIVATE_VIEW : PUBLIC_VIEW;
  const allRepos = ctx.repos || [];
  const visibleRepos = filterReposForView(allRepos, view);

  const domainLabel =
    view === PRIVATE_VIEW
      ? "PRIVATE (workspace / admin — do not publish)"
      : "PUBLIC (sanitized — safe to publish)";

  const lines = [
    "# Corpus Static Projection (llms.txt Standard)",
    `> Generated by cogentia.js. Authoritative sitemap & navigation entry points.`,
    `> Privacy view: **${view}** — ${domainLabel}`,
    "",
    "## Repositories & Canonical Entry Points",
    ""
  ];

  for (const repo of visibleRepos) {
    lines.push(`- **[${repo.name}]**: ${repo.path}`);
    lines.push(`  - Role: ${repo.role || "primary"}`);
    lines.push(`  - Visibility: ${repo.visibility || repo.policy?.visibility || (isPrivateRepo(repo) ? "private" : "public")}`);
    lines.push(`  - Index: ${path.join(repo.path, "research", "index.md")}`);
    lines.push(`  - Concepts: ${path.join(repo.path, "research", "concepts.md")}`);
  }

  if (view === PUBLIC_VIEW) {
    const hidden = allRepos.filter((r) => isPrivateRepo(r));
    if (hidden.length) {
      lines.push("");
      lines.push("## Privacy Note");
      lines.push("");
      lines.push(
        `- ${hidden.length} private/confidential repositor${hidden.length === 1 ? "y is" : "ies are"} omitted from this public projection.`
      );
      lines.push("- Full private projection lives under `.cogentia/projections/` (workspace only).");
    }
  }

  lines.push("");
  lines.push("## Key Seed Doctrines & Resolution Map");
  lines.push("");

  for (const item of SEED_CONCEPT_ALIASES) {
    lines.push(`- **${item.name}**: [${item.canonical_rel}](${item.canonical_url})`);
    lines.push(`  - Aliases: ${item.aliases.join(", ")}`);
  }

  lines.push("");
  lines.push("## Navigation Contract Verbs (CPsN v0.1)");
  lines.push("- `resolve(name)`: Deterministic alias -> canonical file lookup");
  lines.push("- `route(question, policy)`: Pre-filtered similarity routing across Attractor Cards");
  lines.push("- `fetch(card)`: Retrieve Attractor Card for source document");

  const content = lines.join("\n") + "\n";

  // Build llms-full.txt (Full Text Concatenation of public canonical specs only)
  const fullLines = [
    "# Corpus Full Text Projection (llms-full.txt)",
    "> Generated by cogentia.js. Full text concatenation of canonical corpus specifications.",
    `> Privacy view: **${view}** — ${domainLabel}`,
    "",
    "---",
    ""
  ];

  const canonicalRelPaths = [
    "research/potentics.md",
    "research/vigilia.md",
    "research/informational_gravity.md",
    "research/corpus_navigation_audit.md",
    "docs/connect-mcp-clients.md",
    "docs/cogentia-magistral-boundary.md"
  ];

  for (const relPath of canonicalRelPaths) {
    let fullFile = path.join(rootDir, relPath);
    if (!fs.existsSync(fullFile)) {
      fullFile = path.join(rootDir, "..", "barons-Mariani", relPath);
    }
    if (fs.existsSync(fullFile)) {
      try {
        const text = fs.readFileSync(fullFile, "utf8");
        fullLines.push(`## Section: ${relPath}`);
        fullLines.push("");
        fullLines.push(text);
        fullLines.push("");
        fullLines.push("---");
        fullLines.push("");
      } catch {
        // Skip unreadable files
      }
    }
  }

  const fullContent = fullLines.join("\n") + "\n";

  let llmsPath;
  let llmsFullPath;
  const publishedRepos = [];
  const cleanedPrivateRepos = [];

  if (view === PRIVATE_VIEW) {
    // Private artifacts stay under .cogentia/ only — never fan out to public roots
    const projDir = path.join(rootDir, ".cogentia", "projections");
    if (!fs.existsSync(projDir)) fs.mkdirSync(projDir, { recursive: true });
    llmsPath = path.join(projDir, "llms.txt");
    llmsFullPath = path.join(projDir, "llms-full.txt");
    fs.writeFileSync(llmsPath, content, "utf8");
    fs.writeFileSync(llmsFullPath, fullContent, "utf8");
    publishedRepos.push("cogentia:.cogentia/projections");
  } else {
    llmsPath = path.join(rootDir, "llms.txt");
    llmsFullPath = path.join(rootDir, "llms-full.txt");
    fs.writeFileSync(llmsPath, content, "utf8");
    fs.writeFileSync(llmsFullPath, fullContent, "utf8");

    const fanOut = options.fanOut !== false;
    if (fanOut) {
      for (const repo of visibleRepos) {
        const repoDir = path.resolve(rootDir, repo.path || ".");
        if (fs.existsSync(repoDir) && fs.statSync(repoDir).isDirectory()) {
          try {
            fs.writeFileSync(path.join(repoDir, "llms.txt"), content, "utf8");
            fs.writeFileSync(path.join(repoDir, "llms-full.txt"), fullContent, "utf8");
            publishedRepos.push(repo.name || path.basename(repoDir));
          } catch {
            // Skip unwriteable directories
          }
        }
      }
    } else {
      publishedRepos.push("cogentia");
    }

    // Leak cleanup: remove cogentia-generated projections from private repo roots
    for (const repo of allRepos.filter((r) => isPrivateRepo(r))) {
      const repoDir = path.resolve(rootDir, repo.path || ".");
      if (!fs.existsSync(repoDir)) continue;
      let cleaned = false;
      for (const fileName of ["llms.txt", "llms-full.txt"]) {
        const target = path.join(repoDir, fileName);
        if (!fs.existsSync(target)) continue;
        try {
          const existing = fs.readFileSync(target, "utf8");
          if (isCogentiaGeneratedProjection(existing)) {
            fs.unlinkSync(target);
            cleaned = true;
          }
        } catch {
          // ignore
        }
      }
      if (cleaned) cleanedPrivateRepos.push(repo.name || path.basename(repoDir));
    }
  }

  return {
    ok: true,
    view,
    llms_path: llmsPath,
    llms_full_path: llmsFullPath,
    repos_listed: visibleRepos.length,
    repos_projected: publishedRepos.length,
    published_repos: publishedRepos,
    private_repos_omitted: allRepos.filter((r) => isPrivateRepo(r)).map((r) => r.name),
    cleaned_private_repos: cleanedPrivateRepos,
  };
}

/**
 * Emit both public and private static projections.
 * @param {object} ctx
 * @param {Array} [inventory]
 */
export function emitDualStaticProjections(ctx, inventory = []) {
  const publicResult = emitStaticProjection(ctx, inventory, { view: PUBLIC_VIEW, fanOut: true });
  const privateResult = emitStaticProjection(ctx, inventory, { view: PRIVATE_VIEW, fanOut: false });
  return {
    ok: publicResult.ok && privateResult.ok,
    public: publicResult,
    private: privateResult,
  };
}

/**
 * S2 — Publish Authoritative Registry
 */
export function publishRegistry(ctx) {
  const cogentiaRepo = (ctx.repos || []).find(r => r.name === "cogentia");
  const published = [];

  if (cogentiaRepo && fs.existsSync(cogentiaRepo.path)) {
    const target = path.join(cogentiaRepo.path, "docs", "registry.json");
    if (!fs.existsSync(path.dirname(target))) fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(ctx.config || ctx.repos, null, 2) + "\n", "utf8");
    published.push(target);
  }

  return { ok: true, published };
}

/**
 * S3 / Layer 1 — Deterministic Resolution (Name/Alias -> Canonical File)
 */
export function resolveConceptAlias(query, inventory = []) {
  const normQuery = String(query || "").toLowerCase().trim();
  if (!normQuery) return { hit: false };

  // 1. Check seed aliases first (S3)
  for (const seed of SEED_CONCEPT_ALIASES) {
    if (seed.name.toLowerCase() === normQuery || seed.aliases.some(a => normQuery.includes(a) || (normQuery.length >= 5 && a.includes(normQuery)))) {
      return {
        hit: true,
        resolution_kind: "seed_alias",
        name: seed.name,
        canonical_repo: seed.canonical_repo,
        canonical_rel: seed.canonical_rel,
        canonical_url: seed.canonical_url,
        confidence: 1.0,
      };
    }
  }

  // 2. Check inventory documents by title or basename match
  for (const doc of inventory) {
    const title = (doc.title || "").toLowerCase();
    const basename = path.basename(doc.rel || "", ".md").toLowerCase();
    if (title === normQuery || basename === normQuery) {
      return {
        hit: true,
        resolution_kind: "exact_document_match",
        name: doc.title || basename,
        canonical_repo: doc.repo,
        canonical_rel: doc.rel,
        canonical_url: doc.github_url || doc.url,
        confidence: 0.95,
      };
    }
  }

  return { hit: false };
}

/**
 * S4 — Attractor Card Generator
 */
export function buildAttractorCard(doc) {
  const title = doc.title || path.basename(doc.rel || "", ".md");
  return {
    card_id: `card:${doc.repo}:${doc.rel}`,
    what_i_hold: doc.description || title,
    questions_resolved: [
      `What is ${title}?`,
      `Where is ${title} defined?`
    ],
    claims_manifest: doc.github_url || doc.url || doc.rel,
    version: doc.version || "1.0",
    canonical_url: doc.github_url || doc.url || doc.rel,
    document_role: doc.document_role || "source",
    lifecycle_state: doc.lifecycle_state || "working",
  };
}

/**
 * S5 — Stub Convention Check
 */
export function isStubDocument(doc) {
  if (!doc) return false;
  if (doc.document_role === "stub") return true;
  if (doc.canonical || doc.canonical_url) return true;
  if (doc.size_bytes && doc.size_bytes < 500 && (doc.rel || "").indexOf("research/") < 0) return true;
  return false;
}

/**
 * S7 — 3-Layer Guide Routing Engine
 * @param {string} query
 * @param {Array|object} inventory - document array, or inventory object with `.documents`
 */
export function guideResolve(query, inventory = []) {
  const docs = Array.isArray(inventory)
    ? inventory
    : Array.isArray(inventory?.documents)
      ? inventory.documents
      : [];

  // Layer 1: Deterministic resolution (No embeddings! Direct alias/canonical lookup)
  const layer1 = resolveConceptAlias(query, docs);
  if (layer1.hit) {
    return {
      ok: true,
      layer: 1,
      mode: "deterministic_alias",
      query,
      result: layer1,
      canonical_repo: layer1.canonical_repo,
      canonical_rel: layer1.canonical_rel,
      canonical_url: layer1.canonical_url,
    };
  }

  // Layer 2: Hard Admissibility Pre-Filter
  const admissibleDocs = docs.filter(doc => {
    if (isStubDocument(doc)) return false;
    const role = doc.document_role || doc.role;
    if (role && role !== "source" && role !== "operational") return false;
    if (doc.is_generated || (doc.rel || "").includes("index.md") || (doc.rel || "").includes("concepts.md")) return false;
    // Public Guide must never resolve into non-public docs
    const level = doc.visibility?.level || "public";
    if (level !== "public") return false;
    if ((doc.visibility?.public_presence || "full") !== "full") return false;
    return true;
  });

  // Layer 3: Similarity & Reranking over Attractor Cards
  const queryWords = String(query).toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const scored = admissibleDocs.map(doc => {
    const card = buildAttractorCard(doc);
    const text = `${doc.title || ''} ${doc.description || ''} ${doc.rel || ''}`.toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      if (text.includes(word)) score += 1;
    }
    return { doc, card, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

  if (scored.length > 0) {
    const top = scored[0];
    return {
      ok: true,
      layer: 3,
      mode: "attractor_card_similarity",
      query,
      result: top.card,
      canonical_url: top.card.canonical_url,
      scored_matches: scored.slice(0, 5).map(s => ({ title: s.doc.title, url: s.card.canonical_url, score: s.score })),
    };
  }

  return {
    ok: false,
    layer: 3,
    mode: "unresolved",
    query,
    message: "No canonical file or source document resolved in 1 hop.",
  };
}

/**
 * S6 — Navigation Benchmark & Negative-Returns Loop
 */
export function runNavigationBenchmark(ctx, inventory = []) {
  const seedQueries = [
    {
      query: "Where is Potentics?",
      expected_repo: "barons-Mariani",
      expected_rel: "research/potentics.md"
    },
    {
      query: "Where is the channel fragmentation document?",
      expected_repo: "barons-Mariani",
      expected_rel: "research/vigilia.md"
    },
    {
      query: "Where is the interaction register?",
      expected_repo: "JeanHuguesRobert",
      expected_rel: "interaction_packets/mail_trace.md"
    }
  ];

  const results = [];
  let passed = 0;

  for (const test of seedQueries) {
    const res = guideResolve(test.query, inventory);
    const actualRel = res.result?.canonical_rel || (res.result?.canonical_url || "").replace(/^.*github\.com\/[^\/]+\/[^\/]+\/blob\/[^\/]+\//, "");
    const isHit = res.ok && actualRel.includes(test.expected_rel.split("/").pop());

    if (isHit) {
      passed++;
      results.push({ query: test.query, status: "PASS", layer: res.layer, resolved: actualRel });
    } else {
      results.push({ query: test.query, status: "FAIL", layer: res.layer, expected: test.expected_rel, actual: actualRel });
    }
  }

  const report = {
    ok: passed === seedQueries.length,
    score: `${passed}/${seedQueries.length}`,
    total: seedQueries.length,
    passed,
    failed: seedQueries.length - passed,
    results,
  };

  // Save negative-returns log if any failed
  if (!report.ok) {
    const logPath = path.join(ctx.registryRoot || ctx.rootPath, ".cogentia-negative-returns.log");
    const logEntry = `[${new Date().toISOString()}] BENCHMARK FAIL: ${JSON.stringify(report)}\n`;
    fs.appendFileSync(logPath, logEntry, "utf8");
  }

  return report;
}
