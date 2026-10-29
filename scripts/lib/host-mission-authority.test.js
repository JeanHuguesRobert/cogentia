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
