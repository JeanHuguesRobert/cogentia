/**
 * Calculette de l'esprit — read-only bidirectional dependency projection.
 * Existing source-owned edges remain authoritative. Reversed links are views.
 * subject -> object means: subject depends on object.
 * No side effects, no policy escalation, no claim of full-world completeness.
 */
export const DEPENDENCY_VIEW_PROTOCOL = "cogentia.dependency_view/v1";
const DEFAULT_PREDICATES = new Set(["depends_on"]);
function boundDepth(depth) {
  const n = Number(depth ?? 4);
  if (!Number.isInteger(n) || n < 0 || n > 20) throw new Error("depth must be an integer in [0,20]");
  return n;
}
function visibleRelations(relations, allowed) {
  if (!Array.isArray(relations)) throw new TypeError("relations must be an array");
  if (typeof allowed !== "function") throw new TypeError("allowed must be a visibility predicate");
  return relations.filter(edge => edge && typeof edge.subject === "string" &&
    typeof edge.object === "string" && allowed(edge)).map(edge => ({
      subject: edge.subject, object: edge.object, predicate: String(edge.predicate || "depends_on"),
      source: edge._source_file || edge.source || null,
  }));
}
/**
 * Only caller-admitted edges are traversed. A hidden node/reference never
 * appears in a result, even as a count or a missing-node hint.
 */
export function traverseDependencies(relations, id, {
  direction = "upstream", depth = 4, allowed = () => true, predicates = ["depends_on"],
} = {}) {
  if (!["upstream", "downstream"].includes(direction)) throw new Error("invalid direction");
  const limit = boundDepth(depth);
  const accepted = new Set(predicates);
  const edges = visibleRelations(relations, allowed).filter(e => accepted.has(e.predicate));
  const start = String(id || "");
  if (!start) throw new Error("id is required");
  const results = [];
  const discovered = new Set([start]);
  let exploredPaths = 0;
  const visit = (current, path, via) => {
    if (path.length - 1 >= limit) return;
    for (const edge of edges) {
      const matches = direction === "upstream" ? edge.subject === current : edge.object === current;
      if (!matches) continue;
      if (++exploredPaths > 10000) throw new Error("dependency traversal budget exceeded");
      const target = direction === "upstream" ? edge.object : edge.subject;
      const cycle = path.includes(target);
      const nextPath = [...path, target];
      const nextVia = [...via, edge];
      if (cycle) {
        results.push({ id: target, depth: nextPath.length - 1, cycle: true, path: nextPath, via: nextVia });
      } else {
        if (!discovered.has(target)) {
          discovered.add(target);
          results.push({ id: target, depth: nextPath.length - 1, cycle: false, path: nextPath, via: nextVia });
        }
        // Follow an alternate path even if target was discovered elsewhere:
        // otherwise a cycle spanning two siblings could be silently missed.
        visit(target, nextPath, nextVia);
      }
    }
  };
  visit(start, [start], []);
  return { protocol: DEPENDENCY_VIEW_PROTOCOL, id: start, direction, depth: limit, entries: results };
}
export function upstream(relations, id, options = {}) {
  return traverseDependencies(relations, id, { ...options, direction: "upstream" });
}
export function downstream(relations, id, options = {}) {
  return traverseDependencies(relations, id, { ...options, direction: "downstream" });
}
/** Janus: current prospective review candidates, never observed effects or invalidation. */
export function impact(relations, id, change, options = {}) {
  if (!change || typeof change !== "string") throw new Error("change description required");
  const projection = downstream(relations, id, options);
  return { ...projection, mode: "prospective", change, disposition: "review_candidates_only" };
}
