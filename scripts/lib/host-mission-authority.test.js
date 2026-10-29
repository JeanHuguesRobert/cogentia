import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveHostMissionAuthority } from './host-mission-authority.js';

const request = {actor:'agent:jhn',mandate:'mandate:mission-1',capability:'host.process.run',target:'node:fracta2'};
const grant = {allowed:true,verified:true,authority_id:'mission:1',actor:request.actor,mandate:request.mandate,capability:request.capability,target:request.target,allowed_operations:[request.capability]};

test('missing governance resolver never conveys authority', async () => {
  assert.equal(await resolveHostMissionAuthority(null, request),null);
});
test('trusted governance resolver can attest a bounded mission', async () => {
  assert.equal((await resolveHostMissionAuthority(async () => grant,request)).authority_id,'mission:1');
});
test('a forged positive response without verification is rejected', async () => {
  assert.equal(await resolveHostMissionAuthority(async () => ({...grant,verified:false}),request),null);
});
test('the verdict cannot be reused under a different mandate or target', async () => {
  assert.equal(await resolveHostMissionAuthority(async () => grant,{...request,mandate:'mandate:other'}),null);
  assert.equal(await resolveHostMissionAuthority(async () => grant,{...request,target:'node:other'}),null);
});
test('expired authority or missing capability is rejected', async () => {
  assert.equal(await resolveHostMissionAuthority(async () => ({...grant,expires_at:'2000-01-01T00:00:00Z'}),request),null);
  assert.equal(await resolveHostMissionAuthority(async () => ({...grant,allowed_operations:[]}),request),null);
});
test('outside communication actions remain reserved', async () => {
  const req={...request,capability:'communication.send'};
  const alleged={...grant,capability:req.capability,allowed_operations:[req.capability]};
  assert.equal(await resolveHostMissionAuthority(async () => alleged,req),null);
});

test('router executes repeated internal actions under one verified mission', async () => {
  const { createHostCapabilityRouter } = await import('./host-capability-router.js');
  const router = createHostCapabilityRouter({
    cacheKey:'mission-authority-test',
    providerName:'unix-process',
    missionAuthorityResolver: async request => ({
      ...grant, actor:request.actor, mandate:request.mandate,
      capability:request.capability, target:request.target,
    }),
    providerFactory: async () => ({
      start:async()=>{},
      invoke:async()=>({ok:true,upstream_tool:'fake',stdout:'ok',stderr:'',exit_code:0}),
    }),
  });
  const context = {
    actor:request.actor, principal:'principal:jhn', mandate:request.mandate,
    auth:{lockers:{private:{write:true}}},target:request.target,
    provider:'unix-process',
  };
  const first = await router.invoke(request.capability,{command:'printf first'},context);
  const second = await router.invoke(request.capability,{command:'printf second'},context);
  assert.equal(first.ok,true);
  assert.equal(second.ok,true);
  assert.equal(first.trace.authority_origin,'verified_mission');
  await router.stop();
});
