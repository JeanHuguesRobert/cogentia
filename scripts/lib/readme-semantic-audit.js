import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const REVIEW_BLOCK = "readme_review";
const EXCLUDED_DIRECTORIES = new Set([".git", ".cogentia", "node_modules", "dist", "build", "coverage", ".next"]);

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function splitFrontmatter(text) {
  const match = text.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n?)/);
  if (!match) return null;
  return { opening: match[1], yaml: match[2], closing: match[3], body: text.slice(match[0].length) };
}

/**
 * Remove only Cogentia's review-control block. Its edits must not invalidate
 * the review of the README which contains it.
 */
export function stripReadmeReviewMetadata(text) {
  const frontmatter = splitFrontmatter(text);
  if (!frontmatter) return text;
  const yaml = frontmatter.yaml.replace(/^readme_review:\r?\n(?:^[ \t].*(?:\r?\n|$))*/m, "").replace(/\r?\n$/, "");
  if (!yaml.trim()) return frontmatter.body;
  return `${frontmatter.opening}${yaml}${frontmatter.closing}${frontmatter.body}`;
}

export function readmeReviewMetadata(text) {
  const frontmatter = splitFrontmatter(text);
  if (!frontmatter) return null;
  const block = frontmatter.yaml.match(/^readme_review:\r?\n((?:^[ \t].*(?:\r?\n|$))*)/m);
  if (!block) return null;
  const values = {};
  for (const line of block[1].split(/\r?\n/)) {
    const match = line.match(/^\s{2}([A-Za-z0-9_]+):\s*(.*?)\s*$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^"|"$/g, "");
  }
  return Object.keys(values).length ? values : null;
}

export function updateReadmeReviewMetadata(text, metadata) {
  const lines = [
    "readme_review:",
    `  version: ${Number(metadata.version || 1)}`,
    `  authority: ${JSON.stringify(metadata.authority || "derived")}`,
    `  reviewed_at: ${JSON.stringify(metadata.reviewed_at)}`,
    `  reviewed_commit: ${JSON.stringify(metadata.reviewed_commit || "")}`,
    `  scope: ${JSON.stringify(metadata.scope)}`,
    `  input_fingerprint: ${JSON.stringify(metadata.input_fingerprint)}`,
  ];
  const frontmatter = splitFrontmatter(text);
  if (!frontmatter) return `---\n${lines.join("\n")}\n---\n${text}`;
  const yaml = frontmatter.yaml.replace(/^readme_review:\r?\n(?:^[ \t].*(?:\r?\n|$))*/m, "").replace(/\r?\n$/, "");
  return `${frontmatter.opening}${yaml}${yaml ? "\n" : ""}${lines.join("\n")}${frontmatter.closing}${frontmatter.body}`;
}

function walkFiles(root, relative = "") {
  const current = path.join(root, relative);
  const entries = fs.readdirSync(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) files.push(...walkFiles(root, path.join(relative, entry.name)));
      continue;
    }
    if (entry.isFile()) files.push(path.join(relative, entry.name));
  }
  return files;
}

/**
 * A deterministic, locality-preserving snapshot. It is deliberately bytewise
 * for now: cosmetic filtering is a later, explicitly versioned policy.
 */
export function readmeReviewInputSnapshot(readme) {
  const scopeRelative = path.dirname(readme.path).replace(/\\/g, "/");
  const scope = scopeRelative === "." ? "." : scopeRelative;
  const scopeRoot = path.join(readme.repo_root, scopeRelative === "." ? "" : scopeRelative);
  const entries = walkFiles(scopeRoot)
    .sort((a, b) => a.localeCompare(b))
    .map(relative => {
      const fullPath = path.join(scopeRoot, relative);
      let content = fs.readFileSync(fullPath);
      if (path.basename(fullPath).toLowerCase() === "readme.md") content = Buffer.from(stripReadmeReviewMetadata(content.toString("utf8")), "utf8");
      return { path: relative.replace(/\\/g, "/"), digest: sha256(content) };
    });
  return {
    version: 1,
    scope,
    files: entries.length,
    fingerprint: sha256(entries.map(entry => `${entry.path}\0${entry.digest}`).join("\n")),
  };
}

