#!/usr/bin/env node
/**
 * Records gh calls for resumable-apply. FAKE_GH_LOG receives one JSON argv
 * array per call. FAKE_GH_BODY_FILE is the initial issue body. FAKE_GH_STATE
 * stores an edited body for the following issue view.
 */
import fs from "node:fs";

const args = process.argv.slice(2);
const logPath = process.env.FAKE_GH_LOG;
if (logPath) fs.appendFileSync(logPath, `${JSON.stringify(args)}\n`, "utf8");

function repoFlag() {
  const index = args.indexOf("--repo");
  return index >= 0 ? args[index + 1] : "example/repo";
}

if (args[0] === "issue" && args[1] === "view") {
  const state = process.env.FAKE_GH_STATE;
  const body = state && fs.existsSync(state)
    ? fs.readFileSync(state, "utf8")
    : fs.readFileSync(process.env.FAKE_GH_BODY_FILE, "utf8");
  const number = Number(args[2]) || 1;
  process.stdout.write(JSON.stringify({
    number,
    title: "Fixture",
    state: "OPEN",
    updatedAt: "2026-09-28T00:00:00Z",
    closedAt: null,
    url: `https://github.com/${repoFlag()}/issues/${number}`,
    labels: [],
    author: { login: "tester" },
    body,
    comments: [],
  }));
  process.exit(0);
}

if (args[0] === "issue" && args[1] === "edit") {
  const fileIndex = args.indexOf("--body-file");
  if (fileIndex < 0) process.exit(1);
  const body = fs.readFileSync(args[fileIndex + 1], "utf8");
  fs.writeFileSync(process.env.FAKE_GH_STATE, body, "utf8");
  process.stdout.write("{}\n");
  process.exit(0);
}

process.stderr.write(`fake-gh: unhandled ${JSON.stringify(args)}\n`);
process.exit(1);
