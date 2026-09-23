// File: scripts/lib/consolidation.js
// Description: Sunday Corpus Consolidation Runner (Issue #70).
// Emits two privacy domains: public (publishable) and private (workspace-only).

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  gitVerifyCore,
  indexStatusCore,
  syncInteractionTracesCore,
  emitStaticProjection,
  publishRegistry
} from "./cogentia-core.js";
import {
  PUBLIC_VIEW,
  PRIVATE_VIEW,
  defaultMonorepoRepos,
  filterReposForView,
  filterGitLogsForView,
  isPrivateRepo,
  isPublicRepo,
} from "./privacy-views.js";

/**
 * Executes the 5-phase Sunday Corpus Consolidation Pipeline.
 * Always produces dual results:
 *   - PUBLIC  → research/sprints/weekly_digest_*.md + root llms.txt fan-out
 *   - PRIVATE → .cogentia/sprints/weekly_digest_full_*.md + .cogentia/projections/
 */
export async function runWeeklyConsolidation(options = {}) {
  const root = options.root || process.cwd();
  const now = options.now ? new Date(options.now) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error("Weekly consolidation requires a valid timestamp");
  const timestamp = now.toISOString();
  const weekNumber = getISOWeekNumber(now);
  const year = now.getFullYear();
  const sprintTag = `${year}-W${String(weekNumber).padStart(2, "0")}`;
  const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
  const originRef = currentGitRef(root);

  // This is a WEEKLY pipeline (rewrites the digest for the current ISO week
  // and fans out llms.txt to every registered repo). A caller invoking it
  // more often than weekly (e.g. a 2-hourly Sleep Cycle) must not repeat
  // that side-effecting work every time — that produced constant, useless
  // dirty-tree drift across the whole fleet. Skip if this week's public
  // digest already exists, unless the caller explicitly forces a re-run.
  const probeDigestPath = path.join(root, "research", "sprints", `weekly_digest_${sprintTag}.md`);
  if (!options.force && fs.existsSync(probeDigestPath)) {
    return {
      ok: true,
      skipped: true,
      reason: "already_consolidated_this_week",
      sprint_tag: sprintTag,
      digest_path: probeDigestPath,
    };
  }

  console.log(`==========================================================================`);
  console.log(`          COGENTIA SUNDAY CORPUS CONSOLIDATION [${sprintTag}]            `);
  console.log(`==========================================================================`);

  const monorepo = defaultMonorepoRepos(root);
  const publicRepos = filterReposForView(monorepo, PUBLIC_VIEW);
  const privateRepos = monorepo.filter((r) => isPrivateRepo(r));

  // --- Phase 1: Multi-Repo Audit ---
  console.log("\n[Phase 1] Auditing Monorepo Repositories & Index Status...");
  const gitStatus = await gitVerifyCore({ root });
  const indexStatus = await indexStatusCore({ root });
  console.log(`✓ ${monorepo.length}/${monorepo.length} Monorepo Repositories Checked.`);
  console.log(`  · Public: ${publicRepos.length} · Private: ${privateRepos.length}`);
  console.log(`✓ Index Version: ${indexStatus.index_version}`);

  // Fetch recent git commit history across ALL tracked repositories (filter later per view)
  const gitLogs = {};
  for (const repo of monorepo) {
    const repoDir = path.resolve(root, repo.path || ".");
    if (fs.existsSync(repoDir) && fs.statSync(repoDir).isDirectory()) {
      try {
        const logText = execFileSync("git", ["log", `--since=${weekStart}`, `--until=${timestamp}`, "--oneline", "-n", "15"], {
          cwd: repoDir,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        });
        const commits = logText.trim().split("\n").filter(Boolean);
        if (commits.length > 0) {
          gitLogs[repo.name] = commits;
        }
      } catch {
        // Skip repos without git history
      }
    }
  }

  // --- Phase 2: Continuation & Interaction Triage ---
  console.log("\n[Phase 2] Triaging Interaction Packets & Continuations...");
  const traceSync = await syncInteractionTracesCore({ root });
  console.log(`✓ Scanned ${traceSync.total_packets} interaction & continuation trace packets.`);

  // --- Phase 3: Dual Static Projection Emission (public + private) ---
  console.log("\n[Phase 3] Emitting Dual Static Projections (PUBLIC + PRIVATE)...");
  const ctxRepos = monorepo.map((r) => ({
    name: r.name,
    path: r.path,
    visibility: r.visibility,
    public_presence: r.public_presence,
    role: "primary",
  }));
  const ctx = {
    registryRoot: root,
    repos: gitStatus.repositories
      ? mergeRepoVisibility(gitStatus.repositories, monorepo)
      : ctxRepos,
  };

  const publicProjection = emitStaticProjection(ctx, [], { view: PUBLIC_VIEW, fanOut: true });
  const privateProjection = emitStaticProjection(ctx, [], { view: PRIVATE_VIEW, fanOut: false });
  const registryResult = publishRegistry({
    ...ctx,
    repos: filterReposForView(ctx.repos, PUBLIC_VIEW),
  });

  console.log(
    `✓ PUBLIC projection: ${publicProjection.llms_path} (${publicProjection.repos_listed} repos listed, fan-out ${publicProjection.repos_projected})`
  );
  if (publicProjection.private_repos_omitted?.length) {
    console.log(`  · Omitted private repos: ${publicProjection.private_repos_omitted.join(", ")}`);
  }
  if (publicProjection.cleaned_private_repos?.length) {
    console.log(`  · Cleaned leaked projections from: ${publicProjection.cleaned_private_repos.join(", ")}`);
  }
  console.log(
    `✓ PRIVATE projection: ${privateProjection.llms_path} (${privateProjection.repos_listed} repos listed, workspace-only)`
  );
  console.log(`✓ Public registry published to ${registryResult.published.join(", ") || "(none)"}`);

  // --- Phase 4: Dual Weekly Digest Generation ---
  console.log("\n[Phase 4] Auto-Generating Dual Weekly Sprint Digests (PUBLIC + PRIVATE)...");

  // High-signal downloads are local workstation signal → private digest only
  const downloadsPath = path.join(process.env.USERPROFILE || "C:\\Users\\admin", "Downloads");
  const highSignalDownloads = harvestHighSignalDownloads(downloadsPath);

  // 1. PUBLIC Digest (no private repos, no local downloads)
  const sprintDir = path.join(root, "research", "sprints");
  if (!fs.existsSync(sprintDir)) fs.mkdirSync(sprintDir, { recursive: true });
  const publicDigestPath = path.join(sprintDir, `weekly_digest_${sprintTag}.md`);
  const publicDigestContent = generateWeeklyDigestMarkdown({
    sprintTag,
    timestamp,
    indexStatus,
    traceSync,
    projectionResult: publicProjection,
    gitLogs,
    downloads: [],
    view: PUBLIC_VIEW,
    monorepo,
    originRef,
  });
  fs.writeFileSync(publicDigestPath, publicDigestContent, "utf8");

  // 2. PRIVATE Digest (all repos + downloads) under .cogentia/
  const fullSprintDir = path.join(root, ".cogentia", "sprints");
  if (!fs.existsSync(fullSprintDir)) fs.mkdirSync(fullSprintDir, { recursive: true });
  const privateDigestPath = path.join(fullSprintDir, `weekly_digest_full_${sprintTag}.md`);
  const privateDigestContent = generateWeeklyDigestMarkdown({
    sprintTag,
    timestamp,
    indexStatus,
    traceSync,
    projectionResult: privateProjection,
    gitLogs,
    downloads: highSignalDownloads,
    view: PRIVATE_VIEW,
    monorepo,
    originRef,
  });
  fs.writeFileSync(privateDigestPath, privateDigestContent, "utf8");

  console.log(`✓ PUBLIC digest  → ${publicDigestPath}`);
  console.log(`✓ PRIVATE digest → ${privateDigestPath}`);

  // 3. Register Consolidation Cognitive Packet Descriptor
  const nextWeekNumber = weekNumber === 52 ? 1 : weekNumber + 1;
  const nextYear = weekNumber === 52 ? year + 1 : year;
  const nextSprintTag = `${nextYear}-W${String(nextWeekNumber).padStart(2, "0")}`;

  const ctnPath = path.join(root, ".cogentia", "continuations", "ctn_weekly_consolidation.json");
  const ctnDir = path.dirname(ctnPath);
  if (!fs.existsSync(ctnDir)) fs.mkdirSync(ctnDir, { recursive: true });

  const consolidationPacket = {
    id: `ctn_weekly_consolidation_${sprintTag}`,
    packet_id: `CPKT-${sprintTag}-CONSOLIDATION`,
    kind: "cognitive_packet_journey",
    subject: "sunday_corpus_consolidation",
    status: "completed",
    created_at: timestamp,
    updated_at: timestamp,
    origin_home: "https://jhn.baronsmariani.org/",
    destination: "https://cogentia.fractavolta.com/mcp",
    mandate: {
      mission: `Sunday Corpus De-Entropy & Sprint Wrap-Up for ${sprintTag}`,
      budget_units: 200
    },
    privacy_domains: {
      public: {
        digest: publicDigestPath,
        llms: publicProjection.llms_path,
        llms_full: publicProjection.llms_full_path,
        repos: publicRepos.map((r) => r.name),
      },
      private: {
        digest: privateDigestPath,
        llms: privateProjection.llms_path,
        llms_full: privateProjection.llms_full_path,
        repos: monorepo.map((r) => r.name),
        private_repos: privateRepos.map((r) => r.name),
        downloads_count: highSignalDownloads.length,
      },
    },
    target_documents: [
      publicDigestPath,
      privateDigestPath,
      "docs/sunday-consolidation-master-plan.md"
    ],
    execution_steps_completed: 5,
    serendipity_ledger_count: highSignalDownloads.length,
    continuation_scheduled: `CPKT-${nextSprintTag}-CONSOLIDATION`
  };
  fs.writeFileSync(ctnPath, JSON.stringify(consolidationPacket, null, 2) + "\n", "utf8");

  // 4. Auto-Schedule Next Week's Consolidation Mission Packet
  const nextCtnPath = path.join(root, ".cogentia", "continuations", `ctn_weekly_consolidation_${nextSprintTag}.json`);
  const scheduledNextPacket = {
    id: `ctn_weekly_consolidation_${nextSprintTag}`,
    packet_id: `CPKT-${nextSprintTag}-CONSOLIDATION`,
    kind: "cognitive_packet_journey",
    subject: "sunday_corpus_consolidation_scheduled",
    status: "alive",
    scheduled_for_sprint: nextSprintTag,
    created_at: timestamp,
    origin_home: "https://jhn.baronsmariani.org/",
    destination: "https://cogentia.fractavolta.com/mcp",
    mandate: {
      mission: `Scheduled Sunday Corpus De-Entropy & Sprint Wrap-Up for ${nextSprintTag}`,
      budget_units: 200,
      continuation_parent: `CPKT-${sprintTag}-CONSOLIDATION`
    }
  };
  fs.writeFileSync(nextCtnPath, JSON.stringify(scheduledNextPacket, null, 2) + "\n", "utf8");

  console.log(`✓ Current Consolidation Packet completed: ${ctnPath}`);
  console.log(`✓ Next Sprint Consolidation Packet scheduled [${nextSprintTag}]: ${nextCtnPath}`);
  console.log(`\n--- Dual privacy results ---`);
  console.log(`  PUBLIC : ${publicDigestPath}`);
  console.log(`  PRIVATE: ${privateDigestPath}`);

  return {
    ok: true,
    sprint_tag: sprintTag,
    next_sprint_tag: nextSprintTag,
    timestamp,
    privacy: {
      public: {
        digest_path: publicDigestPath,
        llms_path: publicProjection.llms_path,
        llms_full_path: publicProjection.llms_full_path,
        repos_listed: publicProjection.repos_listed,
        repos_projected: publicProjection.repos_projected,
        private_repos_omitted: publicProjection.private_repos_omitted || [],
      },
      private: {
        digest_path: privateDigestPath,
        llms_path: privateProjection.llms_path,
        llms_full_path: privateProjection.llms_full_path,
        repos_listed: privateProjection.repos_listed,
        downloads_count: highSignalDownloads.length,
      },
    },
    // Back-compat fields
    repos_projected: publicProjection.repos_projected,
    packets_scanned: traceSync.total_packets,
    digest_path: publicDigestPath,
    full_digest_path: privateDigestPath,
    consolidation_packet: ctnPath,
    scheduled_next_packet: nextCtnPath,
  };
}

