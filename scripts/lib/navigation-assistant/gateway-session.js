/** One bounded, correlated gateway session; useful for a delegated John operation. */
export async function createGatewaySession(endpoint, { WebSocketClass = WebSocket, timeoutMs = 10000 } = {}) {
  const socket = new WebSocketClass(endpoint);
  const pending = new Map();
  let sequence = 0;
  let closed = false;
  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Gateway connection timeout')), timeoutMs);
    socket.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Gateway connection failed')); }, { once: true });
  });
  socket.addEventListener('message', event => {
    let msg; try { msg = JSON.parse(String(event.data)); } catch { return; }
    const job = pending.get(msg.id);
    if (!job) return;
    pending.delete(msg.id); clearTimeout(job.timer);
    if (msg.error) {
      const error = new Error(msg.error.message || 'Gateway RPC failed');
      error.code = msg.error.code;
      job.reject(error);
    } else job.resolve(msg.result);
  });
  const failPending = () => {
    closed = true;
    for (const job of pending.values()) { clearTimeout(job.timer); job.reject(new Error('Gateway disconnected')); }
    pending.clear();
  };
  socket.addEventListener('close', failPending);
  try { await ready; } catch (error) { socket.close(); throw error; }
  return {
    async call(method, params = {}) {
      if (closed || socket.readyState !== WebSocketClass.OPEN) throw new Error('Gateway is disconnected');
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Gateway RPC timeout: ${method}`)); }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
      });
    },
    async withTabLease(browserId, tabId, operation, ttlMs = 30000) {
      if (!Number.isInteger(tabId) || tabId < 0) throw new Error('Explicit integer tabId required');
      await this.call('tabs.lease.acquire', { browser_instance_id: browserId, tabId, ttlMs });
      try { return await operation(this); }
      finally { try { await this.call('tabs.lease.release', { browser_instance_id: browserId, tabId }); } catch { /* lease expires */ } }
    },
    close() { closed = true; failPending(); socket.close(); },
  };
}
