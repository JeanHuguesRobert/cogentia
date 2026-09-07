// Version 1.8.0 publishes its implementation under dist/ while declaring a
// stale root `main` entry.  Import the published ESM implementation directly.
import { JSONRPCClient, JSONRPCServer } from "json-rpc-2.0/dist/index.js";

export function createRpcPeer(send, handlers = {}) {
  const server = new JSONRPCServer();
  for (const [method, handler] of Object.entries(handlers)) server.addMethod(method, handler);
  const client = new JSONRPCClient((message) => send(JSON.stringify(message)));
  return {
    request(method, params) { return client.request(method, params); },
    notify(method, params) { return client.notify(method, params); },
    async receive(raw) {
      const message = JSON.parse(raw);
      if (Object.prototype.hasOwnProperty.call(message, "result") || Object.prototype.hasOwnProperty.call(message, "error")) {
        client.receive(message);
        return null;
      }
      const response = await server.receive(message);
      if (response) send(JSON.stringify(response));
      return response;
    },
  };
}
