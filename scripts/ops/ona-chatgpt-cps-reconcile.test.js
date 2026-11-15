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

test('actual Operium Node Agent script job imports the existing adapter without a browser action',async()=>{
  const {runScheduledJob}=await import('../../../operium/lib/node-agent/job-runner.js');
  const {fileURLToPath}=await import('node:url');
  const source=fileURLToPath(new URL('./ona-chatgpt-cps-reconcile.mjs',import.meta.url));
  const r=await runScheduledJob({job_id:'test:cps-local-replay',kind:'script',
    config:{script:source,cwd:'cogentia'}},
    {config:{env:{},hostname:'fracta2',jobTimeoutMs:5000},env:{}});
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.skipped,'not_enabled');
  assert.equal(r.external_effects,0);
});