export function readmeReviewState(readme) {
  const text = fs.readFileSync(readme.full_path, "utf8");
  const metadata = readmeReviewMetadata(text);
  const snapshot = readmeReviewInputSnapshot(readme);
  const current = metadata?.input_fingerprint === snapshot.fingerprint && metadata?.scope === snapshot.scope;
  return {
    status: current ? "already_reviewed" : "review_required",
    metadata,
    snapshot,
  };
}

function isLocalReference(value) {
  return value && !/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(value);
}

function isApplicationRoute(value) {
  return /^(?:wiki|api|propositions?|ask|health)(?:\/|$)/i.test(String(value));
}

function resolveLocalReference(repoRoot, readmePath, value, { allowRepoRootFallback = false, allowWorkspaceRootFallback = false } = {}) {
  const clean = String(value).split(/[?#]/, 1)[0].replace(/\\/g, "/");
  if (!isLocalReference(clean)) return null;
  if (isApplicationRoute(clean)) return { path: clean, exists: true, resolution: "application_route" };
  const target = path.resolve(path.dirname(readmePath), clean);
  const relative = path.relative(repoRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  if (fs.existsSync(target) || !allowRepoRootFallback) return { path: relative.replace(/\\/g, "/"), exists: fs.existsSync(target), resolution: "relative" };
  const rootTarget = path.resolve(repoRoot, clean);
  const rootRelative = path.relative(repoRoot, rootTarget);
  if (!rootRelative.startsWith("..") && !path.isAbsolute(rootRelative) && fs.existsSync(rootTarget)) {
    return { path: rootRelative.replace(/\\/g, "/"), exists: true, resolution: "repo_root" };
  }
  if (allowWorkspaceRootFallback) {
    const workspaceRoot = path.resolve(repoRoot, "..");
    const qualifiedParts = clean.split("/");
    if (qualifiedParts.length >= 3 && qualifiedParts[0] === "JeanHuguesRobert") {
      const qualifiedTarget = path.join(workspaceRoot, ...qualifiedParts.slice(1));
      if (fs.existsSync(qualifiedTarget)) {
        return { path: qualifiedParts.slice(1).join("/"), exists: true, resolution: "workspace_qualified" };
      }
    }
    const workspaceTarget = path.resolve(workspaceRoot, clean);
    const workspaceRelative = path.relative(workspaceRoot, workspaceTarget);
    if (!workspaceRelative.startsWith("..") && !path.isAbsolute(workspaceRelative) && fs.existsSync(workspaceTarget)) {
      return { path: workspaceRelative.replace(/\\/g, "/"), exists: true, resolution: "workspace_root" };
    }
  }
  return { path: relative.replace(/\\/g, "/"), exists: false, resolution: "relative" };
}

function markdownLinks(text) {
  return [...text.matchAll(/\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map(match => match[1]);
}

function inlineFileReferences(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let section = "";
  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) section = heading[1];
    sections.push(section);
  }
  return [...text.matchAll(/`([^`\n]+)`/g)]
    .map(match => {
      const value = match[1].trim();
      const line = text.slice(0, match.index).split(/\r?\n/).length - 1;
      const lineText = lines[line]?.trim() || "";
      return { value, context: `${sections[line] || ""}\n${lineText}`.trim(), insideMarkdownLinkLabel: /\[[^\]]*`[^`]+`[^\]]*\]\(/.test(lineText) };
    })
    // A bare filename is often a conceptual name (for example cogentia.js).
    // Executable claims are collected independently from commands below.
    .filter(({ value, insideMarkdownLinkLabel }) => !insideMarkdownLinkLabel && /(?:\/|\\)/.test(value) && (isApplicationRoute(value) || /\.(?:md|ya?ml|json|js|mjs|nox|tsv)$/i.test(value)))
    .filter(({ value }) => !/^\.[A-Za-z0-9]+$/.test(value) && !/[<>{}*?]/.test(value));
}

function expectedAbsentReference(context) {
  return /\b(?:ignored|local only|create|creating|will create|may need|or equivalent|example|template|placeholder|historical|retired|superseded|short list)\b/i.test(context);
}

