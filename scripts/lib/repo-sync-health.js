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
