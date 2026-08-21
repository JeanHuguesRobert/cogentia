/**
 * Accounting & Budget Inspector: Introspection on provisional spend, double-entry postings, and token rates.
 */
export class AccountingInspector {
  constructor() {
    this.name = "accounting";
    this.description = "Introspect double-entry ledgers, provisional token costs, and remaining budget headroom";
  }

  summarizeEvents(events = []) {
    const settled = events.find((e) => e.type === "john.accounting.settled");
    const started = events.find((e) => e.type === "john.run.started");

    const executionBudget = started?.data?.execution_budget || {};
    const settledData = settled?.data || {};

    return {
      ok: true,
      settlement_mode: settledData.settlement_mode || "provisional",
      provider_cost: settledData.provider_cost || 0,
      external_effects: settledData.external_effects || 0,
      observed_steps: settledData.observed_steps || 0,
      max_steps: executionBudget.max_steps || null,
      hops_count: settledData.hops_count || 0,
      ithaca_returned: Boolean(settledData.ithaca_returned),
      budget_headroom: {
        steps_remaining: executionBudget.max_steps ? Math.max(0, executionBudget.max_steps - (settledData.observed_steps || 0)) : null,
      },
    };
  }
}
