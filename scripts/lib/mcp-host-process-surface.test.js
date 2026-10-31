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

test('EXPOSE preparation binds command, provider, timeout and node without executing', async () => {
  const core = createMcpCore({ COGENTIA_MCP_VIEW:'full', COGENTIA_ADMIN_TOKEN:'test-admin' });
  const base = { command:'printf PREPARE_ONLY', provider:'unix-process', target:'node:fracta2', timeout_ms:1000 };
  const prepared = await core.callTool('cogentia_host_process_prepare', base);
  assert.equal(prepared.action_class, 'host.process.run');
  assert.equal(prepared.phase, 'EXPOSE');
  assert.equal(prepared.payload.provider, base.provider);
  assert.equal(prepared.payload.timeout_ms, 1000);
  assert.ok(prepared.payload_hash.startsWith('sha256:'));
  const changed = await core.callTool('cogentia_host_process_prepare', {...base,timeout_ms:2000});
  assert.notEqual(changed.payload_hash, prepared.payload_hash);
});

test('governed surface admits new bounds without public execution', async () => {
  const core = createMcpCore({ COGENTIA_MCP_VIEW:'full', COGENTIA_ADMIN_TOKEN:'test-admin', COGENTIA_MCP_ALLOW_MUTATE:'1' });
  const prepared = await core.callTool('cogentia_host_process_prepare', {command:'printf OK', target:'node:fracta2', provider:'unix-process',timeout_ms:120000});
  assert.equal(prepared.exposed_mutation.timeout_ms, 120000);
  const run = core.tools.find(t => t.name === 'cogentia_host_process_run');
  assert.equal(run.inputSchema.properties.command.maxLength, 32768);
  assert.equal(run.inputSchema.properties.timeout_ms.maximum, 120000);
  const anonymous = createMcpCore({COGENTIA_MCP_VIEW:'public'});
  assert.ok(!anonymous.tools.some(t=>t.name==='cogentia_host_process_run'));
});
