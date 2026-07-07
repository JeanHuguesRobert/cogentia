import { grokAdapter } from "./adapters/grok.js";
import { mockAdapter } from "./adapters/mock.js";

const ADAPTERS = [grokAdapter, mockAdapter];

export function listAdapters(ctx) {
  if (ctx.useMock) return [mockAdapter];
  return ADAPTERS.filter(a => a.id !== "mock");
}

export function resolveAdapter(model, ctx) {
  const adapters = listAdapters(ctx);
  for (const adapter of adapters) {
    if (adapter.models.includes(model)) return adapter;
  }
  return null;
}

export function listModels(ctx) {
  return listAdapters(ctx).flatMap(adapter =>
    adapter.models.map(id => ({
      id,
      object: "model",
      owned_by: "agent-cli-gateway",
      adapter: adapter.id,
    })),
  );
}