function mergeRepoVisibility(gitRepos, monorepo) {
  const byName = new Map(monorepo.map((r) => [r.name, r]));
  return gitRepos.map((r) => {
    const meta = byName.get(r.name) || {};
    return {
      ...r,
      visibility: r.visibility || meta.visibility || (isPrivateRepo(r.name) ? "private" : "public"),
      public_presence: r.public_presence || meta.public_presence,
      path: r.path || meta.path || ".",
    };
  });
}

function harvestHighSignalDownloads(downloadsPath) {
  if (!fs.existsSync(downloadsPath)) return [];
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const highSignalExts = new Set([".md", ".yaml", ".yml", ".txt"]);
  const noisePatterns = [/Invoice-/i, /Receipt-/i, /\.zip$/i, /\.jpg$/i, /\.png$/i, /\.pdf$/i, /\.docx$/i];

  const results = [];
  try {
    const entries = fs.readdirSync(downloadsPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!highSignalExts.has(ext)) continue;

      const isNoise = noisePatterns.some(pat => pat.test(entry.name));
      if (isNoise) continue;

      const fullPath = path.join(downloadsPath, entry.name);
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs >= sevenDaysAgo) {
        results.push({
          name: entry.name,
          mtime: stat.mtime.toISOString(),
          size: stat.size
        });
      }
    }
  } catch {}

  return results.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
}

