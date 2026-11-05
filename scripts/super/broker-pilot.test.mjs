import test from 'node:test';
import assert from 'node:assert/strict';
import {isApprovedFredPilot,effectHash} from './broker.mjs';
const script="id hosted-fred2b20250 >/dev/null 2>&1 && { echo ALREADY_EXISTS; exit 0; }; sudo -n /usr/sbin/useradd --create-home --shell /bin/bash --comment 'Hosted Browser - Frederic Lecourtois' hosted-fred2b20250 && id hosted-fred2b20250";
const r={script,target:'resource://fracta2',provider:'unix-process',timeout_ms:15000,actor:'agent:jhn',principal:'principal:jhn',mandate:'mandate:jhn:mcp_default'};
const g={authority_origin:'mcp_jhn_attested_mutate',payload_hash:'sha256:9997c677d88aa2fa26c7252e6a4c616c9a81f1c93e3e03233e80af1ff8a4716e'};
test('exact prior approved hash and context admitted only with temporary flag',()=>{
 assert.equal(effectHash(r),g.payload_hash);assert.equal(isApprovedFredPilot(r,g,true),true);
 assert.equal(isApprovedFredPilot(r,g,false),false);
});
test('one-shot bridge rejects expanded commands, targets, times, actors and generic MCP grants',()=>{
 for(const patch of [{script:'id -u'},{script:script+'; true'},{target:'node:fracta2'},{timeout_ms:120000},{actor:'agent:other'},{principal:'principal:other'},{mandate:'mandate:other'}])assert.equal(isApprovedFredPilot({...r,...patch},g,true),false);
 for(const origin of ['mcp_admin_mutate','principal','mandate_derived'])assert.equal(isApprovedFredPilot(r,{...g,authority_origin:origin},true),false);
});
