/**
 * Windows PowerShell effecter over an existing configured SSH alias (#318).
 * Remote execution is admitted by the host router/COP, never by this provider.
 * Only the registered ThinkPad target is supported: no generic SSH escape hatch.
 */
import { execFile as nodeExecFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(nodeExecFile);
const WINDOWS_TARGETS = Object.freeze({
  'node:i7-thinkpad-jhr': Object.freeze({alias:'thinkpad', hostname:'i7-thinkpad-jhr'}),
});

function failure(message, error_class) {
  return Object.assign(new Error(message), {error_class});
}

export class WindowsSshProcessProvider {
  constructor({ execFile = run, timeoutMs = 120000, maxBuffer = 262144 } = {}) {
    this.execFile = execFile;
    this.timeoutMs = timeoutMs;
    this.maxBuffer = maxBuffer;
  }
  async start() {}
  async stop() {}
  async invoke(capability, args = {}) {
    if (capability !== 'host.process.run') throw failure('unsupported_capability', 'unsupported_capability');
    const { command, target } = args;
    if (typeof command !== 'string' || !command.trim() || command.length > 32768)
      throw failure('command must contain 1..32768 characters', 'invalid_command');
    if ((args.execution_mode ?? 'normal') !== 'normal')
      throw failure('super_requires_independent_privileged_executor', 'privileged_executor_unavailable');
    const route = WINDOWS_TARGETS[target];
    if (!route) throw failure(`target_provider_mismatch: windows-ssh does not route ${target}`, 'target_provider_mismatch');
    const timeout = args.timeout_ms ?? this.timeoutMs;
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > this.timeoutMs)
      throw failure('invalid timeout_ms', 'invalid_timeout_ms');
    const prefix = ['-n', '-T', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', route.alias];
    const execOptions = { timeout, maxBuffer:this.maxBuffer, windowsHide:true, encoding:'utf8' };
    // Attest remote identity BEFORE even sending command text.
    let host;
    try { host = (await this.execFile('ssh', [...prefix, 'hostname'], execOptions)).stdout.trim(); }
    catch (error) { throw failure(`remote_host_probe_failed: ${error.message}`, 'remote_host_probe_failed'); }
    if (host.toLowerCase() !== route.hostname)
      throw failure(`remote_host_mismatch: expected ${route.hostname}, observed ${host}`, 'remote_host_mismatch');

    const encoded = Buffer.from(command, 'utf16le').toString('base64');
    const psCommand = `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`;
    try {
      const result = await this.execFile('ssh', [...prefix, psCommand], execOptions);
      return { ok:true, upstream_tool:'ssh.powershell', stdout:result.stdout,
        stderr:result.stderr, exit_code:0, timeout:false,
        identity:{hostname:host, os:'windows', alias:route.alias} };
    } catch (error) {
      return { ok:false, upstream_tool:'ssh.powershell', stdout:error.stdout || '',
        stderr:error.stderr || '', exit_code:Number.isInteger(error.code) ? error.code : null,
        timeout:error.killed === true || error.code === 'ETIMEDOUT',
        identity:{hostname:host, os:'windows', alias:route.alias}, error:error.message };
    }
  }
}
