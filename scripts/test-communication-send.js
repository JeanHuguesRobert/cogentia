import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  grantSideEffectAuthorization,
  resetAuthorizationStore,
  authorizationFromUtterance,
  setAuthorizationStore,
} from "./lib/side-effect-authorization.js";
import { createFileStore } from "./lib/side-effect-store.js";
import {
  prepareCommunicationSend,
  executeCommunicationSend,
  createDryRunTransport,
} from "./lib/communication-send.js";
import { createMcpCore } from "./lib/cogentia-mcp-core.js";

resetAuthorizationStore();

assert.equal(authorizationFromUtterance("On va lui envoyer ce document.").granted, false);

const prepared = prepareCommunicationSend({
  to: ["ext@example.com"],
  subject: "Hello",
  body: "exact body",
});
assert.equal(prepared.phase, "EXPOSE");
assert.equal(prepared.exposed_message.body, "exact body");

const transport = createDryRunTransport();
await assert.rejects(
  () => executeCommunicationSend({ prepared, authorization: null, transport }),
  (e) => e.error_class === "authorization_missing"
);
assert.equal(transport.sent.length, 0);

const auth = grantSideEffectAuthorization({
  principal: "principal:test",
  action_class: "gmail.send",
  target: prepared.target,
  payload: prepared.payload,
});
const sent = await executeCommunicationSend({ prepared, authorization: auth, transport });
assert.equal(sent.ok, true);
assert.equal(transport.sent.length, 1);
assert.equal(sent.result.transport, "dry-run");
await assert.rejects(
  () => executeCommunicationSend({ prepared, authorization: auth, transport }),
  (e) => e.error_class === "authorization_replay"
);
assert.equal(transport.sent.length, 1);

const storePath = path.join(os.tmpdir(), `cogentia-sea-${process.pid}.json`);
try {
  fs.rmSync(storePath, { force: true });
  const a = createFileStore(storePath);
  setAuthorizationStore(a);
  const prepared2 = prepareCommunicationSend({
    to: ["ext@example.com"],
    subject: "Cross-process",
    body: "same",
  });
  const g = grantSideEffectAuthorization({
    principal: "principal:test",
    action_class: "gmail.send",
    target: prepared2.target,
    payload: prepared2.payload,
  });
  const b = createFileStore(storePath);
  setAuthorizationStore(b);
  const tx = createDryRunTransport();
  const once = await executeCommunicationSend({ prepared: prepared2, authorization: g, transport: tx });
  assert.equal(once.ok, true);
  const c = createFileStore(storePath);
  setAuthorizationStore(c);
  await assert.rejects(
    () => executeCommunicationSend({ prepared: prepared2, authorization: g, transport: tx }),
    (e) => e.error_class === "authorization_replay"
  );
} finally {
  try { fs.rmSync(storePath, { force: true }); } catch { /* ignore */ }
  resetAuthorizationStore();
}

resetAuthorizationStore();
const tx2 = createDryRunTransport();
const core = createMcpCore(
  {
    COGENTIA_MCP_VIEW: "full",
    COGENTIA_ADMIN_TOKEN: "admin-test",
    COGENTIA_MCP_ALLOW_MUTATE: "1",
  },
  { communicationTransport: tx2 }
);
const exposed = await core.callTool("cogentia_communication_prepare", {
  to: ["ext@example.com"],
  subject: "MCP",
  body: "via cogentia",
});
await assert.rejects(
  () => core.callTool("cogentia_communication_send", {
    prepared: exposed,
    side_effect_authorization: null,
  }),
  (e) => e.error_class === "authorization_missing"
);
const token = grantSideEffectAuthorization({
  principal: "principal:test",
  action_class: "gmail.send",
  target: exposed.target,
  payload: exposed.payload,
});
const viaMcp = await core.callTool("cogentia_communication_send", {
  prepared: exposed,
  side_effect_authorization: token,
});
assert.equal(viaMcp.ok, true);
assert.equal(tx2.sent.length, 1);

const publicCore = createMcpCore({ COGENTIA_MCP_VIEW: "public" });
const names = (await publicCore.handleJsonRpc({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: {},
})).result.tools.map((t) => t.name);
assert.equal(names.includes("cogentia_communication_send"), false);
assert.equal(names.includes("cogentia_communication_prepare"), false);

console.log(JSON.stringify({ ok: true, test: "communication_send" }));
