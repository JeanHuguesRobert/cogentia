#!/usr/bin/env node
/**
 * #171 Phase C Reality Test — github.write without the GitHub API.
 */
import assert from "node:assert/strict";
import {
  grantSideEffectAuthorization,
  resetAuthorizationStore,
  authorizationFromUtterance,
} from "../lib/side-effect-authorization.js";
import {
  prepareGithubWrite,
  executeGithubWrite,
  createGithubDryRunTransport,
} from "../lib/github-write.js";

resetAuthorizationStore();
const transport = createGithubDryRunTransport();
const report = { ok: false, written: 0 };

try {
  assert.equal(authorizationFromUtterance("We will comment on the issue.").granted, false);

  const prepared = prepareGithubWrite({
    operation: "add_issue_comment",
    owner: "JeanHuguesRobert",
    repo: "cogentia",
    issue_number: 171,
    body: "This is the exact comment the Principal must see.",
  });

  await assert.rejects(
    () => executeGithubWrite({ prepared, authorization: null, transport }),
    (e) => e.error_class === "authorization_missing"
  );
  assert.equal(transport.written.length, 0);

  const authorization = grantSideEffectAuthorization({
    principal: "principal:test",
    action_class: "github.write",
    target: prepared.target,
    payload: prepared.payload,
  });
  const executed = await executeGithubWrite({ prepared, authorization, transport });
  assert.equal(executed.ok, true);
  assert.equal(transport.written[0].payload.body, prepared.payload.body);

  await assert.rejects(
    () => executeGithubWrite({ prepared, authorization, transport }),
    (e) => e.error_class === "authorization_replay"
  );
  assert.equal(transport.written.length, 1);

  report.ok = true;
  report.written = transport.written.length;
  report.transport = "dry-run";
  report.github_api_contacted = false;
} catch (err) {
  report.error = err.message;
  report.error_class = err.error_class || null;
}

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
