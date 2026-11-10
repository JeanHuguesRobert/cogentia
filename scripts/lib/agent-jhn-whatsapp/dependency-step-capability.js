/** Agent JHN read-only view of local, public Cogentia registry dependencies. */
import { buildRegistryGraph } from "../../corpus-registries.js";
import { upstream, downstream, impact } from "../dependency-janus.js";

export function createDependencyExplorationCapability({ root, graphProvider } = {}) {
  if (typeof graphProvider !== "function" && !root) throw new Error("root or graphProvider is required");
  return {
    name: "exploration.dependencies",
    kind: "tool",
    risk: "read_only",
    resultVisibility: "reasoner",
    costUnits: 1,
    description: "Explore upstream/downstream public registry dependencies or prospective impact without effects.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        direction: { type: "string", enum: ["upstream", "downstream", "impact"] },
        change: { type: "string" },
        depth: { type: "integer", minimum: 0, maximum: 20 },
      },
      required: ["id", "direction"], additionalProperties: false,
    },
    async execute(input = {}) {
      const graph = typeof graphProvider === "function" ? graphProvider() : buildRegistryGraph(root);
      if (graph.errors?.length) throw new Error("REGISTRY_GRAPH_INVALID");
      const visible = id => {
        const matches = graph.byId.get(id) || [];
        return matches.length === 1 && matches[0].facets?.visibility === "public";
      };
      // Never reveal private or unknown registry references, including the queried root.
      if (!visible(input.id)) return { ok: false, status: "not_accessible" };
      const allowed = edge => edge.predicate === "depends_on" && visible(edge.subject) && visible(edge.object);
      const opts = { allowed, depth: input.depth ?? 4 };
      const result = input.direction === "upstream" ? upstream(graph.relations, input.id, opts)
        : input.direction === "downstream" ? downstream(graph.relations, input.id, opts)
        : input.direction === "impact" ? impact(graph.relations, input.id, String(input.change || ""), opts)
        : null;
      if (!result) throw new Error("INVALID_DEPENDENCY_DIRECTION");
      return { ok: true, ...result, completeness: "known-public-local-edges-only" };
    },
  };
}
