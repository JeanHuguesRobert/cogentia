/** Conservative GitHub Issues -> Janus observations.
 * The issue API snapshot is NOT the issue edit history. Created/closed events
 * have timestamps; a current body is only known at the snapshot timestamp.
 * Cross-references in prose are candidate links, never asserted dependencies.
 */
export function importGithubIssues(issues, { observedAt, repository } = {}) {
  if (!Array.isArray(issues) || !observedAt || Number.isNaN(Date.parse(observedAt))) throw new Error("issues and observedAt required");
  const observations = [], edges = [], candidates = [], skipped = [];
  for (const issue of issues) {
    if (!issue || !Number.isInteger(issue.number) || !issue.html_url ||
        !issue.created_at || Number.isNaN(Date.parse(issue.created_at))) { skipped.push("invalid_identity_or_creation"); continue; }
    if (issue.pull_request) { skipped.push("pull_request_not_issue"); continue; }
    const match = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/issues\/([0-9]+)$/.exec(issue.html_url);
    if (!match || Number(match[2]) !== issue.number || (repository && match[1] !== repository)) {
      skipped.push("untrusted_canonical_url"); continue;
    }
    const id = "github:" + match[1] + ":issue:" + issue.number;
    const source = issue.html_url;
    observations.push({ id: id + ":created", subject: id, kind: "github_issue_created",
      source, occurred_at: issue.created_at, observed_at: observedAt, epistemic_status: "source_attested" });
    if (issue.closed_at) observations.push({ id: id + ":closed", subject: id,
      kind: "github_issue_closed", source, occurred_at: issue.closed_at, observed_at: observedAt,
      epistemic_status: "source_attested" });
    // Current title/body are a *snapshot*, never backdated to issue creation.
    observations.push({ id: id + ":snapshot:" + observedAt, subject: id, kind: "github_issue_snapshot",
      source, occurred_at: null, observed_at: observedAt, epistemic_status: "source_attested",
      title: String(issue.title || "").slice(0, 250),
      state: issue.state, last_api_updated_at: issue.updated_at || null,
      body_excerpt: String(issue.body || "").slice(0, 1000) });
    const mentioned = new Set([...String(issue.body || "").matchAll(/(?:^|[^\w])#(\d{1,6})\b/gm)].map(m=>Number(m[1])));
    for (const n of mentioned) {
      if (n === issue.number) continue;
      candidates.push({ subject: id, predicate: "potential_reference", object: "github:" + match[1] + ":issue_or_pr:" + n,
        source, observed_at: observedAt, epistemic_status: "candidate_unverified" });
    }
  }
  return { observations, edges, candidates, skipped_count: skipped.length,
    coverage: "public-issue-api-snapshots-not-edit-timelines" };
}
