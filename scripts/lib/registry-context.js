// 2026-11-27 — GPT-6.2 under JHR. Shared canonical registry normalization.
import fs from "node:fs";
import path from "node:path";

const DEFAULT_REPO_POLICIES = {
  inseme: {
    default_scope: "research",
    note: "local policy: unstable outside research",
  },
  JeanHuguesRobert: {
    ignore_dirty: [".cogentia/**"],
    role: "registry",
  },
  "registre-mariani": {
    visibility: "private",
    public_presence: "hidden",
    note: "private civic/registry corpus — never fan-out into public digests or llms.txt",
  },
};

export function normalizeGitHubFullName(value) {
  const clean = String(value || "").trim().replace(/\.git$/i, "").replace(/^https:\/\/github\.com\//i, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length < 2) return "";
  return `${parts[0]}/${parts[1]}`;
}

function resolveRegistryPath(registryRoot, targetPath) {
  const raw = String(targetPath || ".");
  return path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(registryRoot, raw);
}

function policyFromRepoEntry(r) {
  const policy = {};
  for (const key of [
    "github",
    "github_repo",
    "owner",
    "owner_kind",
    "ownership",
    "relation",
    "mandate",
    "visibility",
    "privacy",
    "public_presence",
    "trace_level",
    "default_scope",
  ]) {
    if (r[key] != null && r[key] !== "") policy[key] = r[key];
  }
  return policy;
}

export function normalizeRegistryContext(raw, configPath) {
  const registryRoot = path.dirname(configPath);
  const repos = (raw.repos || []).map(r => {
    const policy = {
      ...(DEFAULT_REPO_POLICIES[r.name] || {}),
      ...policyFromRepoEntry(r),
      ...(raw.policies?.[r.name] || raw.repo_policies?.[r.name] || {}),
    };
    const repoPath = resolveRegistryPath(registryRoot, r.path || ".");
    // Do not spawn `git remote` per repo on every request. Policy wins; else
    // githubUrl / issue-sync resolve lazily via githubFullNameFromRemote cache.
    const githubFullName = normalizeGitHubFullName(policy.github || policy.github_repo || "");
    const fallbackName = githubFullName || `JeanHuguesRobert/${r.name}`;
    return {
      name: r.name,
      path: repoPath,
      kind: r.kind,
      branch: r.branch || "main",
      added: r.added,
      github_full_name: githubFullName,
      owner: policy.owner || fallbackName.split("/")[0],
      owner_kind: policy.owner_kind || "unknown",
      ownership: policy.ownership || policy.relation || "unknown",
      mandate: policy.mandate || "",
      policy: { default_scope: "all", ...policy },
    };
  });
  return { configPath, registryRoot, config: raw, repos };
}

// Weekly writes must not silently substitute a partial historical inventory.
// Resolve paths relative to the selected registry, not the invoking checkout.
export function loadWeeklyRegistry(root, explicitPath) {
  const requested = explicitPath || process.env.COGENTIA_REGISTRY;
  const choices = requested
    ? [path.resolve(requested)]
    : [path.join(root, ".cogentia.json"), path.join(root, "..", "JeanHuguesRobert", ".cogentia.json")];
  const file = choices.map(p => fs.existsSync(p) && fs.statSync(p).isDirectory() ? path.join(p, ".cogentia.json") : p)
    .find(p => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!file) throw new Error("Weekly consolidation requires the canonical .cogentia.json registry");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(raw.repos) || !raw.repos.length
    || raw.repos.some(r => !r || !r.name || !r.path || !r.branch)
    || new Set(raw.repos.map(r => r.name)).size !== raw.repos.length
    || !raw.repos.some(r => r.name === "cogentia")) {
    throw new Error("Weekly consolidation requires unique repository names, paths and explicit branches");
  }
  return normalizeRegistryContext(raw, file);
}
