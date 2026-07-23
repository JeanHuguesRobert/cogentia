#!/usr/bin/env node
/**
 * Deprecated entry. The Views Store server lives under deploy/ (ESM package).
 *
 *   node deploy/views-server/views-server.js
 *   # or: cd deploy/views-server && npm start
 *
 * Deploy docs: deploy/views-server/README.md · docs/views-store.md
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = path.resolve(here, "../deploy/views-server/views-server.js");

console.error(
  `[views-server] scripts/views-server.js is a stub — running ${canonical}`
);

const child = spawn(process.execPath, [canonical, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
