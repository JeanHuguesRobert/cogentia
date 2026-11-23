// File: scripts/lib/corpus-sleep-cycle/pair-sampler.js
// Description: Multi-factor adaptive document pair sampler for Corpus Sleep Cycle Monte Carlo audit.
//
// Criteria:
// - Coverage: prioritize under-sampled documents and pairs
// - Distance: balance semantic/tag proximity (duplications/direct contradictions) & distance (missing links/drifts)
// - Freshness: prioritize recently modified or added documents
// - Provenance: prioritize cross-repository / cross-branch boundaries
// - Tension: prioritize documents with tension signals (TODO, hypothesis, deprecation, unreviewed)
// - Determinism: supports seedable PRNG for fully reproducible runs

import fs from "node:fs";
import path from "node:path";
import { parseFrontmatter } from "../semantic-mutation-checker.js";
import {
  PUBLIC_VIEW,
  PRIVATE_VIEW,
  defaultMonorepoRepos,
  filterReposForView,
  isPrivateRepo
} from "../privacy-views.js";

/**
 * Fast seedable pseudo-random number generator (Mulberry32).
 * Guarantees reproducibility across platforms and node versions.
 */
export function createRng(seed = 123456789) {
  let s = typeof seed === "string" ? hashString(seed) : (Number(seed) >>> 0);
  function next() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  next.getState = () => s >>> 0;
  next.setState = value => { if (Number.isInteger(value)) s = value >>> 0; };
  return next;
}

export function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

const SKIP_DIRS = new Set([
  ".git", "node_modules", "dist", "build", ".cache", ".next", "coverage",
  ".turbo", ".venv", "venv", ".cogentia", "scratch", ".system_generated"
]);

function readHeaderSnippet(fullPath, maxBytes = 2048) {
  let fd;
  try {
    fd = fs.openSync(fullPath, "r");
    const buf = Buffer.alloc(maxBytes);
    const bytesRead = fs.readSync(fd, buf, 0, maxBytes, 0);
    return buf.toString("utf8", 0, bytesRead);
  } catch {
    return "";
  } finally {
    if (fd != null) {
      try { fs.closeSync(fd); } catch {}
    }
  }
}

/**
 * Scan markdown documents across the allowed repositories.
 */
export function discoverCorpusDocuments(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const view = options.view || PUBLIC_VIEW;
  const repos = filterReposForView(defaultMonorepoRepos(root), view);
  const docs = [];
  const outOfBudget = () => {
    if (options.deadlineMs !== undefined && Date.now() >= options.deadlineMs) { options.onPreempt?.(); return true; }
    return false;
  };

  for (const repo of repos) {
    if (outOfBudget()) break;
    const repoDir = repo.absPath || path.resolve(root, repo.path || ".");
    if (!fs.existsSync(repoDir) || !fs.statSync(repoDir).isDirectory()) continue;

    const visit = (dir, relDir = "") => {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
      catch { return; }

      for (const entry of entries) {
        if (outOfBudget()) break;
        if (entry.name.startsWith(".") && entry.name !== ".well-known") continue;
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) {
            visit(path.join(dir, entry.name), path.join(relDir, entry.name));
          }
        } else if (entry.isFile() && entry.name.endsWith(".md")) {
          const fullPath = path.join(dir, entry.name);
          const relPath = path.join(repo.name, relDir, entry.name).replace(/\\/g, "/");

          try {
            const stat = fs.statSync(fullPath);
            const header = readHeaderSnippet(fullPath, 2048);
            const { present, data } = parseFrontmatter(header);

            // Extract tags, related documents, concepts
            const tags = Array.isArray(data?.tags) ? data.tags.map(String) : [];
            const relatedDocs = Array.isArray(data?.related_documents) ? data.related_documents.map(String) : [];
            const status = data?.status || data?.lifecycle_state || "working";
            const isUnreviewed = data?.review?.status === "unreviewed" || data?.review === "unreviewed";
            const hasTension = isUnreviewed || /TODO|FIXME|hypothesis|unresolved|contradict|superseded/i.test(header);

            docs.push({
              id: relPath,
              repo: repo.name,
              repoPath: repo.path,
              relPath,
              fullPath,
              title: data?.title || entry.name.replace(/\.md$/, ""),
              status,
              tags,
              relatedDocs,
              mtimeMs: stat.mtimeMs,
              sizeBytes: stat.size,
              hasFrontmatter: present,
              isUnreviewed,
              hasTension,
              visibility: repo.visibility || "public",
              sampleSnippet: header
            });
          } catch {
            // Ignore unreadable files
          }
        }
      }
    };

    visit(repoDir);
  }

  return docs.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Calculate similarity / overlap between two documents based on tags, relatedDocs, and title words.
 */
