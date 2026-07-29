import { spawn } from "node:child_process";

/** CREATE_NO_WINDOW — avoid visible console when spawning from a service or scheduler */
export const CREATE_NO_WINDOW = 0x08000000;

/**
 * CREATE_BREAKAWAY_FROM_JOB — allow child to outlive parent Job Object (Task Scheduler / some shells).
 * Only works when the parent job allows breakaway; otherwise ignored/fails soft at OS level.
 */
export const CREATE_BREAKAWAY_FROM_JOB = 0x01000000;

/**
 * Spawn without a visible console on Windows.
 * Use stdio "ignore" on win32 — piped stdio can still flash when the parent is LocalSystem.
 *
 * @param {object} [options]
 * @param {boolean} [options.breakawayFromJob] When true on win32, OR in CREATE_BREAKAWAY_FROM_JOB
 *   (useful for detached one-shot starters so the child can survive parent exit).
 */
export function spawnHeadless(command, args, options = {}) {
  const win32 = process.platform === "win32";
  const stdio = options.stdio ?? (win32 ? "ignore" : ["ignore", "pipe", "pipe"]);
  const { breakawayFromJob, creationFlags: callerFlags, ...rest } = options;
  const spawnOptions = {
    ...rest,
    stdio,
    windowsHide: options.windowsHide !== false,
    detached: options.detached ?? false,
  };
  if (win32) {
    let flags = Number(callerFlags || 0) | CREATE_NO_WINDOW;
    if (breakawayFromJob || options.detached) {
      flags |= CREATE_BREAKAWAY_FROM_JOB;
    }
    spawnOptions.creationFlags = flags;
  }
  return spawn(command, args, spawnOptions);
}
