import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareHostProcessRun } from './host-process-prepare.js';
import { createHostCapabilityRouter } from './host-capability-router.js';
import { mintSideEffectGrantFromPrepared, resetAuthorizationStore } from './side-effect-authorization.js';

const auth = { actor:'actor:test', principal_ref:'principal:test', mandate_ref:'mandate:test', lockers:{ public:{read:true,write:true}, private:{read:true,write:true} } };
test('existing COP EXPOSE → hash-bound grant → Unix provider → receipt; grant is single-use', async () => {
  resetAuthorizationStore();
  const target = 'node:fracta2';
  const prepared = prepareHostProcessRun({command:'printf COP_UNIX_OK', target, provider:'unix-process', timeout_ms:1000});
  const grant = mintSideEffectGrantFromPrepared(prepared, {principal:'principal:test',actor:'actor:test',mandate_ref:'mandate:test',confirm:prepared.payload_hash});
  const router = createHostCapabilityRouter({providerName:'unix-process'});
  const args = {command:'printf COP_UNIX_OK',timeout_ms:1000};
  const ctx = {auth, actor:'actor:test', mandate:'mandate:test', target, provider:'unix-process', authorization:grant};
  const result = await router.invoke('host.process.run',args,ctx);
  assert.equal(result.ok,true);
  assert.equal(result.stdout,'COP_UNIX_OK');
  assert.equal(result.trace.capability,'host.process.run');
  assert.equal(result.trace.authorization_id,grant.authorization_id);
  await assert.rejects(router.invoke('host.process.run',args,ctx), e=>e.error_class==='authorization_replay');
  await router.stop();
});
