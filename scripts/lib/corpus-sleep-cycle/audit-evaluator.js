// File: scripts/lib/corpus-sleep-cycle/audit-evaluator.js
// Description: Multi-angle Monte Carlo document pair consistency evaluator.
//
// Candidate signal types:
// 1. possible_contradiction: contradictory claims, status mismatches, or conflicting invariants
// 2. duplication: repeated formulations, copy-pasted blocks, or identical definitions
// 3. semantic_drift: differing definitions, role drift, or terminology shifts across versions
// 4. weak_hypothesis: unbacked assertions, speculative claims missing evidence
// 5. missing_link: high conceptual co-occurrence with no cross-referencing link
// 6. overgeneralization: universal assertion ("always", "never", "all") contradicted by specific exceptions

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../semantic-mutation-checker.js";

export const SIGNAL_KINDS = Object.freeze({
  POSSIBLE_CONTRADICTION: "possible_contradiction",
  DUPLICATION: "duplication",
  SEMANTIC_DRIFT: "semantic_drift",
  WEAK_HYPOTHESIS: "weak_hypothesis",
  MISSING_LINK: "missing_link",
  OVERGENERALIZATION: "overgeneralization",
});

function sha1(str) {
  return crypto.createHash("sha1").update(String(str)).digest("hex").slice(0, 12);
}

function extractParagraphs(content) {
  const { body } = parseFrontmatter(content);
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40 && !p.startsWith("#") && !p.startsWith("```"));
}

function extractHeadings(content) {
  const headings = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        title: match[2].trim(),
        line: i + 1,
      });
    }
  }
  return headings;
}

function tokenize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

/**
 * Check for duplicate or near-identical paragraphs / formulations.
 */
export function checkDuplication(docA, docB, contentA, contentB) {
  const parasA = extractParagraphs(contentA);
  const parasB = extractParagraphs(contentB);
  const signals = [];

  for (const pa of parasA) {
    if (pa.length < 80) continue;
    const tokensA = new Set(tokenize(pa));
    if (tokensA.size < 8) continue;

    for (const pb of parasB) {
      if (pb.length < 80) continue;
      const tokensB = new Set(tokenize(pb));
      if (tokensB.size < 8) continue;

      let overlap = 0;
      for (const t of tokensA) {
        if (tokensB.has(t)) overlap++;
      }
      const similarity = overlap / Math.max(tokensA.size, tokensB.size);

      if (similarity >= 0.85) {
        signals.push({
          kind: SIGNAL_KINDS.DUPLICATION,
          severity: "info",
          finding: `Near-identical formulation or paragraph repeated across documents (similarity: ${(similarity * 100).toFixed(0)}%)`,
          uncertainty: Math.max(0.05, 1.0 - similarity),
          method: "ngram_paragraph_similarity",
          docA_excerpt: pa.slice(0, 200),
          docB_excerpt: pb.slice(0, 200),
        });
      }
    }
  }

  return signals;
}

/**
 * Check for missing cross-reference links between tightly-coupled documents.
 */
export function checkMissingLink(docA, docB) {
  const signals = [];
  const relatedA = (docA.relatedDocs || []).map((r) => path.basename(r).toLowerCase());
  const relatedB = (docB.relatedDocs || []).map((r) => path.basename(r).toLowerCase());

  const baseA = path.basename(docA.relPath).toLowerCase();
  const baseB = path.basename(docB.relPath).toLowerCase();

  const linksAtoB = relatedA.includes(baseB);
  const linksBtoA = relatedB.includes(baseA);

  const sharedTags = (docA.tags || []).filter((t) =>
    (docB.tags || []).map((x) => x.toLowerCase()).includes(t.toLowerCase())
  );

  // If they share 3+ specific tags or concepts but have no link in either direction
  if (sharedTags.length >= 3 && !linksAtoB && !linksBtoA && docA.id !== docB.id) {
    signals.push({
      kind: SIGNAL_KINDS.MISSING_LINK,
      severity: "info",
      finding: `Strong conceptual overlap (${sharedTags.join(", ")}) without cross-reference in related_documents`,
      uncertainty: 0.25,
      method: "tag_concept_cooccurrence_graph",
      docA_excerpt: `Tags: ${docA.tags.join(", ")} | Related: ${(docA.relatedDocs || []).join(", ") || "(none)"}`,
      docB_excerpt: `Tags: ${docB.tags.join(", ")} | Related: ${(docB.relatedDocs || []).join(", ") || "(none)"}`,
    });
  }

  return signals;
}

/**
 * Check for possible contradictions in status, lifecycle state, or opposing architectural claims.
 */
