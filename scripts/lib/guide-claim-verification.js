/**
 * Lightweight operational-claim verification (cogentia#209).
 *
 * Motivated by a concrete finding in the legacy-vs-V2 Guide comparison
 * (2026-09-25, operium#45 / research/guide_confident_elaboration_beyond_source.md):
 * both lanes attached a detailed six-step operational protocol (audit, six
 * months of measurement, a monthly dashboard, a decision gate) to a
 * one-page campaign memo that contains no such protocol -- a present
 * source_id was mistaken for proof of full grounding, when citation
 * presence and citation sufficiency are different properties.
 *
 * Deliberately NOT a semantic entailment check (that's the heavier,
 * deferred `adversarial_verification` reasoning-loop hop). This is a
 * cheap, fail-soft heuristic: scan the drafted answer for concrete,
 * falsifiable operational specifics (durations, named artifacts, step/
 * phase numbering) and flag any that don't appear anywhere in the cited
 * source text. False negatives (missed fabrication) are expected and
 * acceptable; false positives only add a warning, never block or rewrite
 * the answer.
 */

const OPERATIONAL_MARKER_PATTERNS = [
  // Durations: "six months", "3 quarters", "12 mois", ...
  /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s+(day|days|week|weeks|month|months|quarter|quarters|year|years|jour|jours|semaine|semaines|mois|trimestre|trimestres|an|ans|année|années)\b/gi,
  // Named process artifacts implying an operational apparatus exists.
  /\b(dashboard|decision gate|action plan|road ?map|kpi|milestone|tableau de bord|comité de pilotage|feuille de route|plan d'action)\b/gi,
  // Explicit step/phase numbering.
  /\b(step|phase|étape|phase)\s*\d+\b/gi,
];

function normalize(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * @param {string} answerText - the drafted answer, before it ships.
 * @param {Array<{source_id?: string, text?: string}>} contextChunks - cited excerpts (retrieval.context).
 * @param {Array<{title?: string, snippet?: string, text?: string}>} webSources - web-search results, if any.
 * @returns {{ unsupported_claims: string[], warnings: string[] }}
 */
export function verifyOperationalClaims(answerText, contextChunks = [], webSources = []) {
  const answer = String(answerText || "");
  if (!answer.trim()) return { unsupported_claims: [], warnings: [] };

  const sourceCorpus = normalize(
    [
      ...(Array.isArray(contextChunks) ? contextChunks.map((c) => c?.text) : []),
      ...(Array.isArray(webSources) ? webSources.map((s) => s?.snippet || s?.text) : []),
    ]
      .filter(Boolean)
      .join(" • ")
  );

  // No source text to check against at all -- nothing to verify (this is
  // guideRetrievalRun's empty-retrieval case, already flagged separately).
  if (!sourceCorpus) return { unsupported_claims: [], warnings: [] };

  const found = new Set();
  for (const pattern of OPERATIONAL_MARKER_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(answer)) !== null) {
      const claim = match[0].trim();
      if (!claim) continue;
      const normalizedClaim = normalize(claim);
      if (!sourceCorpus.includes(normalizedClaim)) {
        found.add(claim);
      }
    }
  }

  const unsupported_claims = Array.from(found).slice(0, 12);
  return {
    unsupported_claims,
    warnings: unsupported_claims.length ? ["unverified_operational_detail"] : [],
  };
}
