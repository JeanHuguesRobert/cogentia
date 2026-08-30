// File: scripts/lib/corpus-sleep-cycle/metrics.js
// Description: Multi-dimensional metrics evaluator for Corpus Sleep Cycle Monte Carlo audit.
//
// Distinguishes:
// - Raw Coverage: how much of the combinatorial document/pair space was visited
// - True Cognitive Gain: actionable semantic tensions, contradictions, and bridges surfaced
// - Marginal Efficiency: cognitive value delivered per marginal compute / time resource

export function calculateEntropy(counts = []) {
  const sum = counts.reduce((acc, c) => acc + c, 0);
  if (sum === 0 || counts.length <= 1) return 1.0;

  let entropy = 0;
  for (const c of counts) {
    if (c > 0) {
      const p = c / sum;
      entropy -= p * Math.log2(p);
    }
  }

  const maxEntropy = Math.log2(counts.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 1.0;
}

const KIND_WEIGHTS = {
  possible_contradiction: 3.0,
  semantic_drift: 2.0,
  overgeneralization: 1.5,
  duplication: 1.5,
  missing_link: 1.0,
  weak_hypothesis: 1.0,
};

export function evaluateAuditMetrics({
  totalDocuments = 0,
  totalPossiblePairs = 0,
  visitedPairs = new Set(),
  docSampleCounts = new Map(),
  signals = [],
  elapsedMs = 0,
  costUnits = 0,
} = {}) {
  const uniquePairsSampled = visitedPairs instanceof Set ? visitedPairs.size : Array.isArray(visitedPairs) ? visitedPairs.length : 0;
  const docCountsArray = Array.from(docSampleCounts.values());
  const visitedDocsCount = docCountsArray.filter((c) => c > 0).length;

  const pairCoverageRatio = totalPossiblePairs > 0
    ? Number((uniquePairsSampled / totalPossiblePairs).toFixed(4))
    : 0;

  const documentCoverageRatio = totalDocuments > 0
    ? Number((visitedDocsCount / totalDocuments).toFixed(4))
    : 0;

  const samplingEntropy = Number(calculateEntropy(docCountsArray).toFixed(4));

  // Signal categorization
  const byKind = {};
  const bySeverity = { info: 0, warning: 0, error: 0 };
  let highConfidenceCount = 0;
  let rawCognitiveWeight = 0;
  const signalYieldingPairs = new Set();

  for (const sig of signals) {
    const kind = sig.signal_kind || "unknown";
    byKind[kind] = (byKind[kind] || 0) + 1;

    const sev = sig.severity || "info";
    bySeverity[sev] = (bySeverity[sev] || 0) + 1;

    if ((sig.confidence ?? 0) >= 0.7) {
      highConfidenceCount++;
    }

    const pairKey = [sig.doc_a?.id, sig.doc_b?.id].sort().join("::");
    signalYieldingPairs.add(pairKey);

    const weight = KIND_WEIGHTS[kind] || 1.0;
    const confidence = sig.confidence ?? 0.5;
    rawCognitiveWeight += weight * confidence;
  }

  const signalYieldRate = uniquePairsSampled > 0
    ? Number((signals.length / uniquePairsSampled).toFixed(4))
    : 0;

  // Cognitive Gain factors in both signal weight and distinct problem areas uncovered
  const cognitiveGainScore = Number((rawCognitiveWeight * Math.sqrt(Math.max(1, signalYieldingPairs.size))).toFixed(2));

  // Marginal value per resource
  const elapsedSec = Math.max(0.001, elapsedMs / 1000);
  const signalsPerSecond = Number((signals.length / elapsedSec).toFixed(2));
  const cognitiveValuePerSecond = Number((cognitiveGainScore / elapsedSec).toFixed(2));
  const cognitiveValuePerCostUnit = costUnits > 0
    ? Number((cognitiveGainScore / costUnits).toFixed(2))
    : cognitiveGainScore;

  return {
    coverage: {
      total_documents: totalDocuments,
      total_possible_pairs: totalPossiblePairs,
      unique_pairs_sampled: uniquePairsSampled,
      pair_coverage_ratio: pairCoverageRatio,
      documents_visited: visitedDocsCount,
      document_coverage_ratio: documentCoverageRatio,
      sampling_entropy: samplingEntropy,
      exploration_dispersion: samplingEntropy >= 0.75 ? "well_distributed" : "focused",
    },
    cognitive_yield: {
      total_signals: signals.length,
      signal_yielding_pairs_count: signalYieldingPairs.size,
      signal_yield_rate: signalYieldRate,
      high_confidence_signals: highConfidenceCount,
      signals_by_kind: byKind,
      signals_by_severity: bySeverity,
      cognitive_gain_score: cognitiveGainScore,
      // Cognitive density: cognitive gain generated per sampled pair
      cognitive_density: uniquePairsSampled > 0 ? Number((cognitiveGainScore / uniquePairsSampled).toFixed(4)) : 0,
    },
    efficiency: {
      elapsed_ms: elapsedMs,
      elapsed_seconds: Number(elapsedSec.toFixed(2)),
      signals_per_second: signalsPerSecond,
      cognitive_value_per_second: cognitiveValuePerSecond,
      cognitive_value_per_cost_unit: cognitiveValuePerCostUnit,
    },
  };
}