export function checkContradictions(docA, docB, contentA, contentB) {
  const signals = [];

  // Check 1: Lifecycle / Status claims inconsistency
  const statusA = docA.status?.toLowerCase() || "";
  const statusB = docB.status?.toLowerCase() || "";

  // Example: If Doc A claims Doc B is deprecated/superseded, but Doc B claims it is canonical/working
  const baseB = path.basename(docB.relPath).replace(/\.md$/, "");
  const baseA = path.basename(docA.relPath).replace(/\.md$/, "");

  const aClaimsBSuperseded = new RegExp(`supersede[sd]?\\s+(by|in|with)?\\s*.*${baseB}`, "i").test(contentA);
  const bClaimsASuperseded = new RegExp(`supersede[sd]?\\s+(by|in|with)?\\s*.*${baseA}`, "i").test(contentB);

  if (aClaimsBSuperseded && (statusB.includes("canonical") || statusB.includes("source"))) {
    signals.push({
      kind: SIGNAL_KINDS.POSSIBLE_CONTRADICTION,
      severity: "warning",
      finding: `${docA.relPath} asserts ${baseB} is superseded, but ${docB.relPath} has status '${docB.status}'`,
      uncertainty: 0.15,
      method: "supersession_lifecycle_conflict",
      docA_excerpt: `References ${baseB} as superseded`,
      docB_excerpt: `Status declared: ${docB.status}`,
    });
  }

  if (bClaimsASuperseded && (statusA.includes("canonical") || statusA.includes("source"))) {
    signals.push({
      kind: SIGNAL_KINDS.POSSIBLE_CONTRADICTION,
      severity: "warning",
      finding: `${docB.relPath} asserts ${baseA} is superseded, but ${docA.relPath} has status '${docA.status}'`,
      uncertainty: 0.15,
      method: "supersession_lifecycle_conflict",
      docA_excerpt: `Status declared: ${docA.status}`,
      docB_excerpt: `References ${baseA} as superseded`,
    });
  }

  // Check 2: Invariant opposing polarity (e.g. "must never X" vs "must X" / "X is required" vs "X is optional")
  const hardPolarityRules = [
    {
      topic: "SQLite state",
      patternA: /sqlite.*(standalone|autonomous|retired|superseded|prohibited)/i,
      patternB: /sqlite.*(primary|required|canonical\s+storage)/i,
      explanation: "Conflicting doctrine on standalone SQLite database requirements",
    },
    {
      topic: "Automatic Mutation",
      patternA: /no\s+automatic\s+mutation|mutation\s+is\s+blocked|read-only/i,
      patternB: /automatically\s+(mutate|update|rewrite|modify)\s+corpus/i,
      explanation: "Conflicting statements on automated corpus modification authorization",
    },
  ];

  for (const rule of hardPolarityRules) {
    if (
      (rule.patternA.test(contentA) && rule.patternB.test(contentB)) ||
      (rule.patternB.test(contentA) && rule.patternA.test(contentB))
    ) {
      signals.push({
        kind: SIGNAL_KINDS.POSSIBLE_CONTRADICTION,
        severity: "warning",
        finding: `Polarity tension on topic '${rule.topic}': ${rule.explanation}`,
        uncertainty: 0.3,
        method: "polarity_invariant_heuristic",
        docA_excerpt: contentA.slice(0, 180),
        docB_excerpt: contentB.slice(0, 180),
      });
    }
  }

  return signals;
}

/**
 * Check for semantic drift / concept definition drift across documents.
 */
export function checkSemanticDrift(docA, docB, contentA, contentB) {
  const signals = [];
  const tagsA = new Set((docA.tags || []).map((t) => t.toLowerCase()));
  const tagsB = new Set((docB.tags || []).map((t) => t.toLowerCase()));

  for (const tag of tagsA) {
    if (!tagsB.has(tag)) continue;
    // Look for definitions like "tag is ..." or "tag names ..."
    const defRegex = new RegExp(`(?:${tag}|\\*\\*${tag}\\*\\*)\\s+(?:is|names|defines|means|refers to)\\s+([^.\\n]{20,120})`, "i");
    const matchA = contentA.match(defRegex);
    const matchB = contentB.match(defRegex);

    if (matchA && matchB) {
      const tokensA = new Set(tokenize(matchA[1]));
      const tokensB = new Set(tokenize(matchB[1]));
      let overlap = 0;
      for (const t of tokensA) {
        if (tokensB.has(t)) overlap++;
      }
      const similarity = overlap / Math.max(tokensA.size, tokensB.size);

      // Low similarity in definitions of the same concept indicates potential semantic drift
      if (similarity < 0.25 && tokensA.size >= 4 && tokensB.size >= 4) {
        signals.push({
          kind: SIGNAL_KINDS.SEMANTIC_DRIFT,
          severity: "warning",
          finding: `Concept '${tag}' defined with diverging semantics between documents`,
          uncertainty: 0.35,
          method: "concept_definition_drift",
          docA_excerpt: matchA[0],
          docB_excerpt: matchB[0],
        });
      }
    }
  }

  return signals;
}

