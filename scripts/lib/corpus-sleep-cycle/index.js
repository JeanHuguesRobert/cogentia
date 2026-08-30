// File: scripts/lib/corpus-sleep-cycle/index.js
// Description: Main entry point for Corpus Sleep Cycle Monte Carlo consistency audit system.

export {
  AdaptivePairSampler,
  discoverCorpusDocuments,
  calculateDocumentSimilarity,
  computePairWeight,
  createRng,
  hashString
} from "./pair-sampler.js";

export {
  SIGNAL_KINDS,
  evaluateDocumentPair,
  checkContradictions,
  checkDuplication,
  checkSemanticDrift,
  checkMissingLink,
  checkOvergeneralization,
  checkWeakHypothesis
} from "./audit-evaluator.js";

export {
  SleepCycleReviewQueue,
  REVIEW_DECISIONS
} from "./review-queue.js";

export {
  evaluateAuditMetrics,
  calculateEntropy
} from "./metrics.js";

export {
  runMonteCarloAudit
} from "./sleep-cycle-engine.js";
