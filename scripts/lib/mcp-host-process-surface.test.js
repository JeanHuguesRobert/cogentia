import test from 'node:test';
import assert from 'node:assert/strict';
import { createMcpCore } from './cogentia-mcp-core.js';

const name = 'cogentia_host_process_run';
test('normal MCP surface publishes host process only in protected catalog', async () => {
  const base = createMcpCore({ COGENTIA_MCP_VIEW: 'public' });
  assert.ok(!base.tools.some(t => t.name === name));
  assert.ok(base.mutateTools.includes(name));
  const full = createMcpCore({ COGENTIA_MCP_VIEW:'full', COGENTIA_ADMIN_TOKEN:'test-admin', COGENTIA_MCP_ALLOW_MUTATE:'1' });
  assert.ok(full.tools.some(t => t.name === name));
  const oauth = createMcpCore({ COGENTIA_MCP_VIEW:'public', COGENTIA_MCP_OAUTH_ISSUER:'https://issuer.example' });
  const listed = await oauth.handleJsonRpc({jsonrpc:'2.0',id:1,method:'tools/list',params:{}});
  const item = listed.result.tools.find(t => t.name === name);
  assert.deepEqual(item.securitySchemes[0].scopes, ['cogentia.mutate']);
});

test('normal MCP surface denies unauthenticated process invocation before provider', async () => {
  const core = createMcpCore({ COGENTIA_MCP_VIEW:'public' });
  await assert.rejects(core.callTool(name, {command:'printf SHOULD_NOT_RUN'}), /tier_forbidden/);
});
