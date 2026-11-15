import test from 'node:test';
import assert from 'node:assert/strict';
import {runScheduledHeartbeat} from './ona-chatgpt-cps-reconcile.mjs';

test('ONA existing-job adapter is disabled by default without opening credentials',async()=>{
  assert.deepEqual(await runScheduledHeartbeat({env:{}}),
    {ok:true,skipped:'not_enabled',external_effects:0});
});

test('opt-in requires existing independently pinned trusted public issuer key',async()=>{
  assert.deepEqual(await runScheduledHeartbeat({env:{COGENTIA_CPS_WAKE_RECOVERY_ENABLED:'1'}}),
    {ok:false,error:'trusted_issuer_not_configured'});
  assert.equal((await runScheduledHeartbeat({env:{
    COGENTIA_CPS_WAKE_RECOVERY_ENABLED:'1',
    COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS:'/no-such-issuer-test-file',
  }})).error,'canonical_store_or_issuer_unavailable');
});
