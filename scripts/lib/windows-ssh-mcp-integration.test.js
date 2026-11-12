import test from 'node:test';
import assert from 'node:assert/strict';
import { createMcpCore } from './cogentia-mcp-core.js';
import { createHostCapabilityRouter } from './host-capability-router.js';
import { mintSideEffectGrantFromPrepared, resetAuthorizationStore } from './side-effect-authorization.js';
import { prepareHostProcessRun } from './host-process-prepare.js';

test('FBF #318: MCP -> COP grant -> semantic router -> Windows provider -> receipt (no live host effect)', async () => {
  resetAuthorizationStore(); // isolated in-process authorization store, never production
  const target = 'node:i7-thinkpad-jhr';
  const provider = 'windows-ssh';
  const command = '[Console]::WriteLine("FIXTURE_WINDOWS_OK")';
  const timeout_ms = 5000;
  const prepared = prepareHostProcessRun({command, target, provider, timeout_ms, execution_mode:'normal'});
  const grant = mintSideEffectGrantFromPrepared(prepared, {
    principal:'principal:test', actor:'actor:test', mandate_ref:'mandate:test', confirm:prepared.payload_hash,
  });
  let invocations = 0;
  const fake = {
    async start() {}, async stop() {},
    async invoke(capability,args) {
      invocations++;
      assert.equal(capability, 'host.process.run');
      assert.equal(args.target, target);
      assert.equal(args.command, command);
      return {ok:true, upstream_tool:'ssh.powershell', stdout:'FIXTURE_WINDOWS_OK', stderr:'',
        exit_code:0, identity:{hostname:'i7-thinkpad-jhr',os:'windows',alias:'thinkpad'}};
    },
  };
  const router = createHostCapabilityRouter({providerName:provider, providerFactory:async()=>fake, cacheKey:'windows-ssh-mcp-integration'});
  const core = createMcpCore({ COGENTIA_MCP_VIEW:'full', COGENTIA_ADMIN_TOKEN:'fixture', COGENTIA_MCP_ALLOW_MUTATE:'1' }, {hostRouter:router});
  const auth = {auth:'admin',actor:'actor:test',principal_ref:'principal:test',mandate_ref:'mandate:test',allowMutate:true};
  const args = {command,target,provider,timeout_ms,execution_mode:'normal',side_effect_authorization:grant};
  try {
    const result = await core.callTool('cogentia_host_process_run',args,{auth});
    assert.equal(result.ok,true);
    assert.equal(invocations,1);
    assert.equal(result.trace.provider,provider);
    assert.equal(result.trace.target,target);
    assert.equal(result.trace.observed_host,'i7-thinkpad-jhr');
    assert.equal(result.trace.observed_os,'windows');
    assert.equal(result.trace.exit_code,0);
    assert.equal(result.trace.verification.ok,true);
    await assert.rejects(core.callTool('cogentia_host_process_run',args,{auth}), e=>e.error_class==='authorization_replay');
    assert.equal(invocations,1);
  } finally {await router.stop();}
});