export function calculateDocumentSimilarity(docA, docB) {
  if (docA.id === docB.id) return 1.0;

  // Frontmatter fields (tags, relatedDocs, title) are usually well-typed, but
  // atypical YAML can yield non-string entries; coerce defensively so one
  // anomalous document doesn't crash the whole sampling pass.
  const setA = new Set([
    ...(docA.tags || []).map(t => String(t ?? "").toLowerCase()),
    ...(docA.relatedDocs || []).map(r => path.basename(String(r ?? "")).toLowerCase()),
    ...String(docA.title ?? "").toLowerCase().split(/\W+/).filter(w => w.length > 3)
  ]);

  const setB = new Set([
    ...(docB.tags || []).map(t => String(t ?? "").toLowerCase()),
    ...(docB.relatedDocs || []).map(r => path.basename(String(r ?? "")).toLowerCase()),
    ...String(docB.title ?? "").toLowerCase().split(/\W+/).filter(w => w.length > 3)
  ]);

  if (setA.size === 0 && setB.size === 0) return 0.1;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? intersection / union : 0.0;
}

/**
 * Compute adaptive selection weight for pair (A, B).
 */
export function computePairWeight(docA, docB, state) {
  const pairKey = [docA.id, docB.id].sort().join("::");
  const pairSamples = state.pairSampleCounts?.get(pairKey) || 0;
  const docASamples = state.docSampleCounts?.get(docA.id) || 0;
  const docBSamples = state.docSampleCounts?.get(docB.id) || 0;

  // 1. Coverage Factor: strong penalty for pairs/docs already sampled many times
  const pairCoverageWeight = 1.0 / (1.0 + pairSamples * 2.0);
  const docCoverageWeight = 1.0 / (1.0 + Math.sqrt(docASamples * docBSamples));

  // 2. Semantic Distance/Proximity Balance
  const sim = calculateDocumentSimilarity(docA, docB);
  // High similarity attracts duplication/contradiction checks;
  // Low similarity (with non-zero base) allows broad Monte Carlo discovery
  const proximityWeight = 0.5 + 0.5 * sim;

  // 3. Freshness Factor: newer modifications get higher exploration weight
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const ageDaysA = Math.max(0, (now - docA.mtimeMs) / dayMs);
  const ageDaysB = Math.max(0, (now - docB.mtimeMs) / dayMs);
  const freshnessWeight = Math.max(0.2, 1.0 / (1.0 + Math.min(ageDaysA, ageDaysB) / 30.0));

  // 4. Provenance Factor: cross-repo pairs get a slight boost to uncover federated inconsistency
  const crossRepoBoost = docA.repo !== docB.repo ? 1.3 : 1.0;

  // 5. Tension Factor: unreviewed / tension docs get priority
  const tensionBoost = (docA.hasTension ? 1.25 : 1.0) * (docB.hasTension ? 1.25 : 1.0);

  return (
    pairCoverageWeight *
    docCoverageWeight *
    proximityWeight *
    freshnessWeight *
    crossRepoBoost *
    tensionBoost
  );
}

