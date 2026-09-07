#!/usr/bin/env node
/** Keep the resident navigation assistant alive for local development. */

import { spawn } from "node:child_process";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const tui = path.join(path.dirname(fileURLToPath(import.meta.url)), "navigation-assistant-tui.js");
const delayMs = Number(process.env.NAV_ASSIST_RESTART_DELAY_MS || 250);

function run() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [tui], {
      stdio: "inherit",
      env: { ...process.env, NAV_ASSIST_SUPERVISED: "1" },
    });
    child.on("error", (error) => { console.error(`navigation-assistant supervisor: ${error.message}`); resolve(1); });
    child.on("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

while (true) {
  const code = await run();
  if (code === 0) break;
  console.error(`navigation-assistant: restarting after exit code ${code}`);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
