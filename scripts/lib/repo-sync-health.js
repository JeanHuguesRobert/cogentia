// Safe, intentionally redacted reconciliation health for operational receipts.
// Never include filenames, Git stderr/stdout, remote URLs or secret values.
const healthy = new Set(['CURRENT', 'FAST_FORWARDED', 'DRY_RUN']);
const nonBlocking = new Set(['SKIP_PRIVATE', 'SKIP_NO_ORIGIN']);
export function cleanSyncHealth(results) {
  const blocked = results.filter(x => !healthy.has(x.status) && !nonBlocking.has(x.status));
  return {
    status: blocked.length ? 'attention_required' : 'ok',
    inspected: results.length,
    blocked_count: blocked.length,
    blocked: blocked.map(x => ({
      repo: x.repo,
      status: x.status,
      ahead: Number.isInteger(x.ahead) ? x.ahead : null,
      behind: Number.isInteger(x.behind) ? x.behind : null,
    })),
  };
}
// Sleep-cycle "repos sync" has a different schema; preserve its status/receipt.
export function declaredSyncHealth(repos) {
  const blocked = repos.filter(x => !x.ok || (
    x.action !== 'skip_private' && x.action !== 'synced' &&
    x.action !== 'cloned' && x.action !== 'sync_dry_run' &&
    x.action !== 'clone_dry_run'
  ));
  return {
    status: blocked.length ? 'attention_required' : 'ok',
    inspected: repos.length,
    blocked_count: blocked.length,
    blocked: blocked.map(x => ({
      repo: x.repo,
      status: x.action || 'UNKNOWN',
      ahead: Number.isInteger(x.ahead) ? x.ahead : null,
      behind: Number.isInteger(x.behind) ? x.behind : null,
    })),
  };
}


/**
 * A fetched-but-blocked repository is not a completed synchronization.
 * Planned phases are distinct from real operational errors.
 */
export function assessSleepCycleCompletion({phases=[], repoSync=null}={}) {
  const blockedCount = Number.isSafeInteger(repoSync?.evidence?.health?.blocked_count)
    ? Math.max(0,repoSync.evidence.health.blocked_count) : 0;
  const syncNeedsAttention = blockedCount>0 ||
    ['completed_with_blocks','completed_with_errors','failed'].includes(repoSync?.status) ||
    (repoSync?.evidence?.cached===true &&
     ['completed_with_blocks','completed_with_errors','failed'].includes(repoSync.evidence.last_status));
  const partialPhases = phases.some(phase =>
    ['PARTIAL','BLOCKED_SECURITY','failed','completed_with_blocks','completed_with_errors','missing']
      .includes(phase.status));
  const plannedCount = phases.filter(phase => phase.status==='planned').length;
  return {
    status: syncNeedsAttention||partialPhases||plannedCount>0 ? 'completed_partial' : 'completed',
    attention_required:syncNeedsAttention||partialPhases,
    repo_sync_attention_required:syncNeedsAttention,
    repo_sync_blocked_count:blockedCount,
    planned_count:plannedCount
  };
}


/**
 * A fresh blocked sweep should be visible to the systemd service supervisor.
 * A cached historical block remains in COP evidence, but does not mark each
 * two-hourly non-sweep run as a new failed attempt.
 */
export function sleepCycleCliExitCode(result){
 if(!result?.attention_required)return 0;
 if(result?.repoSync?.status==='deferred_by_cadence'){
  const otherIssue=(result.phases||[]).some(p=>p.name!=='repo_sync' &&
    ['PARTIAL','BLOCKED_SECURITY','failed','completed_with_blocks','completed_with_errors','missing'].includes(p.status));
  return otherIssue?1:0;
 }
 return 1;
}
