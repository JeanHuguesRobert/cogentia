#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const inoxRoot = path.resolve(fixtureDir, "../../../Inox");

if (!fs.existsSync(path.join(inoxRoot, "builds", "inox.js"))) {
  console.error(`Inox runtime not found at ${inoxRoot}`);
  process.exit(1);
}

process.chdir(inoxRoot);
process.env.INOX_VERBOSE = "1";

const { inox } = await import(pathToFileURL(path.join(inoxRoot, "builds", "inox.js")).href);
if (typeof inox.repl !== "function") {
  console.error("Inox REPL not available in this build");
  process.exit(1);
}
inox.repl();