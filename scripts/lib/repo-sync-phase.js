// File: scripts/lib/repo-sync-phase.js
// Description: Sleep Cycle phase wrapper around `cogentia.js repos sync`.
//
// Design choice: this phase shells out to the same CLI command an operator
// would invoke on demand (`node scripts/cogentia.js repos sync --json`)
// instead of importing internals from cogentia.js. cogentia.js is a CLI
// entrypoint, not a library module, and this keeps the on-demand and
// automatic paths as literally the same command rather than two
// implementations that can drift apart.
//
// Conservative by construction: never discards dirty local changes, never
// syncs private/confidential repos unless explicitly asked, and never throws
// past this phase — a sync failure is reported as a failed phase, not a
// crashed sleep cycle.

import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COGENTIA_CLI = path.join(__dirname, "..", "cogentia.js");

/**
 * Run `cogentia.js repos sync --json` as a child process and return a
 * Sleep-Cycle-phase-shaped result.
 *
 * @param {Object} [options]
 * @param {string} [options.repo="all"] - repo name or "all"
 * @param {boolean} [options.includePrivate=false]
 * @param {number} [options.timeoutMs=600000] - a full multi-repo network
 *   sync genuinely takes minutes, not seconds; default matches that reality
 * @returns {Promise<{status: string, evidence: Object|null, error: string|null}>}
 */
export async function runRepoSyncPhase(options = {}) {
  const repo = options.repo || "all";
  const args = [COGENTIA_CLI, "repos", "sync", "--repo", repo, "--json"];
  if (options.includePrivate) args.push("--include-private");

  return new Promise((resolve) => {
    execFile(
      process.execPath,
      args,
      { timeout: options.timeoutMs ?? 10 * 60 * 1000, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          resolve({
            status: "failed",
            evidence: null,
            error: error.killed ? "repo_sync_timed_out" : (stderr.trim() || error.message),
          });
          return;
        }

        try {
          const parsed = JSON.parse(stdout);
          resolve({
            status: parsed.ok ? "completed" : "completed_with_errors",
            evidence: parsed,
            error: null,
          });
        } catch (parseError) {
          resolve({
            status: "failed",
            evidence: null,
            error: `unparseable_output: ${parseError.message}`,
          });
        }
      }
    );
  });
}
