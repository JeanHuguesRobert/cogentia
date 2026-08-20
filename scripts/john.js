#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { renderJohnEventHuman, runJohnRequest } from "./lib/john-run.js";

function usage() {
  return [
    "Usage: node scripts/john.js run --request <request.json> [--format ndjson|human]",
    "",
    "v0 accepts only the safe mock.echo handler. It creates no provider spend or external effect.",
  ].join("\n");
}

function valueFlag(argv, flag) {
  const index = argv.indexOf(flag);
  if (index < 0) return null;
  const value = argv[index + 1];
  argv.splice(index, 2);
  return value || null;
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv.shift();
  if (["help", "--help", "-h", undefined].includes(command)) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  if (command !== "run") throw new Error(`Unknown command ${JSON.stringify(command)}.\n${usage()}`);
  const requestPath = valueFlag(argv, "--request");
  const format = valueFlag(argv, "--format") || "human";
  if (argv.length || !requestPath || !["ndjson", "human"].includes(format)) {
    throw new Error(usage());
  }
  const fullPath = path.resolve(process.cwd(), requestPath);
  let request;
  try {
    request = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read JSON request ${fullPath}: ${error.message}`);
  }
  const events = await runJohnRequest(request);
  for (const item of events) {
    process.stdout.write(format === "ndjson" ? `${JSON.stringify(item)}\n` : `${renderJohnEventHuman(item)}\n`);
  }
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(`john: ${error.message}\n`);
    process.exitCode = 1;
  });

