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

test('semantic work turn is protected, describes reviewed capabilities and has a bounded normal-only argument contract',async()=>{
 const n='cogentia_work_turn';
 const anonymous=createMcpCore({COGENTIA_MCP_VIEW:'public'});
 assert.ok(!anonymous.tools.some(t=>t.name===n));
 await assert.rejects(anonymous.callTool(n,{work_ref:'pkt-mcp-untrusted',work_turn:{id:'x',kind:'act'}}),/tier_forbidden/);
 const full=createMcpCore({COGENTIA_MCP_VIEW:'full',COGENTIA_ADMIN_TOKEN:'fixture',COGENTIA_MCP_ALLOW_MUTATE:'1'});
 const tool=full.tools.find(t=>t.name===n);
 assert.deepEqual(tool.inputSchema.required,['work_ref','work_turn']);
 assert.deepEqual(tool.inputSchema.properties.capability.enum,['host.process.run','browser.navigation.instances']);
 assert.deepEqual(tool.inputSchema.properties.arguments.properties.execution_mode.enum,['normal']);
 assert.equal(tool.inputSchema.properties.arguments.additionalProperties,false);
 await assert.rejects(full.callTool(n,{work_ref:'pkt-mcp-untrusted',work_turn:{id:'x',kind:'finish',status:'completed',summary:'x'}}),/commissioned_work_runtime_not_enabled/);
});
