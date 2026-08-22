/**
 * intent-navigator.js — Intent-first Corpus Navigation & Authority Routing (#108, #103)
 *
 * Allows agents that ignore the physical topology of the Corpus to:
 * 1. Locate authoritative definitions, implementations, and operational owners by semantic intent.
 * 2. Retrieve grounded evidence with precise GitHub deep links.
 * 3. Assess status across doctrine, code, and tracking issues.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSourceUrl, formatSourceMarkdownLink } from "./source-deep-links.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const reposRoot = path.resolve(moduleDir, "..", "..");

// Known architectural responsibility mappings across repositories (#103)
const RESPONSIBILITY_DOMAINS = [
  {
    domain: "Possibilisme & Doctrine Territoriale",
    keywords: ["possibilisme", "possibilism", "mariani", "terrain", "autonomie", "ecole mariani"],
    defines: "barons-Mariani:research/concepts.md",
    canonical_doc: "barons-Mariani:research/applied_possibilism.md",
    implements: "inseme:packages/cop-core/",
    owner: "barons-Mariani",
  },
  {
    domain: "FractaVolta & Réseaux de Paquets Énergétiques",
    keywords: ["fractavolta", "paquets d'energie", "energy packets", "fractanet", "seconde vie"],
    defines: "FractaVolta:research/fractavolta_paper.md",
    canonical_doc: "FractaVolta:research/generalized_packet_networks.md",
    implements: "FractaVolta:packages/core/",
    owner: "FractaVolta",
  },
  {
    domain: "Cogentia & Digital Twin Architecture",
    keywords: ["cogentia", "cogentiscope", "relatoscope", "twin", "psychocognitive", "commons"],
    defines: "cogentia:research/cogentia-digital-twin.md",
    canonical_doc: "cogentia:research/cogentia_commons_living_corpus.md",
    implements: "cogentia:scripts/cogentia-mcp-http.js",
    owner: "cogentia",
  },
  {
    domain: "Inox Programming Language",
    keywords: ["inox", "multilevel dispatch", "l9.nox", "language spec", "compiler"],
    defines: "Inox:research/inox-spec.md",
    canonical_doc: "Inox:research/inox-spec.md",
    implements: "Inox:compiler/",
    owner: "Inox",
  },
  {
    domain: "COP Protocol & Packet Kernel",
    keywords: ["cop", "cop-kernel", "cop-core", "continuation", "packet protocol", "exposure"],
    defines: "inseme:research/cop_memory_profile.md",
    canonical_doc: "inseme:packages/cop-core/README.md",
    implements: "inseme:packages/cop-kernel/",
    owner: "inseme",
  },
  {
    domain: "MareNostrum & Pacte Anti-Capture",
    keywords: ["marenostrum", "anti-capture", "pacte", "exergy", "souverainete compute"],
    defines: "marenostrum:research/pacte_anti_capture_solaire_inferentielle.md",
    canonical_doc: "marenostrum:research/infrastructure_is_all_you_need.md",
    implements: "marenostrum:research/MODEL.md",
    owner: "marenostrum",
  },
];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Locate authoritative material by subject and intent without knowing repository topology.
 */
export async function locateCorpusSubject({ subject, intent = "read_definition", repo = null }) {
  const normSubject = normalize(subject);
  if (!normSubject) {
    return { ok: false, error: "empty_subject", targets: [], ambiguities: [] };
  }

  const targets = [];
  const ambiguities = [];

  // 1. Match against domain responsibility map (#103)
  for (const domain of RESPONSIBILITY_DOMAINS) {
    const isMatch = domain.keywords.some(kw => normSubject.includes(kw) || kw.includes(normSubject));
    if (isMatch) {
      if (intent === "find_implementation") {
        targets.push({
          repo: domain.owner,
          target_ref: domain.implements,
          relation: "implements",
          authority: "implementation_root",
          url: resolveSourceUrl(domain.implements),
          reasons: ["responsibility_routing", `domain:${domain.domain}`],
        });
      } else {
        targets.push({
          repo: domain.owner,
          target_ref: domain.canonical_doc,
          relation: "defines",
          authority: "canonical_candidate",
          url: resolveSourceUrl(domain.canonical_doc),
          reasons: ["responsibility_routing", `domain:${domain.domain}`],
        });
        if (domain.defines !== domain.canonical_doc) {
          targets.push({
            repo: domain.owner,
            target_ref: domain.defines,
            relation: "defines",
            authority: "definition_registry",
            url: resolveSourceUrl(domain.defines),
            reasons: ["concept_registry"],
          });
        }
      }
    }
  }

  // 2. Scan concept registries if available locally
  const conceptFileCandidates = [
    path.join(reposRoot, "cogentia", "research", "concepts.md"),
    path.join(reposRoot, "barons-Mariani", "research", "concepts.md"),
  ];

  for (const cPath of conceptFileCandidates) {
    if (fs.existsSync(cPath)) {
      try {
        const text = fs.readFileSync(cPath, "utf8");
        const repoName = cPath.includes("barons-Mariani") ? "barons-Mariani" : "cogentia";
        const lines = text.split("\n");
        let currentHeading = "";
        let currentLine = 1;
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i];
          if (l.startsWith("## ")) {
            currentHeading = l.replace(/^##\s+/, "").trim();
            currentLine = i + 1;
            const normHeading = normalize(currentHeading);
            if (normHeading.includes(normSubject) || normSubject.includes(normHeading)) {
              const targetRef = `${repoName}:research/concepts.md#L${currentLine}-L${Math.min(lines.length, currentLine + 25)}`;
              targets.push({
                repo: repoName,
                target_ref: targetRef,
                relation: "defines",
                authority: "concept_index_entry",
                concept_name: currentHeading,
                url: resolveSourceUrl(targetRef),
                reasons: ["concepts_index_heading_match"],
              });
            }
          }
        }
      } catch {}
    }
  }

  // Filter and deduplicate
  const seenRefs = new Set();
  const dedupedTargets = [];
  for (const t of targets) {
    if (repo && t.repo !== repo) continue;
    if (!seenRefs.has(t.target_ref)) {
      seenRefs.add(t.target_ref);
      dedupedTargets.push(t);
    }
  }

  return {
    ok: dedupedTargets.length > 0,
    subject,
    intent,
    targets: dedupedTargets,
    ambiguities,
    count: dedupedTargets.length,
  };
}

/**
 * Assess subject status across doctrine, code, and active tracking issues.
 */
export async function getCorpusSubjectStatus({ subject }) {
  const located = await locateCorpusSubject({ subject, intent: "read_definition" });
  return {
    ok: true,
    subject,
    doctrine_status: located.targets.length > 0 ? "defined" : "unindexed",
    authoritative_targets: located.targets.map(t => ({
      ref: t.target_ref,
      relation: t.relation,
      url: t.url,
    })),
    implementation_status: located.targets.some(t => t.relation === "implements") ? "active" : "referenced",
  };
}
