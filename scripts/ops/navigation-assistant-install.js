#!/usr/bin/env node
/** Prepare the local Brave extension for one-time developer-mode installation. */

import fs from "node:fs/promises";
import process from "node:process";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const extensionDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../browser-extension");
const manifestPath = path.join(extensionDir, "manifest.json");

export async function main(argv = process.argv.slice(2)) {
  const open = argv.includes("--open");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (manifest.manifest_version !== 3) throw new Error("The local extension must use Manifest V3.");
  console.log(`Extension directory: ${extensionDir}`);
  console.log("One-time Brave installation:");
  console.log("  1. Open chrome://extensions (or Brave menu → More tools → Extensions)");
  console.log("  2. Enable Developer mode");
  console.log("  3. Click Load unpacked");
  console.log(`  4. Select ${extensionDir}`);
  console.log("The extension remains local and can be disabled or removed from the same page.");
  if (open) {
    if (process.platform !== "win32") throw new Error("--open currently requires Windows.");
    const child = spawn("cmd.exe", ["/c", "start", "", "chrome://extensions"], { detached: true, windowsHide: true, stdio: "ignore" });
    child.unref();
  }
}

if (process.argv[1] && process.argv[1].endsWith("navigation-assistant-install.js")) {
  main().catch((error) => { console.error(`navigation-assistant-install: ${error.message}`); process.exitCode = 1; });
}
