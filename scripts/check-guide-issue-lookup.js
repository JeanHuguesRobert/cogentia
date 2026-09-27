#!/usr/bin/env node
import assert from "node:assert/strict";
import { detectIssueReference, fetchIssueAsGuideSource, guideIssueLookupEnabled } from "./lib/guide-issue-lookup.js";

// Detection: repo + issue number both required, conservative on purpose.
assert.deepEqual(
  detectIssueReference("What recent progress has been made on inseme issue 18 about COP reference runtime hardening ?"),
  { repo: "JeanHuguesRobert/inseme", number: 18 }
);
assert.deepEqual(detectIssueReference("Tell me about issue #45 on operium"), { repo: "JeanHuguesRobert/operium", number: 45 });
assert.equal(detectIssueReference("What is FractaVolta ?"), null, "no issue reference at all");
assert.equal(detectIssueReference("issue 18 mentioned with no recognizable repo name"), null, "number without a repo must not match");
assert.equal(detectIssueReference("Explain the inseme monorepo structure"), null, "repo name alone without 'issue N' must not match");

// Allowlist enforcement: a repo not on the list must never be queried, even
// with a well-formed reference (constructed directly, bypassing detection,
// to test fetchIssueAsGuideSource's own boundary independently).
const disallowed = await fetchIssueAsGuideSource({ repo: "someone-else/private-repo", number: 1 });
assert.equal(disallowed, null, "must refuse to query a repo outside the allowlist");

// Malformed input fails soft, never throws.
assert.equal(await fetchIssueAsGuideSource(null), null);
assert.equal(await fetchIssueAsGuideSource({}), null);

// Enable/disable flag.
const original = process.env.COGENTIA_GUIDE_ISSUE_LOOKUP;
process.env.COGENTIA_GUIDE_ISSUE_LOOKUP = "0";
assert.equal(guideIssueLookupEnabled(), false);
process.env.COGENTIA_GUIDE_ISSUE_LOOKUP = "1";
assert.equal(guideIssueLookupEnabled(), true);
if (original === undefined) delete process.env.COGENTIA_GUIDE_ISSUE_LOOKUP;
else process.env.COGENTIA_GUIDE_ISSUE_LOOKUP = original;

// Real network call, opt-in only (this suite must stay runnable offline /
// without gh auth by default -- matches the rest of this scripts/ directory's
// convention of gating real external calls behind an env flag).
if (process.env.RUN_GUIDE_ISSUE_LOOKUP_LIVE === "1") {
  const ref = detectIssueReference("What recent progress has been made on inseme issue 18 about COP reference runtime hardening ?");
  const source = await fetchIssueAsGuideSource(ref);
  assert.ok(source?.source?.source_id === "JeanHuguesRobert/inseme#18", "live fetch must return the real issue");
  assert.match(source.context.text, /COP reference runtime hardening/i);
  console.log(JSON.stringify({ ok: true, live_check: true }));
} else {
  console.log(JSON.stringify({ ok: true, live_check: "skipped (set RUN_GUIDE_ISSUE_LOOKUP_LIVE=1 to include it)" }));
}
