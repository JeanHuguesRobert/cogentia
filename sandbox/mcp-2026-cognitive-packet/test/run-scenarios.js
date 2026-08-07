#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const r = spawnSync(process.execPath, [path.join(root, "index.js"), "run", "all"], {
  cwd: path.resolve(root, "../.."),
  encoding: "utf8",
  env: {
    ...process.env,
    COGENTIA_MCP_JHN_MUTATE: process.env.COGENTIA_MCP_JHN_MUTATE || "1",
    COGENTIA_MCP_JHN_TOKEN: process.env.COGENTIA_MCP_JHN_TOKEN || "sandbox-jhn-token",
  },
});
process.stdout.write(r.stdout || "");
process.stderr.write(r.stderr || "");
process.exit(r.status === 0 ? 0 : 1);
