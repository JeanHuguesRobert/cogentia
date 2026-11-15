/** Native Unix effecter for the existing semantic host.process.run capability.
 * Not an MCP surface; authorization belongs to host-capability-router.
 */
import { execFile } from 'node:child_process';
import { hostname, userInfo } from 'node:os';
import { extractShellJudgment } from './shell-judgment-signal.js';
import { ISOLATED_UNIX_EXECUTOR_USER } from './unix-process-cop-custody.js';

export class UnixProcessProvider {
  constructor({ cwd = process.cwd(), timeoutMs = 120000, maxBuffer = 262144, maxConcurrent = 1, maxQueued = 32, isolatedUser = null } = {}) {
    if (isolatedUser !== null && isolatedUser !== ISOLATED_UNIX_EXECUTOR_USER)
      throw new TypeError('unsupported_isolated_unix_executor');
    this.isolatedUser = isolatedUser;
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
    if (typeof args.command !== 'string' || !args.command.trim() || args.command.length > 32768) {
      throw new Error('command must contain 1..32768 characters');
    }
    if ((args.execution_mode ?? 'normal') !== 'normal') {
      const err = new Error('super_requires_independent_privileged_executor');
      err.error_class = 'privileged_executor_unavailable';
      throw err;
    }
    const requested = args.timeout_ms == null ? this.timeoutMs : args.timeout_ms;
    if (!Number.isInteger(requested) || requested < 1) throw new Error('invalid timeout_ms');
    const timeout = Math.min(this.timeoutMs, requested);
    return this.enqueue(() => new Promise(resolve => {
      let timedOut = false;
      let timer;
      // Build a new session BEFORE sudo so the timeout can kill the whole
      // sudo + lower-privileged subprocess group. The MCP server retains
      // COP authority; only this shell runs as the isolated user.
      const commandArgs = this.isolatedUser
        ? ['sudo','-n','-u',this.isolatedUser,'--','/bin/sh','-c',args.command]
        : ['/bin/sh','-c',args.command];
      const child = execFile('setsid', commandArgs, {
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
          identity: { user: this.isolatedUser || user.username,
            uid: this.isolatedUser ? null : user.uid,
            gid: this.isolatedUser ? null : user.gid,
            hostname: hostname(), isolation: this.isolatedUser ? 'sudo-unprivileged' : 'none' },
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