/**
 * Bounded thematic candidates. Ignore tags present in >80 documents: generic
 * tags would otherwise dominate and create quadratic cross-product noise.
 * This is a per-run projection, never a second durable index.
 */
export function buildThematicPairs(documents, { maxCandidates = 5000 } = {}) {
  const postings = new Map();
  for (const doc of documents) {
    for (const tag of new Set((doc.tags || []).map(t => String(t).trim().toLowerCase()))) {
      if (tag.length < 4) continue;
      if (!postings.has(tag)) postings.set(tag, []);
      postings.get(tag).push(doc);
    }
  }
  const candidates = new Map();
  for (const docs of postings.values()) {
    if (docs.length < 2 || docs.length > 80) continue;
    for (let i = 0; i < docs.length; i++) {
      for (let j = i + 1; j < docs.length; j++) {
        const a = docs[i], b = docs[j];
        const pairKey = [a.id, b.id].sort().join("::");
        const existing = candidates.get(pairKey);
        if (existing) existing.sharedTags++;
        else if (candidates.size < maxCandidates * 4) {
          candidates.set(pairKey, { docA: a, docB: b, pairKey, sharedTags: 1 });
        }
      }
    }
  }
  return [...candidates.values()]
    .filter(candidate => candidate.sharedTags >= 2)
    .sort((a, b) => b.sharedTags - a.sharedTags || a.pairKey.localeCompare(b.pairKey))
    .slice(0, maxCandidates);
}

/**
 * Adaptive Monte Carlo Document Pair Sampler.
 */
export class AdaptivePairSampler {
  constructor(documents = [], options = {}) {
    this.documents = documents;
    this.docMap = new Map(documents.map(d => [d.id, d]));
    this.rng = createRng(options.seed ?? 42);
    this.docSampleCounts = new Map();
    this.pairSampleCounts = new Map();
    this.visitedPairs = new Set();
    this.totalSamples = 0;
    this.historicalPairs = new Set(options.historicalPairs || []);
    this.focusedFraction = options.focusedFraction ?? 0;
    if (!Number.isFinite(this.focusedFraction) ||
        this.focusedFraction < 0 || this.focusedFraction > 1) {
      throw new RangeError("focusedFraction must be between 0 and 1");
    }
    this.thematicPairs = this.focusedFraction > 0 ? buildThematicPairs(documents) : [];
    this.selectionCounts = { random: 0, thematic: 0 };

    // Restore prior checkpoint if provided
    if (options.checkpoint) {
      this.restoreCheckpoint(options.checkpoint);
    }
  }

  get totalDocs() {
    return this.documents.length;
  }

  get totalPossiblePairs() {
    const n = this.documents.length;
    return n > 1 ? (n * (n - 1)) / 2 : 0;
  }

  /**
   * Sample the next candidate pair of documents according to adaptive weights.
   */
  sampleNextPair() {
    const n = this.documents.length;
    if (n < 2) return null;

    const thematic = this.focusedFraction > 0 && this.thematicPairs.length > 0 &&
      this.rng() < this.focusedFraction;
    const POOL_SIZE = Math.min(24, thematic ? this.thematicPairs.length : n * (n - 1) / 2);
    let bestPair = null;
    let bestScore = -1;

    for (let k = 0; k < POOL_SIZE; k++) {
      let docA, docB, pairKey, sharedTags = 0;
      if (thematic) {
        const candidate = this.thematicPairs[Math.floor(this.rng() * this.thematicPairs.length)];
        ({ docA, docB, pairKey, sharedTags } = candidate);
      } else {
        const idxA = Math.floor(this.rng() * n);
        let idxB = Math.floor(this.rng() * (n - 1));
        if (idxB >= idxA) idxB++;
        docA = this.documents[idxA];
        docB = this.documents[idxB];
        pairKey = [docA.id, docB.id].sort().join("::");
      }

      const weight = computePairWeight(docA, docB, {
        docSampleCounts: this.docSampleCounts,
        pairSampleCounts: this.pairSampleCounts
      });

      // Add a stochastic jitter term from RNG
      const score = (this.visitedPairs.has(pairKey) || this.historicalPairs.has(pairKey) ? 0 : weight) *
        (thematic ? 1 + Math.min(sharedTags, 5) / 5 : 1) * (0.7 + 0.6 * this.rng());

      if (score > bestScore) {
        bestScore = score;
        bestPair = { docA, docB, pairKey, score, weight };
      }
    }

    // All candidate slots may refer to previously visited thematic pairs;
    // do not repeat them just to fill the quota. Fall back to exploration.
    if (thematic && bestScore <= 0) return this.sampleRandomPair();
    if (!bestPair || bestScore <= 0) return null;
    return this.acceptPair(bestPair, thematic ? "thematic" : "random");
  }