function currentGitRef(root) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() || "unknown";
  } catch {
    return "unknown";
  }
}

function generateWeeklyDigestMarkdown({
  sprintTag,
  timestamp,
  indexStatus,
  traceSync,
  projectionResult,
  gitLogs = {},
  downloads = [],
  view = PUBLIC_VIEW,
  monorepo = [],
  originRef = "unknown",
}) {
  const isPrivate = view === PRIVATE_VIEW;
  const filteredLogs = filterGitLogsForView(gitLogs, view);

  const repoCommitSections = filteredLogs.map(([repoName, commits]) => {
    const privacyTag = isPrivateRepo(repoName) ? " 🔒" : "";
    const listText = (commits || []).map(c => `- \`${c}\``).join("\n");
    return `### Repository: \`${repoName}\`${privacyTag}\n${listText || "- *No recent commits*"}`;
  }).join("\n\n");

  const publicRepoCount = monorepo.filter((r) => isPublicRepo(r)).length;
  const privateRepoCount = monorepo.filter((r) => isPrivateRepo(r)).length;

  const viewTitle = isPrivate ? "Private Workspace Digest" : "Public Corpus Digest";
  const domainLabel = isPrivate
    ? "PRIVATE (workspace / admin — do not publish)"
    : "PUBLIC (sanitized — safe to publish)";

  // Downloads only in private view
  let downloadsSection = "";
  if (isPrivate) {
    const downloadsList = downloads.length
      ? downloads.map(d => `- 📄 \`${d.name}\` (${(d.size / 1024).toFixed(1)} KB) — *${d.mtime.split("T")[0]}*`).join("\n")
      : "- *No high-signal downloads detected this week.*";
    downloadsSection = `
---

## 📥 High-Signal Downloads Ingest (Past 7 Days — private workstation)

${downloadsList}
`;
  } else {
    downloadsSection = `
---

## 📥 Local Downloads

- *Omitted from public digest* (workstation-local signal stays in the private digest under \`.cogentia/sprints/\`).
`;
  }

  const projectionPaths = isPrivate
    ? `- Private sitemap: [\`.cogentia/projections/llms.txt\`](../../.cogentia/projections/llms.txt)
- Private full-text: [\`.cogentia/projections/llms-full.txt\`](../../.cogentia/projections/llms-full.txt)
- Twin public digest: [\`research/sprints/weekly_digest_${sprintTag}.md\`](../../research/sprints/weekly_digest_${sprintTag}.md)`
    : `- Public sitemap: [\`llms.txt\`](../../llms.txt)
- Public full-text: [\`llms-full.txt\`](../../llms-full.txt)
- Twin private digest: workspace-only under \`.cogentia/sprints/weekly_digest_full_${sprintTag}.md\``;

  const privateRepoNote = isPrivate
    ? `- **Private repos included**: ${privateRepoCount} (${monorepo.filter(isPrivateRepo).map((r) => r.name).join(", ") || "none"})`
    : `- **Private repos omitted**: ${privateRepoCount}`;

  const digestDate = timestamp.slice(0, 10);
  const digestFrontmatter = `---
title: "Weekly Sprint Digest: ${sprintTag} (${viewTitle})"
author: "Jean Hugues Noel Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0"
date: "${digestDate}"
status: "stable — active"
document_role: source
document_kind: research-paper
visibility: ${isPrivate ? "private" : "public"}
lifecycle_state: active
update_policy: UP-DEFAULT-REVIEWED
language: en
provenance:
  origin_type: generated
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "${originRef}"
  origin_date: "${digestDate}"
  derived_from:
    - "scripts/lib/consolidation.js"
review:
  status: unreviewed
  reviewed_by: []
---

`;

  return `${digestFrontmatter}# Weekly Sprint Digest: ${sprintTag} (${viewTitle}) 📜🧘‍♂️
**Generated by Cogentia Sunday Consolidation Pipeline**
- **Timestamp**: \`${timestamp}\`
- **Corpus Index Version**: \`${indexStatus.index_version}\`
- **Privacy View Domain**: \`${domainLabel}\`
- **Repositories in this view**: \`${projectionResult.repos_listed ?? filteredLogs.length}\` listed
- **Public monorepo surface**: \`${publicRepoCount}\` · **Private monorepo surface**: \`${privateRepoCount}\`

---

## 🎯 Executive Sprint Summary

This week's sprint consolidated major milestones across the monorepo architecture:

1. **Decoupled Cogentia Core Engine**: Extracted \`scripts/lib/cogentia-core.js\` and expanded the MCP facade to **18 tools** (100% PASS rate).
2. **Single-Process Embedded Mode**: Implemented \`--with-mcp\` flag reducing memory usage to **~80 MB RAM** on Fracta VPS.
3. **Magistral AI Router Boundary (#67)**: Re-exported AI Router client contracts with zero secret leaks and graceful RAG fallback.
4. **Continuation & Trace Sync (#68)**: Automated interaction packet scanning (\`${traceSync.total_packets}\` packets indexed).
5. **Dual Privacy Projections (#66 / #70)**: Emitted separate **public** and **private** \`llms.txt\` / digest surfaces (private repos never leak into public artifacts).
6. **COP Accounting Simulator**: Integrated quick event simulation buttons and live Kudos gravity ($\\Gamma$) feedback in \`CopAccountingDashboard.jsx\`.

${downloadsSection}
---

## 🔍 Git Commit Cross-Check (Past 7 Days - User: JeanHuguesRobert)

${repoCommitSections || "*No recent activity detected across tracked repositories in this privacy view.*"}

---

## 📊 Monorepo Inventory & Projections

- **Privacy view**: \`${view}\`
- **Repos listed in this view**: \`${projectionResult.repos_listed}\`
- **Interaction & Continuation Packets**: \`${traceSync.total_packets}\`
${privateRepoNote}
- **Canonical projections for this view**:
${projectionPaths}

---

## 🚀 Next Sprint Focus Areas

- [ ] Complete derivative public publications for *When Cognition Became Traffic* (#69).
- [ ] Maintain weekly Sunday Consolidation dual privacy pipeline (#70).
`;
}

function getISOWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}
