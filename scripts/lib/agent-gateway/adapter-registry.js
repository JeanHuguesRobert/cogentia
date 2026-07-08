import { grokAdapter } from "./adapters/grok.js";
import { claudeAdapter } from "./adapters/claude.js";
import { codexAdapter } from "./adapters/codex.js";
import { mockAdapter } from "./adapters/mock.js";
import { pythonReplEntity } from "./adapters/python-repl.js";
import { nodejsReplEntity } from "./adapters/nodejs-repl.js";
import { inoxReplEntity } from "./adapters/inox-repl.js";
import { shellReplEntity } from "./adapters/shell-repl.js";
import { sqliteReplEntity } from "./adapters/sqlite-repl.js";
import { psqlReplEntity } from "./adapters/psql-repl.js";
import { ipythonReplEntity } from "./adapters/ipython-repl.js";

const ADAPTERS = [
  grokAdapter,
  claudeAdapter,
  codexAdapter,
  pythonReplEntity,
  nodejsReplEntity,
  inoxReplEntity,
  shellReplEntity,
  sqliteReplEntity,
  psqlReplEntity,
  ipythonReplEntity,
  mockAdapter,
];

export function listSessionTools(ctx) {
  return listAdapters(ctx).filter(adapter => adapter.entityKind === "session");
}

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
      entity_kind: adapter.entityKind || "agent",
      tool_category: adapter.toolCategory || null,
      default_mode: adapter.defaultMode || "headless",
    })),
  );
}