  sampleRandomPair() {
    const originalFraction = this.focusedFraction;
    this.focusedFraction = 0;
    try { return this.sampleNextPair(); }
    finally { this.focusedFraction = originalFraction; }
  }

  acceptPair(bestPair, channel) {
    this.recordSample(bestPair.docA.id, bestPair.docB.id, bestPair.pairKey);
    this.selectionCounts[channel]++;
    return {
      docA: bestPair.docA,
      docB: bestPair.docB,
      pairKey: bestPair.pairKey,
      selectionWeight: bestPair.weight,
      selectionChannel: channel
    };
  }

  recordSample(docAId, docBId, pairKey) {
    this.totalSamples++;
    this.visitedPairs.add(pairKey);
    this.docSampleCounts.set(docAId, (this.docSampleCounts.get(docAId) || 0) + 1);
    this.docSampleCounts.set(docBId, (this.docSampleCounts.get(docBId) || 0) + 1);
    this.pairSampleCounts.set(pairKey, (this.pairSampleCounts.get(pairKey) || 0) + 1);
  }

  /**
   * Export sampler state for continuation checkpointing.
   */
  exportCheckpoint() {
    return {
      totalSamples: this.totalSamples,
      rngState: this.rng.getState(),
      focusedFraction: this.focusedFraction,
      selectionCounts: { ...this.selectionCounts },
      visitedPairsCount: this.visitedPairs.size,
      visitedPairs: Array.from(this.visitedPairs),
      docSampleCounts: Object.fromEntries(this.docSampleCounts),
      pairSampleCounts: Object.fromEntries(this.pairSampleCounts)
    };
  }

  /**
   * Restore sampler state from continuation checkpoint.
   */
  restoreCheckpoint(checkpoint = {}) {
    if (checkpoint.focusedFraction != null && checkpoint.focusedFraction !== this.focusedFraction) {
      throw new Error("Cannot resume with a different focusedFraction");
    }
    if (checkpoint.selectionCounts) {
      this.selectionCounts = { ...this.selectionCounts, ...checkpoint.selectionCounts };
    }
    if (checkpoint.rngState != null) this.rng.setState(checkpoint.rngState);
    if (checkpoint.totalSamples != null) this.totalSamples = Number(checkpoint.totalSamples) || 0;
    if (Array.isArray(checkpoint.visitedPairs)) {
      this.visitedPairs = new Set(checkpoint.visitedPairs);
    }
    if (checkpoint.docSampleCounts && typeof checkpoint.docSampleCounts === "object") {
      this.docSampleCounts = new Map(Object.entries(checkpoint.docSampleCounts).map(([k, v]) => [k, Number(v)]));
    }
    if (checkpoint.pairSampleCounts && typeof checkpoint.pairSampleCounts === "object") {
      this.pairSampleCounts = new Map(Object.entries(checkpoint.pairSampleCounts).map(([k, v]) => [k, Number(v)]));
    }
  }
}
