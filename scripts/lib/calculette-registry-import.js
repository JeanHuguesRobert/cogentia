/** Source-specific, conservative import of existing public registry descriptors.
 * Descriptor is evidence of a declaration, not of when a dependency became true.
 * Imports are deterministic and side-effect-free; no network and no inferred edges.
 */
export function importRegistrySnapshot(graph, { observedAt, rootLabel = "local-corpus" } = {}) {
  if (!observedAt || Number.isNaN(Date.parse(observedAt))) throw new Error("observedAt required");
  const observations = [], edges = [], skipped = [];
  const publicIds = new Set((graph.registries || []).filter(r =>
    r.facets?.visibility === "public" && (graph.byId?.get(r.id) || []).length === 1).map(r => r.id));
  for (const registry of graph.registries || []) {
    if (!publicIds.has(registry.id)) { skipped.push({ reason: "not_public_or_ambiguous" }); continue; }
    const source = String(registry._source_file || "");
    if (!source) { skipped.push({ reason: "missing_source" }); continue; }
    observations.push({
      id: "registry-descriptor:" + registry.id, kind: "registry_descriptor_observed",
      subject: registry.id, source, observed_at: observedAt,
      epistemic_status: "source_attested", scope: rootLabel,
      occurred_at: null, temporal_note: "declaration start time unknown",
    });
  }
  for (const edge of graph.relations || []) {
    if (!publicIds.has(edge.subject) || !publicIds.has(edge.object) || !edge._source_file) continue;
    edges.push({ subject: edge.subject, object: edge.object, predicate: edge.predicate,
      source: edge._source_file, observed_at: observedAt,
      epistemic_status: "source_attested", occurred_at: null });
  }
  return { observations, edges, skipped_count: skipped.length,
    coverage: "unambiguous explicitly public registry descriptors only" };
}
