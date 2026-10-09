/**
 * Janus retrospective seed: historical, attributable observations, not predictions.
 * A reproducible projection from supplied source snapshots. Never backdate a
 * statement that was learned later as if it had been known at event time.
 */
export const JANUS_SEED_PROTOCOL = "cogentia.calculette_janus_seed/v1";

/** observations: {id, kind, occurred_at, observed_at, source, subject, ...}
 *  edges: {subject, object, predicate, source, observed_at}
 *  An edge is an observed relation; its actual beginning may be unknown.
 */
export function buildJanusSeed({ observations = [], edges = [], asOf } = {}) {
  if (!asOf || Number.isNaN(Date.parse(asOf))) throw new Error("valid asOf is required");
  const cutoff = Date.parse(asOf);
  const facts = new Map();
  for (const item of observations) {
    if (!item.id || !item.source || !item.observed_at || Number.isNaN(Date.parse(item.observed_at))) {
      throw new Error("each observation needs id, source, and observed_at");
    }
    if (Date.parse(item.observed_at) > cutoff) continue;
    if (facts.has(item.id) && JSON.stringify(facts.get(item.id)) !== JSON.stringify(item)) {
      throw new Error("conflicting observation id: " + item.id);
    }
    facts.set(item.id, Object.freeze({ ...item, epistemic_status: item.epistemic_status || "source_attested" }));
  }
  const relations = new Map();
  for (const edge of edges) {
    if (!edge.subject || !edge.object || !edge.predicate || !edge.source || !edge.observed_at ||
        Number.isNaN(Date.parse(edge.observed_at))) throw new Error("edge needs endpoints, predicate, source, observed_at");
    if (Date.parse(edge.observed_at) > cutoff) continue;
    const key = [edge.subject, edge.predicate, edge.object, edge.source].join("\u0000");
    relations.set(key, Object.freeze({ ...edge }));
  }
  const sort = (a,b) => a.id?.localeCompare(b.id) || a.subject?.localeCompare(b.subject) ||
    a.object?.localeCompare(b.object) || a.source.localeCompare(b.source);
  return Object.freeze({
    protocol: JANUS_SEED_PROTOCOL, as_of: asOf,
    facts: [...facts.values()].sort(sort),
    relations: [...relations.values()].sort(sort),
    status: "reconstructed_from_observed_sources",
    gaps: ["Not a complete historical record", "No inferred facts from absence of evidence",
      "Observed-at is not the same as occurred-at or when a relation became true"],
  });
}
export function compareJanusSeeds(before, after) {
  if (Date.parse(before.as_of) > Date.parse(after.as_of)) throw new Error("chronological order required");
  const byId = new Set(before.facts.map(f => f.id));
  const key = e => [e.subject,e.predicate,e.object,e.source].join("\u0000");
  const beforeEdges = new Set(before.relations.map(key));
  return {
    protocol: "cogentia.calculette_janus_delta/v1",
    from: before.as_of, to: after.as_of,
    newly_observed_facts: after.facts.filter(f => !byId.has(f.id)),
    newly_observed_relations: after.relations.filter(e => !beforeEdges.has(key(e))),
    interpretation: "newly known at this vantage; not necessarily newly occurred",
  };
}
