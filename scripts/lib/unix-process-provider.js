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
    const requested = args.timeout_ms == null ? this.timeoutMs : args.timeout_ms;
    if (!Number.isInteger(requested) || requested < 1) throw new Error('invalid timeout_ms');
    const timeout = Math.min(this.timeoutMs, requested);
    return new Promise(resolve => {
      let timedOut = false;
      let timer;
      const child = execFile('/bin/sh', ['-c', args.command], {
        cwd: this.cwd, timeout: 0, maxBuffer: this.maxBuffer,
        encoding: 'utf8', windowsHide: true, detached: true,
      }, (error, stdout, stderr) => {
        clearTimeout(timer);
        if (error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') killGroup();
        const user = userInfo();
        resolve({
          ok: !error, upstream_tool: 'unix.execFile',
          exit_code: typeof error?.code === 'number' ? error.code : (error ? null : 0),
          signal: error?.signal || null,
          timeout: timedOut,
          output_truncated: error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER', stdout, stderr,
          identity: { user: user.username, uid: user.uid, gid: user.gid, hostname: hostname() },
          error: error?.message || null,
        });
      });
      // A detached child leads its own process group on Unix. Terminate the
      // group, not only /bin/sh, so children cannot continue after timeout.
      const killGroup = () => {
        if (!child.pid) return;
        try { process.kill(-child.pid, 'SIGKILL'); }
        catch (error) { if (error.code !== 'ESRCH') throw error; }
      };
      timer = setTimeout(() => { timedOut = true; killGroup(); }, timeout);
      timer.unref();
    });
  }
}
