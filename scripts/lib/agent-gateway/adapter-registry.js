import { grokAdapter } from "./adapters/grok.js";
import { claudeAdapter } from "./adapters/claude.js";
import { codexAdapter } from "./adapters/codex.js";
import { mockAdapter } from "./adapters/mock.js";
import { pythonReplEntity } from "./adapters/python-repl.js";
import { nodejsReplEntity } from "./adapters/nodejs-repl.js";
import { inoxReplEntity } from "./adapters/inox-repl.js";

const ADAPTERS = [
  grokAdapter,
  claudeAdapter,
  codexAdapter,
  pythonReplEntity,
  nodejsReplEntity,
  inoxReplEntity,
  mockAdapter,
];

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

export function resolveAdapterById(adapterId, ctx) {
  const id = String(adapterId || "").trim();
  if (!id) return null;
  return listAdapters(ctx).find(adapter => adapter.id === id) || null;
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