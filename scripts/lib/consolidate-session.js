/**
 * Stable, effect-safe session envelope for `cogentia consolidate`.
 *
 * Consolidate remains a diagnostic. This helper makes that boundary explicit
 * for human and agent consumers: observations are sourced, proposed actions
 * are typed, and no action is ever executed while producing the report.
 */

export const CONSOLIDATE_SESSION_PROTOCOL = "cogentia.consolidate.session.v1";

const READ_ONLY = "read_only";
const LOCAL_WRITE = "local_write_requires_authorization";

function observation(id, source, count) {
  if (count === null) return { id, source, status: "not_observed", count };
  return { id, source, status: count > 0 ? "attention" : "clear", count };
}

function action(id, command, effect, reason) {
  return {
    id,
    command,
    effect,
    requires_authorization: effect !== READ_ONLY,
    execution: "not_run",
    reason,
  };
}

/** Return a deterministic-shape session envelope; `now` is injectable for tests. */
export function buildConsolidateSession(ctx, report, { now = new Date().toISOString() } = {}) {
  const generated = typeof report.generated?.changes === "number" ? report.generated.changes : null;
  const gaps = Array.isArray(report.gaps) ? report.gaps.length : (report.gaps_count || 0);
  const privacyLeaks = Array.isArray(report.privacy?.leaks) ? report.privacy.leaks.length : (report.privacy_leaks_count || 0);
  const continuations = Array.isArray(report.continuations) ? report.continuations.length : (report.active_continuations || 0);
  const autoSections = report.auto_sections?.issues?.length || 0;
  const trailLint = report.trail_lint?.issues?.length || 0;
  const metadataInvalid = report.metadata_audit?.invalid || 0;
  const continuationIndexBlocked = report.continuation_index?.blocked || 0;
  const substantiveWorktree = ["modified", "untracked", "added", "deleted", "renamed", "missing"]
    .reduce((total, kind) => total + (report.noise_summary?.[kind] || 0), 0);
  const gitDrift = Array.isArray(report.git) ? report.git.filter(repo => repo.behind || repo.ahead || repo.dirty_count).length : 0;

  const observations = [
    observation("generated_navigation", "corpus plan", generated),
    observation("document_gaps", "docs gaps", gaps),
    observation("privacy", "corpus privacy", privacyLeaks),
    observation("continuations", "continuation list", continuations),
    observation("auto_sections", "corpus verify", autoSections),
    observation("trail_lint", "docs trails", trailLint),
    observation("metadata", "metadata audit", metadataInvalid),
    observation("continuation_index", "corpus continuation index", continuationIndexBlocked),
    observation("worktree", "git noise plan", substantiveWorktree),
    observation("git_drift", "git verify", gitDrift),
  ];

  const proposedActions = [];
  if (generated) proposedActions.push(action("apply_generated_navigation", "node scripts/cogentia.js corpus apply", LOCAL_WRITE, "Generated navigation changes are pending review."));
  if (gaps) proposedActions.push(action("inspect_document_gaps", "node scripts/cogentia.js docs gaps --json", READ_ONLY, "Documents are absent from their repository index."));
  if (privacyLeaks) proposedActions.push(action("inspect_privacy", "node scripts/cogentia.js corpus privacy --json", READ_ONLY, "Public-view privacy findings require review."));
  if (continuations) proposedActions.push(action("inspect_continuations", "node scripts/cogentia.js continuation list --status alive --json", READ_ONLY, "Active judgment packets remain."));
  if (autoSections || trailLint) proposedActions.push(action("inspect_navigation_safety", "node scripts/cogentia.js corpus verify --json", READ_ONLY, "Generated navigation safety checks need inspection."));
  if (metadataInvalid) proposedActions.push(action("inspect_metadata", "npm run metadata:audit", READ_ONLY, "Metadata validation reported an invalid artifact."));
  if (continuationIndexBlocked) proposedActions.push(action("inspect_continuation_index", "node scripts/corpus-continuation-index.js", READ_ONLY, "The continuation index could not cover every repository."));
  if (substantiveWorktree) proposedActions.push(action("classify_worktree", "node scripts/cogentia.js git noise plan --json", READ_ONLY, "Substantive local changes need classification before any batch action."));
  if (gitDrift) proposedActions.push(action("inspect_git_drift", "node scripts/cogentia.js git verify --json", READ_ONLY, "Repository branches differ from their upstream."));

  return {
    protocol: CONSOLIDATE_SESSION_PROTOCOL,
    observed_at: now,
    read_only: true,
    scope: {
      view: "public",
      configured_repositories: (ctx.repos || []).map(repo => repo.name).sort(),
    },
    boundary: {
      actions_executed: [],
      external_effects: [],
      local_writes: [],
      note: "This envelope reports observations and proposes commands; it never runs a proposed command.",
    },
    diagnostics: {
      completed_sources: report.diagnostics?.completed_sources || [],
      over_budget_sources: (report.diagnostics?.completed_sources || [])
        .filter(source => source.status === "over_budget")
        .map(source => source.id),
    },
    observations,
    proposed_actions: proposedActions,
  };
}
