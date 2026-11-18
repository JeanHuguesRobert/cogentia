/** Native Unix effecter for the existing semantic host.process.run capability.
 * Not an MCP surface; authorization belongs to host-capability-router.
 */
import { execFile } from 'node:child_process';
import { hostname, userInfo } from 'node:os';
import { extractShellJudgment } from './shell-judgment-signal.js';

// MCP is a long-lived service with service-specific GitHub credentials and
// web proxy settings. Do not carry that polluted process environment into a
// normal *operator shell*: gh must use the operator's existing hosts.yml,
// and direct network calls should not inherit an unrelated service proxy.
// The MCP service itself retains all of its own environment and credentials.
export function operatorShellEnvironment(env = process.env) {
  const child = { ...env };
  for (const name of [
    'GH_TOKEN', 'GITHUB_TOKEN', 'GH_ENTERPRISE_TOKEN', 'GITHUB_ENTERPRISE_TOKEN',
    'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY',
    'http_proxy', 'https_proxy', 'all_proxy',
  ]) delete child[name];
  return child;
}

export class UnixProcessProvider {
  constructor({ cwd = process.cwd(), timeoutMs = 120000, maxBuffer = 262144, maxConcurrent = 1, maxQueued = 32 } = {}) {
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
      // Act as the authenticated service operator; the effective COP
      // mandate governs *which acts* are lawful, not a prophylactic UID split.
      // Keep the timeout process group so descendants cannot outlive the Act.
      const commandArgs = ['/bin/sh','-c',args.command];
      const child = execFile('setsid', commandArgs, {
        cwd: this.cwd, timeout: 0, maxBuffer: this.maxBuffer,
        env: operatorShellEnvironment(),
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
          identity: { user: user.username, uid: user.uid, gid: user.gid,
            hostname: hostname(), isolation: 'none' },
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
