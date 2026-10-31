/** Core EXPOSE preparation for the semantic host.process.run capability. */
import { attachExposePacket, buildEffectPayload } from './side-effect-authorization.js';

export function prepareHostProcessRun({ command, timeout_ms, target, provider, execution_mode = "normal" } = {}) {
  if (typeof command !== 'string' || !command.trim() || command.length > 32768) {
    throw new Error('command must contain 1..32768 characters');
  }
  if (!provider || typeof provider !== 'string') throw new Error('provider is required');
  if (!target || typeof target !== 'string') throw new Error('target is required');
  if (timeout_ms != null && (!Number.isInteger(timeout_ms) || timeout_ms < 1 || timeout_ms > 120000)) {
    throw new Error('timeout_ms must be 1..120000');
  }
  if (!["normal", "super"].includes(execution_mode)) throw new Error("invalid execution_mode");
  const payload = buildEffectPayload('host.process.run', { command, timeout_ms, execution_mode }, { target, provider });
  return attachExposePacket({
    kind: 'cogentia.host_process_prepare/v1',
    action_class: 'host.process.run',
    target: { node: target, path: null },
    payload,
    exposed_mutation: { command, timeout_ms: timeout_ms ?? 120000, execution_mode, target, provider },
    phase: 'EXPOSE',
    note: 'Preparation only. Does not execute. Side-effect grant bound to the exact payload is required.',
  });
}
