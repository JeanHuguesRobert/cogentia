import assert from "node:assert/strict";
import {
  grantSideEffectAuthorization,
  resetAuthorizationStore,
  classifyAction,
} from "./lib/side-effect-authorization.js";
import {
  prepareGithubWrite,
  executeGithubWrite,
  createGithubDryRunTransport,
} from "./lib/github-write.js";
import { createMcpCore } from "./lib/cogentia-mcp-core.js";

resetAuthorizationStore();
assert.equal(classifyAction("github.write"), "effectful");
assert.equal(classifyAction("github.issue_read"), "read_only");

const prepared = prepareGithubWrite({
  operation: "add_issue_comment",
  owner: "JeanHuguesRobert",
  repo: "cogentia",
  issue_number: 171,
  body: "exact comment body",
});
assert.equal(prepared.phase, "EXPOSE");
assert.equal(prepared.exposed_mutation.body, "exact comment body");

const transport = createGithubDryRunTransport();
await assert.rejects(
  () => executeGithubWrite({ prepared, authorization: null, transport }),
  (e) => e.error_class === "authorization_missing"
);
assert.equal(transport.written.length, 0);

const auth = grantSideEffectAuthorization({
  principal: "principal:test",
  action_class: "github.write",
  target: prepared.target,
  payload: prepared.payload,
});
const written = await executeGithubWrite({ prepared, authorization: auth, transport });
assert.equal(written.ok, true);
assert.equal(transport.written.length, 1);
await assert.rejects(
  () => executeGithubWrite({ prepared, authorization: auth, transport }),
  (e) => e.error_class === "authorization_replay"
);
assert.equal(transport.written.length, 1);

resetAuthorizationStore();
const tx2 = createGithubDryRunTransport();
const core = createMcpCore(
  {
    COGENTIA_MCP_VIEW: "full",
    COGENTIA_ADMIN_TOKEN: "admin-test",
    COGENTIA_MCP_ALLOW_MUTATE: "1",
  },
  { githubTransport: tx2 }
);
const exposed = await core.callTool("cogentia_github_prepare", {
  operation: "issue_write",
  owner: "JeanHuguesRobert",
  repo: "cogentia",
  issue_number: 171,
  method: "update",
  state: "open",
  body: "no close without grant",
});
await assert.rejects(
  () => core.callTool("cogentia_github_write", { prepared: exposed, side_effect_authorization: null }),
  (e) => e.error_class === "authorization_missing"
);
const token = grantSideEffectAuthorization({
  principal: "principal:test",
  action_class: "github.write",
  target: exposed.target,
  payload: exposed.payload,
});
const viaMcp = await core.callTool("cogentia_github_write", {
  prepared: exposed,
  side_effect_authorization: token,
});
assert.equal(viaMcp.ok, true);
assert.equal(tx2.written.length, 1);

const publicCore = createMcpCore({ COGENTIA_MCP_VIEW: "public" });
const names = (await publicCore.handleJsonRpc({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: {},
})).result.tools.map((t) => t.name);
assert.equal(names.includes("cogentia_github_write"), false);
assert.equal(names.includes("cogentia_github_prepare"), false);

console.log(JSON.stringify({ ok: true, test: "github_write" }));
