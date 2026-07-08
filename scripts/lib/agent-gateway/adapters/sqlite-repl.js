import { createInterpreterEntity } from "../session-tool-base.js";

export const sqliteReplEntity = createInterpreterEntity({
  id: "sqlite",
  model: "sqlite-repl",
  toolCategory: "database",
  command: ctx => ctx.sqliteCommand,
  probeArgs: ["--version"],
  replArgs: (turn, ctx) => {
    const db = turn.metadata?.tool_config?.sqlite_database
      ?? ctx.sqliteDatabase
      ?? ":memory:";
    return [db];
  },
  headlessArgsFactory: (turn, ctx) => {
    const db = turn.metadata?.tool_config?.sqlite_database ?? ctx.sqliteDatabase ?? ":memory:";
    return [db, turn.prompt];
  },
  readyPattern: /sqlite> $/m,
  promptTokens: ["sqlite>"],
  inactivityMs: 300,
  bootstrapMode: "immediate",
});