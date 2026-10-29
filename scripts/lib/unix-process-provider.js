/** Native Unix effecter for the existing semantic host.process.run capability.
 * Not an MCP surface; authorization belongs to host-capability-router.
 */
import { execFile } from 'node:child_process';
import { hostname, userInfo } from 'node:os';
import { extractShellJudgment } from './shell-judgment-signal.js';

export class UnixProcessProvider {
  constructor({ cwd = process.cwd(), timeoutMs = 15000, maxBuffer = 32768, maxConcurrent = 1, maxQueued = 32 } = {}) {
    this.cwd = cwd;
    this.timeoutMs = timeoutMs;
    this.maxBuffer = maxBuffer;
    this.maxConcurrent = maxConcurrent;
    this.maxQueued = maxQueued;
    this.active = 0;
    this.pending = [];

  }
  async start() {}
  enqueue(job) {
    if (this.active >= this.maxConcurrent && this.pending.length >= this.maxQueued) return Promise.reject(new Error('host_process_queue_full'));
    return new Promise((resolve,reject) => { this.pending.push({job,resolve,reject}); this.drain(); });
  }
  drain() {
    while (this.active < this.maxConcurrent && this.pending.length) {
      const task = this.pending.shift(); this.active++;
      Promise.resolve().then(task.job).then(task.resolve,task.reject).finally(() => { this.active--; this.drain(); });
    }
  }
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
    return this.enqueue(() => new Promise(resolve => {
      let timedOut = false;
      let timer;
      const child = execFile('setsid', ['/bin/sh', '-c', args.command], {
        cwd: this.cwd, timeout: 0, maxBuffer: this.maxBuffer,
        encoding: 'utf8', windowsHide: true,
      }, (error, stdout, stderr) => {
        clearTimeout(timer);
        if (error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') killGroup();
        const user = userInfo();
        let judgment = null;
        if (!error && !timedOut) {
          try { judgment = extractShellJudgment(stdout); }
          catch (parseError) { judgment = {status:'invalid_judgment_request', error:parseError.message}; }
        }
        resolve({
          ok: !error && !timedOut, upstream_tool: 'unix.execFile',
          exit_code: timedOut ? null : (typeof error?.code === 'number' ? error.code : (error ? null : 0)),
          signal: error?.signal || null,
          timeout: timedOut,
          output_truncated: error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER', stdout, stderr,
          identity: { user: user.username, uid: user.uid, gid: user.gid, hostname: hostname() },
          error: error?.message || null,
          ...(judgment ? { judgment } : {}),
        });
      });
      // setsid makes the shell lead an isolated session/process group.
      // Kill the group, not only the shell, so children cannot outlive timeout.
      const killGroup = () => {
        if (!child.pid) return;
        try { process.kill(-child.pid, 'SIGKILL'); }
        catch (error) { if (error.code !== 'ESRCH') throw error; }
      };
      timer = setTimeout(() => { timedOut = true; killGroup(); }, timeout);
    }));
  }
}
