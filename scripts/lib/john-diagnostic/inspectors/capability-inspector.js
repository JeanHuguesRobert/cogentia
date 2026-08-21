/**
 * Capability Inspector: Introspection on nature, providers, rate-cards and risk classes of mobilizable capabilities.
 */
export class CapabilityInspector {
  constructor(options = {}) {
    this.name = "capabilities";
    this.description = "Introspect capability catalogue, registered providers, risk levels, and rate cards";
    this.customCapabilities = options.capabilities || [];
  }

  async inspect(query = "", context = {}) {
    const core = context.mcpCore;
    const list = [];

    // Built-in John capabilities
    list.push({
      name: "john.converse",
      kind: "reasoner",
      riskLevel: "none",
      provider: "mock.echo / logical-agent",
      costUnits: 0,
      description: "Baseline stateless governed conversational reasoning",
      status: "online",
    });

    list.push({
      name: "john.research",
      kind: "reasoner_with_tools",
      riskLevel: "bounded",
      provider: "governed.step_reasoner",
      costUnits: 1,
      description: "Multi-step bounded corpus and codebase research",
      status: "online",
    });

    list.push({
      name: "code-analysis",
      kind: "tool",
      riskLevel: "read_only",
      provider: "ast_grep / issue_graph",
      costUnits: 2,
      description: "Static code analysis and AST dependency resolution",
      status: "online",
    });

    // Custom or injected capabilities
    for (const cap of this.customCapabilities) {
      list.push({
        name: cap.name,
        kind: cap.kind || "tool",
        riskLevel: cap.risk || cap.riskLevel || "bounded",
        provider: cap.provider || "custom",
        costUnits: cap.costUnits || 0,
        description: cap.description || "",
        status: cap.status || "online",
      });
    }

    if (query) {
      const q = String(query).toLowerCase();
      return list.filter((c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
    }

    return list;
  }

  async getDetail(capabilityName) {
    const all = await this.inspect();
    const found = all.find((c) => c.name === capabilityName);
    if (!found) {
      return { ok: false, error: `Capability '${capabilityName}' not found in registry.` };
    }
    return {
      ok: true,
      capability: found,
      schema: {
        type: "object",
        input: { prompt: "string" },
      },
      audit: {
        consequentialEffectsAllowed: found.riskLevel === "consequential",
        boundedMaxSteps: 10,
        rateCard: `${found.costUnits} units/call`,
      },
    };
  }
}