function declaredCommands(text, repoRoot, readmePath) {
  const packagePath = path.join(repoRoot, "package.json");
  let scripts = {};
  try { scripts = JSON.parse(fs.readFileSync(packagePath, "utf8")).scripts || {}; } catch {}
  const commands = [];
  let section = "";
  let recentNarrative = "";
  for (const raw of text.split(/\r?\n/)) {
    const heading = raw.match(/^#{1,6}\s+(.+)$/);
    if (heading) section = heading[1];
    if (!/^\s*(?:[$>]|node|npm|pnpm)\b/.test(raw)) recentNarrative = `${recentNarrative}\n${raw}`.slice(-800);
    const command = raw.trim().replace(/^[$>]\s*/, "").split(/\s+#/, 1)[0].trim();
    if (!/^(?:node|npm|pnpm)\b/.test(command)) continue;
    const historical = /\b(?:historical|retired|superseded)\b/i.test(section)
      || /\b(?:historical|retired|superseded|not runnable)\b/i.test(recentNarrative);
    const prospective = /\b(?:intended|planned|future|may be introduced|not yet available)\b/i.test(section)
      || /\b(?:intended|planned|future|may be introduced|not yet available)\b/i.test(recentNarrative);
    const run = command.match(/^(?:npm|pnpm)\s+run\s+([^\s]+)/);
    if (run) {
      commands.push({ command, kind: "package_script", target: run[1], status: scripts[run[1]] ? "declared" : "missing", historical, prospective });
      continue;
    }
    const node = command.match(/^node\s+([^\s]+)/);
    if (node && !node[1].startsWith("-")) {
      const repoTarget = path.resolve(repoRoot, node[1]);
      const readmeTarget = path.resolve(path.dirname(readmePath), node[1]);
      const target = fs.existsSync(repoTarget) ? repoTarget : readmeTarget;
      commands.push({ command, kind: "node_file", target: node[1], status: fs.existsSync(target) ? "declared" : "missing", resolution: target === readmeTarget ? "readme_directory" : "repo_root", historical, prospective });
      continue;
    }
    commands.push({ command, kind: "unparsed", status: "unverified", historical, prospective });
  }
  return commands;
}

function temporalCues(text) {
  const cues = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (/\b(?:current|currently|today|now|not yet|planned|will|future|20\d{2})\b/i.test(line)) {
      cues.push({ line: index + 1, text: line.trim().slice(0, 240) });
    }
  }
  return cues;
}

/**
 * Collect reproducible evidence about README assertions without deciding their
 * editorial truth. External state and prose claims remain judgment inputs.
 */
export function auditReadmeSemanticEvidence(readme) {
  const text = fs.readFileSync(readme.full_path, "utf8");
  const candidates = [
    ...markdownLinks(text).map(value => ({ value, kind: "markdown_link", allowRepoRootFallback: false })),
    ...inlineFileReferences(text).map(({ value, context }) => ({ value, context, kind: "inline_file_reference", allowRepoRootFallback: true, allowWorkspaceRootFallback: true })),
  ].filter(candidate => !/\s/.test(candidate.value) && !/^(?:node|npm|pnpm)\b/.test(candidate.value));
  const uniqueCandidates = [...new Map(candidates.map(candidate => [candidate.value, candidate])).values()];
  const references = uniqueCandidates.map(({ value, context, kind, allowRepoRootFallback, allowWorkspaceRootFallback }) => {
    const resolution = resolveLocalReference(readme.repo_root, readme.full_path, value, { allowRepoRootFallback, allowWorkspaceRootFallback });
    if (!resolution) return null;
    return {
      reference: value,
      kind,
      ...(context ? { context, expected_absent: expectedAbsentReference(context) } : {}),
      ...resolution,
    };
  }).filter(Boolean);
  const commands = declaredCommands(text, readme.repo_root, readme.full_path);
  const brokenReferences = references.filter(reference => reference.path && !reference.exists && !reference.expected_absent);
  const missingCommands = commands.filter(command => command.status === "missing" && !command.historical && !command.prospective);
  return {
    repo: readme.repo,
    path: readme.path,
    local_references: references,
    commands,
    temporal_cues: temporalCues(text),
    findings: {
      broken_local_references: brokenReferences,
      missing_commands: missingCommands,
      // Temporal language is a review cue, not a contradiction. It must not
      // create a continuation by itself: that would turn ordinary prose into
      // a permanently noisy queue.
      requires_judgment: brokenReferences.length > 0 || missingCommands.length > 0,
    },
  };
}
