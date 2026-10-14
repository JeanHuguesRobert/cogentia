/**
 * Cold-start, provider-neutral boot packet for the Calculette.
 * Describes verified source-level capabilities, not live endpoint deployment.
 */
export function createCalculetteBootstrap({ advertisedTools = [], surface = "core" } = {}) {
  const available = new Set(advertisedTools);
  const dependencyTool = "cogentia_exploration_dependencies";
  return {
    protocol: "cogentia.calculette_bootstrap/v1",
    surface,
    capability: "exploration.dependencies",
    status: available.has(dependencyTool) ? "discovered_in_registry" : "not_discovered",
    // Presence is only registry discovery; it does NOT prove runtime deployment.
    verification: "registry_only",
    entrypoint: available.has(dependencyTool) ? dependencyTool : null,
    operations: ["upstream", "downstream", "impact"],
    input: { id: "public registry identifier", direction: "upstream|downstream|impact", depth: "integer 0..20", change: "required for impact" },
    semantics: {
      direction: "A -> B means A depends on B",
      impact: "prospective review candidates; not automatic invalidations or actions",
      completeness: "known-public-local-edges-only",
      history: "not altered by any read-only traversal",
    },
    authorization: { risk: "read_only", exposure: "explicitly public unambiguous local registries", private: "not accessible" },
    cold_start: [
      "Obtain accessible registry id through governed corpus orientation/search",
      "Call the discovered capability with bounded depth",
      "Treat missing/hidden relations as unknown, not false",
      "Record source ids and resume reference in the Cognitive Packet",
      "Never infer authorization from availability of a surface",
    ],
    missing: ["Janus retrospective temporal view", "scope-local stigmergic memory", "OpenAI structured tool-call parity", "live deployment verification"],
    tracking: "https://github.com/JeanHuguesRobert/cogentia/issues/233",
  };
}