/**
 * Check for overgeneralizations (universal quantifiers contradicted by specific qualifiers).
 */
export function checkOvergeneralization(docA, docB, contentA, contentB) {
  const signals = [];
  const universalRegex = /\b(always|never|all|every|must\s+never|guaranteed\s+to)\b\s+([^.\n]{20,80})/gi;

  let match;
  while ((match = universalRegex.exec(contentA)) !== null) {
    const claim = match[0];
    const subjectTokens = tokenize(match[2]);
    if (subjectTokens.length < 3) continue;

    // Check if docB expresses a nuance, exception, or conditional violation
    const exceptionRegex = new RegExp(`(?:however|except|not\\s+always|can\\s+fail|under\\s+certain\\s+conditions)\\s+.*${subjectTokens[0]}`, "i");
    if (exceptionRegex.test(contentB)) {
      signals.push({
        kind: SIGNAL_KINDS.OVERGENERALIZATION,
        severity: "info",
        finding: `Universal claim in ${docA.relPath} ('${claim.slice(0, 60)}...') has nuanced counter-conditions in ${docB.relPath}`,
        uncertainty: 0.4,
        method: "universal_quantifier_exception_pair",
        docA_excerpt: claim,
        docB_excerpt: contentB.match(exceptionRegex)?.[0]?.slice(0, 150) || "",
      });
      break; // Limit to one signal per pair to prevent spam
    }
  }

  return signals;
}

/**
 * Check for weak hypotheses or unbacked claims.
 */
export function checkWeakHypothesis(docA, docB, contentA, contentB) {
  const signals = [];
  const weakRegex = /\b(?:we\s+assume|hypothetically|presumably|without\s+proof|intuitively)\b\s+([^.\n]{20,100})/gi;

  let match;
  if (docA.status?.includes("canonical") || docA.status?.includes("source")) {
    while ((match = weakRegex.exec(contentA)) !== null) {
      signals.push({
        kind: SIGNAL_KINDS.WEAK_HYPOTHESIS,
        severity: "info",
        finding: `Document with canonical/source status contains explicit unverified hypothesis phrase: '${match[0].slice(0, 60)}'`,
        uncertainty: 0.45,
        method: "unbacked_hypothesis_in_canonical",
        docA_excerpt: match[0],
        docB_excerpt: `Compared with ${docB.relPath}`,
      });
      break;
    }
  }

  return signals;
}

/**
 * Evaluate document pair across all 6 consistency angles.
 */
export function evaluateDocumentPair(docA, docB, options = {}) {
  const contentA = fs.existsSync(docA.fullPath) ? fs.readFileSync(docA.fullPath, "utf8") : docA.sampleSnippet || "";
  const contentB = fs.existsSync(docB.fullPath) ? fs.readFileSync(docB.fullPath, "utf8") : docB.sampleSnippet || "";

  const runId = options.runId || `run_${Date.now()}`;
  const rawSignals = [
    ...checkContradictions(docA, docB, contentA, contentB),
    ...checkDuplication(docA, docB, contentA, contentB),
    ...checkSemanticDrift(docA, docB, contentA, contentB),
    ...checkMissingLink(docA, docB),
    ...checkOvergeneralization(docA, docB, contentA, contentB),
    ...checkWeakHypothesis(docA, docB, contentA, contentB),
  ];

  // Standardize full signal records with complete citations and provenance
  return rawSignals.map((sig) => {
    const sigId = `sig_${sha1(`${docA.id}:${docB.id}:${sig.kind}:${sig.finding}`)}`;
    return {
      id: sigId,
      signal_kind: sig.kind,
      severity: sig.severity || "info",
      finding: sig.finding,
      uncertainty: sig.uncertainty ?? 0.5,
      confidence: Number((1.0 - (sig.uncertainty ?? 0.5)).toFixed(2)),
      method: sig.method,
      doc_a: {
        id: docA.id,
        repo: docA.repo,
        path: docA.relPath,
        title: docA.title,
        status: docA.status,
        excerpt: sig.docA_excerpt || "",
      },
      doc_b: {
        id: docB.id,
        repo: docB.repo,
        path: docB.relPath,
        title: docB.title,
        status: docB.status,
        excerpt: sig.docB_excerpt || "",
      },
      review_status: "pending_review",
      provenance: {
        timestamp: new Date().toISOString(),
        run_id: runId,
        node: options.node || "local",
        capacity_ref: options.capacityRef || "residual",
        audit_version: "cogentia.sleep_cycle.audit.v1",
      },
    };
  });
}
