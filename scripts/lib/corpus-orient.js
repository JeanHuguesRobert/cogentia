/**
 * corpus.orient — P0 conceptual orientation (Cogentia #122).
 *
 * Structure first, similarity second. Reuses navigation.js (seed aliases,
 * resolveConceptAlias, guideResolve) plus the existing concept graph
 * (parents / children / related + reference documents).
 *
 * Deliberately not introduced here: a gravity score, persistent Concept
 * Attractors, a new relation ontology, or an LLM sufficiency judge.
 */
import { resolveConceptAlias, guideResolve, SEED_CONCEPT_ALIASES } from "./navigation.js";

export const ORIENT_SCHEMA = "cogentia.orientation.v1";

/** Experiment parameters, not doctrine (conceptual_gravity.md §11 / §36 / §43). */
export const DEFAULT_ORIENT_POLICY = Object.freeze({
  max_seeds: 5,
  max_hops: 2,
  max_nodes: 24,
  residual_limit: 6,
});

export const EVIDENCE_CLASS = Object.freeze({
  explicit: "explicit",
  derived_structurally: "derived_structurally",
  learned_routing_signal: "learned_routing_signal",
  semantic_candidate: "semantic_candidate",
  unresolved: "unresolved",
});

export const TRACE_INFLUENCE = Object.freeze({
  attention_only: "attention_only",
  corroborated: "corroborated",
});

const STOPWORDS = new Set([
  "a", "an", "the", "of", "for", "to", "in", "on", "and", "or", "as",
  "what", "how", "does", "do", "did", "mean", "this", "that", "these",
  "should", "when", "can", "could", "is", "are", "be", "been", "being",
  "with", "from", "by", "between", "relation", "behalf", "about",
  "into", "its", "it", "if", "not", "no", "yes", "than", "then",
]);

const CHECKPOINT_RE = /(sprints\/weekly_digest|\/CPKT-|checkpoint|handoff)/i;
const IMPLEMENTATION_RE = /(^|\/)(scripts|packages|src|lib)\//;
const EXTERNAL_RE =
  /leave the corpus|external research|state of the art|current law|current price|current standard|newer than/i;

