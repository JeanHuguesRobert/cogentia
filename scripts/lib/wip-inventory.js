/**
 * WIP inventory: observational Git state only. Never fetch, stash, checkout,
 * copy working content, or mutate the inspected repositories.
 * Schema wip.inventory/v1; coverage is always explicit.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const GIT_OPTIONS = ["--no-optional-locks", "-c", "core.quotepath=false"];
function git(repo, ...args) {
  try {
    return { ok: true, value: execFileSync("git", [...GIT_OPTIONS, "-C", repo, ...args], {
      encoding: "utf8", timeout: 20000, maxBuffer: 12 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" },
    }).trimEnd() };
  } catch (error) {
    return { ok: false, error: (error.stderr?.toString() || error.message).trim().slice(0, 300) };
  }
}
const lines = value => value?.split(/\r?\n/).filter(Boolean) || [];
const canon = p => path.resolve(p);
function distinct(values) { return [...new Set(values.map(canon))]; }
function registered(root) {
  const paths = [];
  if (fs.existsSync(path.join(root, ".git"))) paths.push(root);
  if (!fs.existsSync(root)) return { paths, errors: ["root_missing"] };
  try {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(root, entry.name);
      if (fs.existsSync(path.join(candidate, ".git"))) paths.push(candidate);
    }
    return { paths, errors: [] };
  } catch (error) { return { paths, errors: [error.message] }; }
}
function discover(root) {
  const scan = registered(root);
  const paths = [...scan.paths];
  const errors = [...scan.errors];
  for (const repo of scan.paths) {
    const w = git(repo, "worktree", "list", "--porcelain");
    if (!w.ok) { errors.push(`worktree:${repo}:${w.error}`); continue; }
    for (const line of lines(w.value)) {
      if (!line.startsWith("worktree ")) continue;
      const candidate = canon(line.slice(9));
      if (fs.existsSync(candidate) && (candidate === root || candidate.startsWith(root + path.sep))) paths.push(candidate);
    }
  }
  return { paths: distinct(paths).sort(), errors, coverage: "root and immediate Git children plus registered worktrees within root; no recursive unregistered clones" };
}
function parseRefs(output) {
  return lines(output).map(line => {
    const [name, oid, upstream] = line.split("\t");
    return { name, oid, upstream: upstream || null };
  });
}
function readRepo(repo) {
  const errors = [];
  function read(name, args) {
    const r = git(repo, ...args);
    if (!r.ok) errors.push({ name, error: r.error });
    return r.ok ? r.value : "";
  }
  const head = read("head", ["rev-parse", "HEAD"]);
  const branch = read("branch", ["symbolic-ref", "--quiet", "--short", "HEAD"]);
  // Detached HEAD is a valid state, not an inventory error.
  if (!branch) {
    const at = errors.findIndex(x => x.name === "branch");
    if (at >= 0) errors.splice(at, 1);
  }
  const common = read("common", ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  const status = read("status", ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  const refs = parseRefs(read("refs", ["for-each-ref", "--format=%(refname)%09%(objectname)%09%(upstream)", "refs/heads", "refs/remotes"]));
  const stash = lines(read("stash", ["stash", "list", "--format=%H%x09%gd%x09%cs"])).map(x => {
    const [oid, selector, date] = x.split("\t");
    return { oid, selector, date };
  });
  const remoteResult = git(repo, "remote", "get-url", "origin");
  // Remote URLs may embed credentials: retain only safe host/repository identity.
  let remote = null;
  if (remoteResult.ok) {
    const raw = remoteResult.value;
    if (/^https?:\/\//.test(raw)) {
      try { const u = new URL(raw); remote = `${u.protocol}//${u.hostname}${u.pathname}`; } catch {}
    } else if (/^[^@\s]+@[^:]+:.+$/.test(raw)) { remote = raw.replace(/^[^@]+@/, "ssh@"); }
    else if (/^\/|^\.\.?\//.test(raw)) remote = "[local-remote]";
  }
  const upstreamResult = branch ? git(repo, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}") : null;
  const upstream = upstreamResult?.ok ? upstreamResult.value : "";
  // No name/content exposure for ignored files, except bounded counts; patterns may conceal secrets.
  const ignoredRaw = read("ignored", ["ls-files", "--others", "--ignored", "--exclude-standard", "-z"]);
  const ignored = ignoredRaw ? ignoredRaw.split("\0").filter(Boolean) : [];
  const staged = read("staged", ["diff", "--cached", "--name-only", "-z"]).split("\0").filter(Boolean);
  const unstaged = read("unstaged", ["diff", "--name-only", "-z"]).split("\0").filter(Boolean);
  const untracked = status.split("\0").filter(x => x.startsWith("?? ")).map(x=>x.slice(3));
  const comparisons = [];
  const base = refs.find(x=>x.name==="refs/remotes/origin/main") || refs.find(x=>x.name==="refs/remotes/origin/master");
  if (base) {
    for (const ref of refs.filter(x=>x.name.startsWith("refs/heads/") || x.name.startsWith("refs/remotes/origin/") && !x.name.endsWith("/HEAD"))) {
      if (ref.name === base.name) continue;
      const counts = git(repo, "rev-list", "--left-right", "--count", `${base.oid}...${ref.oid}`);
      const [behind, ahead] = counts.ok ? counts.value.split(/\s+/).map(Number) : [null, null];
      if (!counts.ok) errors.push({ name: "compare", ref: ref.name, error: counts.error });
      comparisons.push({ ref: ref.name, oid: ref.oid, ahead, behind });
    }
  }
  const latestRemoteFetch = common && fs.existsSync(path.join(common, "FETCH_HEAD"))
    ? fs.statSync(path.join(common, "FETCH_HEAD")).mtime.toISOString() : null;
  return {
    path: repo, observed_at: new Date().toISOString(), head, branch: branch || null,
    common_git_dir: common, origin: remote || null, upstream: upstream || null,
    base: base ? { ref: base.name, oid: base.oid, last_fetch_head_mtime: latestRemoteFetch } : null,
    refs, comparisons, stashes: stash, staged, unstaged, untracked,
    ignored: { count: ignored.length, paths_redacted: true },
    dirty: !!status, errors,
  };
}
export function wipInventory({ root = process.cwd(), machine = os.hostname() } = {}) {
  root = canon(root);
  const found = discover(root);
  const repositories = found.paths.map(p => readRepo(p));
  return {
    schema: "wip.inventory/v1", observed_at: new Date().toISOString(), machine, root,
    coverage: found.coverage, discovery_errors: found.errors, repositories,
    summary: { worktrees: repositories.length, dirty: repositories.filter(r=>r.dirty).length,
      stashes: new Map(repositories.map(r=>[r.common_git_dir,r.stashes.length])).values().reduce((a,b)=>a+b,0),
      errors: found.errors.length + repositories.reduce((n,r)=>n+r.errors.length,0) },
    warnings: ["remote refs are cached; FETCH_HEAD mtime is not proof that origin/main is fresh",
      "unregistered nested clones and ignored file content are outside this inventory",
      "this report contains local paths and possibly private filenames: do not publish blindly"],
  };
}
export function wipCompare({ repo, ref, base = "origin/main" }) {
  if (!repo || !ref) throw new Error("wip compare requires --repo <path> --ref <ref>");
  repo = canon(repo);
  const errors = [];
  const resolve = name => {
    const result = git(repo, "rev-parse", "--verify", `${name}^{commit}`);
    if (!result.ok) errors.push({ ref: name, error: result.error });
    return result.ok ? result.value : null;
  };
  const baseOid = resolve(base), targetOid = resolve(ref);
  const result = { schema:"wip.compare/v1", observed_at:new Date().toISOString(), machine:os.hostname(), repo,
    base:{ ref:base, oid:baseOid }, target:{ ref, oid:targetOid }, errors };
  if (!baseOid || !targetOid) return result;
  function checked(name, args) {
    const v=git(repo,...args); if(!v.ok) errors.push({ name,error:v.error }); return v.ok?v.value:null;
  }
  const count=checked("ahead-behind",["rev-list","--left-right","--count",`${baseOid}...${targetOid}`]);
  const [behind,ahead]=count?count.split(/\s+/).map(Number):[null,null];
  const baseTree=checked("base-tree",["rev-parse",`${baseOid}^{tree}`]);
  const targetTree=checked("target-tree",["rev-parse",`${targetOid}^{tree}`]);
  const unique=checked("unique",["log","--format=%H","--no-merges",`${baseOid}..${targetOid}`]);
  const cherry=checked("patch-equivalence",["cherry",baseOid,targetOid]);
  const changed=checked("changed-files",["diff","--name-only",baseOid,targetOid]);
  result.structural={ behind,ahead, identical_tree:baseTree===targetTree,
    base_tree:baseTree,target_tree:targetTree, unique_commits:lines(unique),
    patch_equivalence:cherry===null?null:lines(cherry).map(x=>({ equivalent:x.startsWith("-"),commit:x.slice(2) })),
    changed_paths:lines(changed) };
  result.semantic={status:"not_assessed",reason:"test/behavior and intent equivalence require separate evidence; no automated claim"};
  return result;
}
