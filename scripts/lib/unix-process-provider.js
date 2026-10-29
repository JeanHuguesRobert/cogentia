/** Native Unix effecter for the existing semantic host.process.run capability.
 * Not an MCP surface; authorization belongs to host-capability-router.
 */
import { execFile } from 'node:child_process';
import { hostname, userInfo } from 'node:os';

export class UnixProcessProvider {
  constructor({ cwd = process.cwd(), timeoutMs = 15000, maxBuffer = 32768 } = {}) {
    this.cwd = cwd;
    this.timeoutMs = timeoutMs;
    this.maxBuffer = maxBuffer;
  }
  async start() {}
  async invoke(capability, args = {}) {
    if (capability !== 'host.process.run') {
      const err = new Error(`unsupported_capability: ${capability}`);
      err.error_class = 'unsupported_capability';
      throw err;
    }
    if (typeof args.command !== 'string' || !args.command.trim() || args.command.length > 4096) {
      throw new Error('command must contain 1..4096 characters');
    }
    const timeout = Math.max(1, Math.min(this.timeoutMs, Number(args.timeout_ms) || this.timeoutMs));
    return new Promise(resolve => {
      execFile('/bin/sh', ['-c', args.command], {
        cwd: this.cwd, timeout, maxBuffer: this.maxBuffer,
        encoding: 'utf8', windowsHide: true,
      }, (error, stdout, stderr) => {
        const user = userInfo();
        resolve({
          ok: !error, upstream_tool: 'unix.execFile',
          exit_code: error?.code ?? 0, signal: error?.signal || null,
          timeout: error?.killed === true, stdout, stderr,
          identity: { user: user.username, uid: user.uid, gid: user.gid, hostname: hostname() },
          error: error?.message || null,
        });
      });
    });
  }
}