function norm(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function tokenize(text) {
  return norm(text)
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function stem(token) {
  return token.length >= 7 ? token.slice(0, 6) : token;
}

function conceptKey(concept) {
  return `${concept.repo || ""}::${norm(concept.name)}`;
}

function haystackForConcept(concept) {
  return norm(
    [
      concept.name,
      concept.slug,
      concept.short_definition,
      ...(concept.aliases || []),
      ...(concept.related || []),
      ...(concept.parents || []),
      ...(concept.children || []),
    ].join(" ")
  );
}

function scoreHaystack(haystack, tokens) {
  if (!haystack || !tokens.length) return 0;
  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += 3;
    else if (haystack.includes(stem(token))) score += 1;
  }
  return score;
}

function parseDocRef(raw, fallbackRepo) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const github = text.match(/github\.com\/[^/]+\/([^/]+)\/(?:blob|tree)\/[^/]+\/(.+?)(?:#.*)?$/i);
  if (github) {
    return { repo: github[1], rel: github[2].replace(/\\/g, "/") };
  }
  const scoped = text.match(/^([A-Za-z0-9._-]+)[:/](.+\.md)$/);
  if (scoped && !text.startsWith("http")) {
    return { repo: scoped[1], rel: scoped[2].replace(/\\/g, "/") };
  }
  const cleaned = text.replace(/\\/g, "/").replace(/^\/+/, "");
  if (cleaned.endsWith(".md") || cleaned.includes("/")) {
    return { repo: fallbackRepo || null, rel: cleaned.replace(/^\.\//, "") };
  }
  return { repo: fallbackRepo || null, rel: cleaned, basename: true };
}

function docId(doc) {
  if (!doc) return "";
  return `${doc.repo || ""}/${String(doc.rel || doc.path || "").replace(/\\/g, "/")}`;
}

function uniqueBy(list, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * Resolve a bounded seed set from aliases, the concept registry, and
 * inventory titles. Similarity is a last resort (caller residual hits).
 */
export function selectSeedConcepts(query, concepts = [], documents = [], policy = DEFAULT_ORIENT_POLICY) {
  const q = String(query || "").trim();
  const tokens = tokenize(q);
  const maxSeeds = Number(policy.max_seeds) > 0 ? Number(policy.max_seeds) : DEFAULT_ORIENT_POLICY.max_seeds;
  const scored = [];

  const aliasHit = resolveConceptAlias(q, documents);
  if (aliasHit.hit) {
    const match = concepts.find(
      (c) =>
        norm(c.name) === norm(aliasHit.name) ||
        (c.repo === aliasHit.canonical_repo && (c.documents || []).some((d) => String(d).includes(aliasHit.canonical_rel)))
    );
    scored.push({
      concept: match || {
        name: aliasHit.name,
        repo: aliasHit.canonical_repo,
        documents: [aliasHit.canonical_rel],
        parents: [],
        children: [],
        related: [],
        short_definition: "",
      },
      score: 100,
      provenance: EVIDENCE_CLASS.explicit,
      reason: `seed_alias:${aliasHit.resolution_kind || "hit"}`,
    });
  }

  for (const seed of SEED_CONCEPT_ALIASES) {
    const aliases = [seed.name, ...(seed.aliases || [])].map(norm);
    if (aliases.some((a) => a && (norm(q).includes(a) || a.includes(norm(q))))) {
      const match = concepts.find((c) => norm(c.name) === norm(seed.name));
      scored.push({
        concept: match || {
          name: seed.name,
          repo: seed.canonical_repo,
          documents: [seed.canonical_rel],
          parents: [],
          children: [],
          related: [],
          short_definition: "",
        },
        score: 90,
        provenance: EVIDENCE_CLASS.explicit,
        reason: `seed_alias:${seed.name}`,
      });
    }
  }

  for (const concept of concepts) {
    const name = norm(concept.name);
    const nameTokens = tokenize(concept.name);
    let score = 0;
    if (name && name.length > 3 && (norm(q).includes(name) || name.includes(norm(q)))) {
      score += 20;
    } else if (nameTokens.length && nameTokens.every((w) => w.length < 4 || tokens.includes(w))) {
      score += 12;
    }
    const defScore = scoreHaystack(haystackForConcept(concept), tokens);
    score += defScore;
    if (score >= 3) {
      scored.push({
        concept,
        score,
        provenance: name && norm(q).includes(name) ? EVIDENCE_CLASS.explicit : EVIDENCE_CLASS.derived_structurally,
        reason: `concept_score:${score}`,
      });
    }
  }

  const resolved = [];
  const seen = new Set();
  scored
    .sort((a, b) => b.score - a.score)
    .forEach((row) => {
      const key = norm(row.concept.name);
      if (!key || seen.has(key) || resolved.length >= maxSeeds) return;
      seen.add(key);
      resolved.push(row);
    });

  return resolved.slice(0, maxSeeds);
}

function neighborNames(concept) {
  return uniqueBy(
    [...(concept.parents || []), ...(concept.children || []), ...(concept.related || [])].map((n) => String(n || "").trim()).filter(Boolean),
    (n) => norm(n)
  );
}

function indexConcepts(concepts) {
  const byName = new Map();
  for (const concept of concepts) {
    const key = norm(concept.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(concept);
  }
  return byName;
}

/**
 * Bounded BFS over existing parent/child/related links only.
 */
export function traverseConceptGraph(seeds, concepts, policy = DEFAULT_ORIENT_POLICY) {
  const maxHops = Number(policy.max_hops) >= 0 ? Number(policy.max_hops) : DEFAULT_ORIENT_POLICY.max_hops;
  const maxNodes = Number(policy.max_nodes) > 0 ? Number(policy.max_nodes) : DEFAULT_ORIENT_POLICY.max_nodes;
  const byName = indexConcepts(concepts);
  const route = [];
  const nodes = [];
  const missing = [];
  const queue = [];
  const seen = new Set();

  for (const seed of seeds) {
    const concept = seed.concept || seed;
    const key = conceptKey(concept);
    if (seen.has(key)) continue;
    seen.add(key);
    queue.push({ concept, hop: 0, via: null, edge: "seed", provenance: seed.provenance || EVIDENCE_CLASS.explicit });
  }

  let budgetHit = false;
  while (queue.length) {
    const current = queue.shift();
    if (nodes.length >= maxNodes) {
      budgetHit = queue.length > 0;
      break;
    }
    nodes.push(current.concept);
    route.push({
      concept: current.concept.name,
      repo: current.concept.repo,
      hop: current.hop,
      via: current.via,
      edge: current.edge,
      provenance: current.provenance,
    });
    if (current.hop >= maxHops) continue;
    for (const name of neighborNames(current.concept)) {
      const matches = byName.get(norm(name)) || [];
      if (!matches.length) {
        missing.push({ from: current.concept.name, ref: name, repo: current.concept.repo });
        continue;
      }
      const next = matches.find((m) => m.repo === current.concept.repo) || matches[0];
      const key = conceptKey(next);
      if (seen.has(key)) continue;
      if (nodes.length + queue.length + 1 > maxNodes) {
        budgetHit = true;
        continue;
      }
      seen.add(key);
      queue.push({
        concept: next,
        hop: current.hop + 1,
        via: current.concept.name,
        edge: "related",
        provenance: EVIDENCE_CLASS.derived_structurally,
      });
    }
  }

  return { route, nodes, missing_links: uniqueBy(missing, (m) => `${m.from}::${m.ref}`), budget_exhausted: budgetHit };
}

function lookupInventory(documents, repo, rel) {
  const wantRel = String(rel || "").replace(/\\/g, "/").replace(/^\.\//, "");
  const wantBase = wantRel.split("/").pop();
  return documents.find((d) => {
    const got = String(d.rel || d.path || "").replace(/\\/g, "/");
    if (repo && d.repo !== repo && !got.endsWith(wantRel)) return false;
    return got === wantRel || got.endsWith(`/${wantRel}`) || got.endsWith(`/${wantBase}`) || got === wantBase;
  });
}

function classifyPath(rel, role) {
  const path = String(rel || "");
  if (CHECKPOINT_RE.test(path)) return "checkpoint";
  if (IMPLEMENTATION_RE.test(path) || role === "operational") return "implementation";
  if (role === "source" || path.includes("research/") || path.includes("instructions/")) return "source";
  return "other";
}

function collectEvidence(route, nodes, documents, residualHits, policy) {
  const readFirst = [];
  const thenRead = [];
  const implementation = [];
  const checkpoints = [];
  const seen = new Set();
  const hopByKey = new Map(route.map((s) => [`${s.repo || ""}::${norm(s.concept)}`, s.hop]));

  const push = (bucket, entry) => {
    const id = docId(entry);
    if (!id || seen.has(id)) return;
    seen.add(id);
    bucket.push(entry);
  };

  for (const concept of nodes) {
    const hop = hopByKey.get(conceptKey(concept));
    const refs = concept.documents || [];
    for (const raw of refs) {
      const parsed = parseDocRef(raw, concept.repo);
      if (!parsed) continue;
      const found = lookupInventory(documents, parsed.repo, parsed.rel) || {
        repo: parsed.repo,
        rel: parsed.rel,
        title: parsed.rel,
      };
      const kind = classifyPath(found.rel, found.document_role);
      const entry = {
        repo: found.repo,
        path: found.rel,
        title: found.title || found.rel,
        via_concept: concept.name,
        provenance: concept.synthetic ? EVIDENCE_CLASS.semantic_candidate : EVIDENCE_CLASS.explicit,
      };
      if (kind === "implementation") push(implementation, entry);
      else if (kind === "checkpoint") push(checkpoints, entry);
      else if (hop === 0) push(readFirst, entry);
      else push(thenRead, entry);
    }
  }

  const residualLimit = Number(policy.residual_limit) > 0 ? Number(policy.residual_limit) : DEFAULT_ORIENT_POLICY.residual_limit;
  for (const hit of (residualHits || []).slice(0, residualLimit)) {
    const rel = hit.rel || hit.path;
    const entry = {
      repo: hit.repo,
      path: rel,
      title: hit.title || rel,
      via_concept: null,
      provenance: hit.provenance || EVIDENCE_CLASS.semantic_candidate,
    };
    const kind = classifyPath(rel, hit.document_role);
    if (kind === "implementation") push(implementation, entry);
    else if (kind === "checkpoint") push(checkpoints, entry);
    else if (!readFirst.length) push(readFirst, entry);
    else push(thenRead, entry);
  }

  for (const doc of documents) {
    const rel = String(doc.rel || "");
    if (!CHECKPOINT_RE.test(rel)) continue;
    const titleHay = norm(`${doc.title || ""} ${rel}`);
    const related = nodes.some((c) => tokenize(c.name).some((t) => titleHay.includes(t)));
    if (!related) continue;
    push(checkpoints, {
      repo: doc.repo,
      path: rel,
      title: doc.title || rel,
      via_concept: null,
      provenance: EVIDENCE_CLASS.derived_structurally,
    });
  }

  return { readFirst, thenRead, implementation, checkpoints };
}

function lexicalResidual(query, documents, already, limit) {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const hits = documents
    .map((doc) => {
      const hay = norm(`${doc.title || ""} ${doc.rel || ""} ${doc.description || ""}`);
      return { doc, score: scoreHaystack(hay, tokens) };
    })
    .filter((row) => row.score >= 4)
    .sort((a, b) => b.score - a.score)
    .filter((row) => !already.has(docId({ repo: row.doc.repo, rel: row.doc.rel })))
    .slice(0, limit)
    .map((row) => ({
      repo: row.doc.repo,
      rel: row.doc.rel,
      title: row.doc.title || row.doc.rel,
      document_role: row.doc.document_role,
      provenance: EVIDENCE_CLASS.semantic_candidate,
    }));
  return hits;
}

function decideSufficiency({ seeds, traversal, query, readFirst }) {
  if (!seeds.length && !readFirst.length) {
    if (EXTERNAL_RE.test(query)) {
      return {
        status: "external_required",
        reason: "No internal conceptual structure resolved; query looks like a current/external question.",
      };
    }
    return { status: "incomplete", reason: "No seed concept or source document resolved from existing structure." };
  }
  if (traversal.budget_exhausted) {
    return {
      status: "budget_exhausted",
      reason: `Hit max_nodes/max_hops before the explicit graph was exhausted.`,
    };
  }
  if (EXTERNAL_RE.test(query) && readFirst.length) {
    return {
      status: "structurally_exhausted",
      reason:
        "Bounded structural traversal finished. Query also concerns leaving the Corpus; treat external research as a subsequent step, not a substitute for the sources already listed.",
    };
  }
  return {
    status: "structurally_exhausted",
    reason: "Bounded explicit-structure traversal finished under the configured P0 policy. This is not epistemic sufficiency.",
  };
}

function conflictsAmong(nodes) {
  const byName = new Map();
  for (const concept of nodes) {
    const key = norm(concept.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(concept);
  }
  const conflicts = [];
  for (const [name, list] of byName) {
    const repos = uniqueBy(list, (c) => c.repo).map((c) => c.repo);
    if (repos.length > 1) {
      conflicts.push({ concept: list[0].name, repos, provenance: EVIDENCE_CLASS.explicit });
    }
    void name;
  }
  return conflicts;
}

/**
 * Build a cogentia.orientation.v1 packet from already-visible concepts/docs.
 * Callers must apply view filtering before invoking this.
 */
export function orientCorpus({
  query,
  concepts = [],
  documents = [],
  residualHits = [],
  policy = {},
  view = "public",
} = {}) {
  const q = String(query || "").trim();
  const bounds = { ...DEFAULT_ORIENT_POLICY, ...policy };
  const routingTrace = [];
  const pushTrace = (step, detail, evidenceClass = EVIDENCE_CLASS.derived_structurally) => {
    routingTrace.push({
      step,
      detail,
      evidence_class: evidenceClass,
      influence: TRACE_INFLUENCE.attention_only,
    });
  };

  if (!q) {
    return {
      ok: false,
      schema: ORIENT_SCHEMA,
      error: "missing_query",
      query: "",
      view,
      policy: bounds,
    };
  }

  pushTrace("query", q, EVIDENCE_CLASS.explicit);
  const seeds = selectSeedConcepts(q, concepts, documents, bounds);
  pushTrace(
    "resolve_seeds",
    seeds.map((s) => `${s.concept.name}@${s.concept.repo}`).join(", ") || "(none)",
    seeds[0]?.provenance || EVIDENCE_CLASS.unresolved
  );

  const registered = concepts;
  const traversal = traverseConceptGraph(seeds, registered, bounds);
  pushTrace(
    "traverse_explicit_graph",
    `${traversal.route.length} nodes, hops<=${bounds.max_hops}, nodes<=${bounds.max_nodes}`,
    EVIDENCE_CLASS.derived_structurally
  );

  const already = new Set(
    traversal.nodes.flatMap((c) =>
      (c.documents || []).map((ref) => {
        const parsed = parseDocRef(ref, c.repo);
        return parsed ? docId(parsed) : "";
      })
    )
  );
  const inventoryResidual = lexicalResidual(q, documents, already, bounds.residual_limit);
  const extraResidual = [...inventoryResidual, ...(residualHits || [])];
  if (extraResidual.length) {
    pushTrace(
      "residual_retrieval",
      extraResidual.slice(0, bounds.residual_limit).map((h) => `${h.repo}/${h.rel || h.path}`).join(", "),
      EVIDENCE_CLASS.semantic_candidate
    );
  }

  const evidence = collectEvidence(traversal.route, traversal.nodes, documents, extraResidual, bounds);
  const resolvedConcepts = uniqueBy(
    seeds.map((s) => ({
      name: s.concept.name,
      repo: s.concept.repo,
      slug: s.concept.slug || null,
      provenance: s.provenance,
      reason: s.reason,
    })),
    (c) => `${c.repo}::${norm(c.name)}`
  );
  const conflicts = conflictsAmong(seeds.map((s) => s.concept));
  const sufficiency = decideSufficiency({
    seeds,
    traversal,
    query: q,
    readFirst: evidence.readFirst,
  });
  if (conflicts.length && sufficiency.status === "structurally_exhausted") {
    sufficiency.status = "conflicting";
    sufficiency.reason = `Seed concept names resolve to multiple repos: ${conflicts.map((c) => c.concept).join(", ")}`;
  }

  const guide = guideResolve(q, documents);
  if (guide.ok && guide.canonical_rel) {
    const entry = {
      repo: guide.canonical_repo || null,
      path: guide.canonical_rel,
      title: guide.result?.name || guide.canonical_rel,
      via_concept: null,
      provenance: guide.layer === 1 ? EVIDENCE_CLASS.explicit : EVIDENCE_CLASS.semantic_candidate,
    };
    const id = docId({ repo: entry.repo, rel: entry.path });
    const known = [...evidence.readFirst, ...evidence.thenRead].some((d) => docId({ repo: d.repo, rel: d.path }) === id);
    if (!known) evidence.readFirst.unshift(entry);
    pushTrace(`guide_resolve:layer${guide.layer}`, `${entry.repo}/${entry.path}`, entry.provenance);
  }

  const openQuestions = [];
  if (sufficiency.status === "incomplete" || sufficiency.status === "external_required") {
    openQuestions.push("No sufficient conceptual route was reconstructed from current structure.");
  }
  if (EXTERNAL_RE.test(q) && sufficiency.status !== "external_required") {
    openQuestions.push(
      "After reading the listed Corpus sources, apply the Living evidence / boundary-detection rule before treating the Corpus as the last word."
    );
  }
  for (const miss of traversal.missing_links.slice(0, 8)) {
    openQuestions.push(`Referenced but undefined concept: ${miss.ref} (from ${miss.from})`);
  }

  return {
    ok: true,
    schema: ORIENT_SCHEMA,
    query: q,
    view,
    policy: bounds,
    resolved_concepts: resolvedConcepts,
    conceptual_route: traversal.route,
    read_first: evidence.readFirst,
    then_read: evidence.thenRead,
    implementation_evidence: evidence.implementation,
    recent_checkpoints: evidence.checkpoints,
    open_questions: uniqueBy(openQuestions, (x) => x),
    conflicts,
    missing_links: traversal.missing_links,
    sufficiency,
    routing_trace: routingTrace,
  };
}

function haystackFromPacket(packet) {
  const parts = [];
  for (const c of packet.resolved_concepts || []) parts.push(c.name, c.repo);
  for (const step of packet.conceptual_route || []) parts.push(step.concept, step.repo);
  for (const bucket of ["read_first", "then_read", "implementation_evidence", "recent_checkpoints"]) {
    for (const doc of packet[bucket] || []) parts.push(doc.repo, doc.path, doc.title);
  }
  return norm(parts.join(" "));
}

function targetMatches(target, packet) {
  const hay = haystackFromPacket(packet);
  const id = norm(target.id || target.name || target.path || "");
  if (!id) return false;
  if (hay.includes(id)) return true;
  const pathId = norm(String(target.id || "").replace(/\\/g, "/"));
  if (pathId && hay.includes(pathId.split("/").slice(-2).join("/"))) return true;
  const base = pathId.split("/").pop();
  return Boolean(base && hay.includes(base.replace(/\.md$/, "")));
}

/**
 * Score one Orientation Packet against a Reality Test fixture.
 * author_memory misses are inspectable navigation debt and MUST NOT
 * promote a canonical relation.
 */
export function scoreOrientationAgainstFixture(packet, fixture) {
  const must = fixture.expected?.must_reach || [];
  const should = fixture.expected?.should_reach || [];
  const missedMust = [];
  const missedShould = [];
  const reachedMust = [];
  const reachedShould = [];

  for (const target of must) {
    if (targetMatches(target, packet)) reachedMust.push(target);
    else missedMust.push(target);
  }
  for (const target of should) {
    if (targetMatches(target, packet)) reachedShould.push(target);
    else missedShould.push(target);
  }

  const hintable = missedMust.filter((t) => (t.expectation_basis?.type || fixture.expectation_basis?.type) !== "author_memory");
  const authorMemoryMisses = missedMust.filter((t) => (t.expectation_basis?.type || fixture.expectation_basis?.type) === "author_memory");
  const externalOk = fixture.external_research_expected
    ? packet.sufficiency?.status === "external_required"
    : packet.sufficiency?.status !== "external_required" || (packet.read_first || []).length > 0;

  const contextCost =
    (packet.read_first || []).length +
    (packet.then_read || []).length +
    (packet.conceptual_route || []).length;

  return {
    id: fixture.id,
    question: fixture.question,
    sufficiency: packet.sufficiency?.status || null,
    must_reach_recovered: `${reachedMust.length}/${must.length}`,
    should_reach_recovered: `${reachedShould.length}/${should.length}`,
    reached_must: reachedMust.map((t) => t.id),
    missed_must: missedMust.map((t) => ({
      id: t.id,
      kind: t.kind,
      expectation_basis: t.expectation_basis || fixture.expectation_basis,
    })),
    reached_should: reachedShould.map((t) => t.id),
    missed_should: missedShould.map((t) => ({
      id: t.id,
      kind: t.kind,
      expectation_basis: t.expectation_basis || fixture.expectation_basis,
    })),
    human_bootstrap_hints: hintable.length,
    author_memory_misses: authorMemoryMisses.map((t) => t.id),
    promote_canonical: false,
    external_boundary_ok: externalOk,
    context_cost_proxy: contextCost,
    conceptual_route: (packet.conceptual_route || []).map((s) => s.concept),
    stop_state: packet.sufficiency?.status || null,
    inspectable_debt: missedMust.concat(missedShould).map((t) => ({
      id: t.id,
      kind: t.kind,
      expectation_basis: t.expectation_basis || fixture.expectation_basis,
    })),
  };
}

export async function runOrientationBenchmark(orient, fixtures, options = {}) {
  const results = [];
  for (const fixture of fixtures) {
    const policy = { ...DEFAULT_ORIENT_POLICY, ...(fixture.budget || {}), ...(options.policy || {}) };
    const packet = await orient(fixture.question, policy);
    const scored = scoreOrientationAgainstFixture(packet, fixture);
    results.push({ ...scored, packet: options.includePackets ? packet : undefined });
  }
  const requiredHints = results.reduce((n, r) => n + r.human_bootstrap_hints, 0);
  return {
    ok: true,
    schema: "cogentia.orientation_benchmark.v1",
    total: results.length,
    human_bootstrap_hints: requiredHints,
    results: results.map(({ packet, ...rest }) => (options.includePackets ? { ...rest, packet } : rest)),
    note: "Failures are navigation debt. author_memory misses MUST NOT promote canonical relations.",
  };
}
