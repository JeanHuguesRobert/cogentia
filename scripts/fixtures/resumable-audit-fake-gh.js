#!/usr/bin/env node
/**
 * Records every gh invocation for the resumable-audit non-effect test.
 * FAKE_GH_LOG is the file that receives one JSON argv array per call.
 */
import fs from "node:fs";

const args = process.argv.slice(2);
const logPath = process.env.FAKE_GH_LOG;
if (logPath) {
  fs.appendFileSync(logPath, `${JSON.stringify(args)}\n`, "utf8");
}

if (args[0] === "issue" && args[1] === "view") {
  process.stdout.write(JSON.stringify({
    number: Number(args[2]) || 1,
    title: "Fake issue",
    state: "OPEN",
    updatedAt: "2026-09-27T00:00:00Z",
    closedAt: null,
    url: "https://github.com/example/repo/issues/1",
    labels: [],
    author: { login: "tester" },
    body: "No goal is stated here. This fixture only proves the audit does not mutate GitHub.",
    comments: [],
  }));
  process.exit(0);
}

process.stdout.write("[]");
process.exit(0);
