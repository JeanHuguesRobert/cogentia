#!/usr/bin/env node
/**
 * Fake `gh` used by scripts/test-concepts-scan-issues.js via COGENTIA_GH_EXEC,
 * so the fixture is deterministic and doesn't depend on live network/gh auth.
 *
 * Controlled via FAKE_GH_MODE:
 *   ok (default) - two canned issues
 *   many         - twenty canned issues (confirmation-threshold path)
 *   fail         - always exits non-zero (capability-delegation path)
 */
const mode = process.env.FAKE_GH_MODE || "ok";
const args = process.argv.slice(2);

if (mode === "fail") {
  process.stderr.write("simulated gh failure: not authenticated\n");
  process.exit(1);
}

function makeIssues(n) {
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    title: `Fake issue ${i + 1}`,
    state: "OPEN",
    updatedAt: "2026-08-17T00:00:00Z",
    url: `https://github.com/fake/repo/issues/${i + 1}`,
    labels: [],
    author: { login: "tester" },
    body: `Body of fake issue ${i + 1}`,
  }));
}

if (args[0] === "issue" && args[1] === "list") {
  const count = mode === "many" ? 20 : 2;
  process.stdout.write(JSON.stringify(makeIssues(count)));
  process.exit(0);
}

if (args[0] === "issue" && args[1] === "view") {
  const number = Number(args[2]);
  process.stdout.write(JSON.stringify({
    number,
    title: `Fake issue ${number}`,
    state: "OPEN",
    updatedAt: "2026-08-17T00:00:00Z",
    closedAt: null,
    url: `https://github.com/fake/repo/issues/${number}`,
    labels: [],
    author: { login: "tester" },
    body: `Body of fake issue ${number}`,
    comments: [{ author: { login: "tester" }, body: "a comment", createdAt: "2026-08-17T00:00:00Z" }],
  }));
  process.exit(0);
}

process.stderr.write(`fake-gh: unhandled args ${JSON.stringify(args)}\n`);
process.exit(1);
