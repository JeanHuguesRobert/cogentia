/**
 * Client-side adapter for the root-owned Cogentia super broker.
 *
 * This is an injection seam for a trusted, OS-isolated process. Do not
 * instantiate in the ubuntu MCP / normal shell runtime: that runtime is not
 * allowed to read the broker socket or the mandate credentials.
 */
import net from 'node:net';

const DEFAULT_SOCKET = '/run/cogentia-super/broker.sock';
function denied(message) {
  const error = new Error(message);
  error.error_class = 'super_authority_unavailable';
  return error;
}

export function createSuperSocketExecutor({ socketPath = DEFAULT_SOCKET, credentialResolver, connect = net.createConnection } = {}) {
  if (typeof credentialResolver !== 'function') throw denied('trusted_credential_resolver_required');
  return Object.freeze({
    async invoke({ command, timeout_ms = 120000, actor, mandate, target, payload_hash } = {}) {
      if (typeof command !== 'string' || !command.trim() || Buffer.byteLength(command, 'utf8') > 32768
        || !Number.isInteger(timeout_ms) || timeout_ms < 1 || timeout_ms > 120000
        || !actor || !mandate || !target || !payload_hash) {
        throw denied('invalid_governed_super_request');
      }
      const credentials = await credentialResolver(Object.freeze({ actor, mandate, target, payload_hash, execution_mode: 'super' }));
      // Only trusted code can supply credentials. No script, tool request,
      // environment variable or arbitrary returned verdict is accepted.
      if (!credentials || typeof credentials.id !== 'string' || !credentials.id
        || typeof credentials.secret !== 'string' || !/^[a-f0-9]{64}$/.test(credentials.secret)
        || credentials.actor !== actor || credentials.mandate !== mandate) {
        throw denied('no_trusted_super_credential');
      }
      const payload = JSON.stringify({
        op: 'run', execution_mode: 'super', script: command,
        timeout_ms, id: credentials.id, secret: credentials.secret,
        actor, mandate,
      }) + '\n';
      return new Promise((resolve, reject) => {
        const client = connect(socketPath);
        let output = '';
        let settled = false;
        const settle = (err, value) => {
          if (settled) return;
          settled = true;
          client.destroy();
          if (err) reject(err);
          else resolve(value);
        };
        client.setTimeout(timeout_ms + 10_000, () => settle(denied('broker_timeout')));
        client.on('connect', () => client.write(payload));
        client.on('data', buffer => {
          output += buffer.toString('utf8');
          if (output.length > 600_000) return settle(denied('broker_response_too_large'));
          const boundary = output.indexOf('\n');
          if (boundary < 0) return;
          try {
            const response = JSON.parse(output.slice(0, boundary));
            if (!response || typeof response.ok !== 'boolean') throw denied('invalid_broker_receipt');
            settle(null, response);
          } catch (error) {
            settle(error);
          }
        });
        client.on('error', error => settle(error));
        client.on('end', () => {
          if (!settled) settle(denied('incomplete_broker_receipt'));
        });
      });
    },
  });
}
