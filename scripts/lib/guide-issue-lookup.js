/**
 * Live GitHub issue lookup as a citable Guide source.
 *
 * Motivated directly by the legacy-vs-V2 comparison (2026-09-27):
 * en_inseme_issue_18 asked about a GitHub issue's status and got 0 sources
 * from corpus retrieval, no matter how the query was phrased -- the answer
 * was never in the corpus, because it is live GitHub data, not a document.
 * This is a different capability, not a retrieval-quality problem (see
 * guideRetrievalRun's retrieval_fallback, which cannot and should not try
 * to "find" this by rephrasing corpus queries).
 *
 * Scoped deliberately narrow for a public, read-only surface:
 * - Only repos on an explicit allowlist (never an arbitrary owner/repo the
 *   question happens to mention) -- the Guide's mandate is public corpus
 *   view, not an open GitHub API proxy.
 * - Read-only (`gh issue view`), no state change possible.
 * - Fails soft: any error (gh not installed, not authenticated, network,
 *   timeout, issue not found) returns null and the caller proceeds without
 *   this source, exactly like a corpus query that found nothing.
 */

import { execFile } from "node:child_process";

const DEFAULT_ALLOWED_REPOS = [
  "JeanHuguesRobert/inseme",
  "JeanHuguesRobert/cogentia",
  "JeanHuguesRobert/operium",
  "JeanHuguesRobert/FractaVolta",
  "JeanHuguesRobert/Inox",
  "JeanHuguesRobert/marenostrum",
  "JeanHuguesRobert/barons-Mariani",
];

function allowedRepos() {
  const configured = String(process.env.COGENTIA_GUIDE_ISSUE_LOOKUP_REPOS || "").trim();
  if (!configured) return DEFAULT_ALLOWED_REPOS;
  return configured.split(",").map((s) => s.trim()).filter(Boolean);
}

export function guideIssueLookupEnabled() {
  return String(process.env.COGENTIA_GUIDE_ISSUE_LOOKUP || "1").trim() !== "0";
}

/**
 * Conservative detection: requires both a recognizable repo name (matched
 * against the allowlist, short name or owner/name) AND an explicit issue
 * number reference near the word "issue". Deliberately does not try to
 * guess a repo from context alone -- a false negative (missing a real
 * reference) is much safer here than a false positive (querying the wrong
 * repo, or treating an unrelated number as an issue number).
 */
export function detectIssueReference(question) {
  const text = String(question || "");
  const numberMatch = text.match(/issue\s*#?(\d{1,6})\b/i);
  if (!numberMatch) return null;
  const number = Number(numberMatch[1]);
  if (!Number.isFinite(number) || number <= 0) return null;

  for (const fullName of allowedRepos()) {
    const shortName = fullName.split("/")[1] || fullName;
    const nameRe = new RegExp(`\\b${escapeRegExp(shortName)}\\b`, "i");
    const fullRe = new RegExp(`\\b${escapeRegExp(fullName)}\\b`, "i");
    if (fullRe.test(text) || nameRe.test(text)) {
      return { repo: fullName, number };
    }
  }
  return null;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ghExecCommand() {
  const override = String(process.env.COGENTIA_GH_EXEC || "").trim();
  if (!override) return ["gh"];
  try {
    const parsed = JSON.parse(override);
    if (Array.isArray(parsed) && parsed.length) return parsed.map(String);
  } catch {
    /* fall through to raw override */
  }
  return [override];
}

function runGh(args, timeoutMs) {
  return new Promise((resolve) => {
    const [command, ...prefixArgs] = ghExecCommand();
    // Found live on fracta2, 2026-09-27: mcp-cogentia.service's process
    // environment carries a GITHUB_TOKEN set for an unrelated feature (some
    // other drop-in config), which `gh` prioritizes over the working
    // interactive `gh auth login` session -- causing a silent
    // "HTTP 401: Bad credentials" that this function correctly reported as
    // ok:false, but for a cause invisible without reading /proc/<pid>/environ
    // directly. Clear the token env vars gh recognizes for *this* call only
    // (not process.env itself, which the other feature still needs), so gh
    // falls back to its own stored OAuth credentials.
    const env = { ...process.env };
    delete env.GITHUB_TOKEN;
    delete env.GH_TOKEN;
    delete env.GITHUB_ENTERPRISE_TOKEN;
    delete env.GH_ENTERPRISE_TOKEN;
    // Second environment-pollution layer found live on fracta2, 2026-09-27,
    // right after the token fix: the service's process also carries an
    // HTTP_PROXY/HTTPS_PROXY pointing at a local proxy (127.0.0.1:8889, for
    // some other feature) that isn't listening for this call, so gh's
    // network request failed with "proxyconnect ... connection refused".
    // Same defensive clearing already used by this workspace's other local
    // subprocess integrations (see packages/magistral/registry/maps/
    // local-*-acp.js's createAcpEnvironment) -- apply it here too.
    env.HTTP_PROXY = "";
    env.HTTPS_PROXY = "";
    env.ALL_PROXY = "";
    env.http_proxy = "";
    env.https_proxy = "";
    env.all_proxy = "";
    env.NO_PROXY = "*";
    env.no_proxy = "*";
    execFile(command, [...prefixArgs, ...args], { timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024, env }, (error, stdout) => {
      if (error) return resolve({ ok: false, error: error.message });
      try {
        resolve({ ok: true, data: JSON.parse(stdout || "null") });
      } catch (parseError) {
        resolve({ ok: false, error: `non-JSON gh output: ${parseError.message}` });
      }
    });
  });
}

/**
 * Fetch a public issue and format it as a Guide-citable source. Returns
 * null on any failure (allowlist miss, gh unavailable, not found, timeout)
 * -- never throws, per the fail-soft design above.
 */
export async function fetchIssueAsGuideSource(reference, { timeoutMs = 8000 } = {}) {
  if (!reference?.repo || !reference?.number) return null;
  if (!allowedRepos().includes(reference.repo)) return null;

  const result = await runGh(
    ["issue", "view", String(reference.number), "--repo", reference.repo, "--json", "number,title,state,url,updatedAt,body"],
    timeoutMs
  );
  if (!result.ok || !result.data) return null;

  const issue = result.data;
  const sourceId = `${reference.repo}#${issue.number}`;
  const bodyExcerpt = String(issue.body || "").trim().slice(0, 2000);
  const text = [
    `Title: ${issue.title || ""}`,
    `State: ${issue.state || ""}`,
    issue.updatedAt ? `Updated: ${issue.updatedAt}` : "",
    "",
    bodyExcerpt,
  ].filter(Boolean).join("\n");

  return {
    source: {
      source_id: sourceId,
      title: issue.title || `${reference.repo} issue #${issue.number}`,
      github_url: issue.url || `https://github.com/${reference.repo}/issues/${issue.number}`,
      url: issue.url || `https://github.com/${reference.repo}/issues/${issue.number}`,
    },
    context: { source_id: sourceId, text },
  };
}
