import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {join} from 'node:path';import {tmpdir} from 'node:os';import {spawnSync} from 'node:child_process';
import {canonicalProposalBytes} from './john-root-mandate.js';
import {sshFingerprint} from './john-sshsig-approval.js';
import {SUPER_PROBE_NAMESPACE,verifySuperProbeApproval} from './super-probe-approval.js';
const proposal=JSON.parse(readFileSync(new URL('../../research/integration/approvals/jhn-super-probe-2026-11-07.proposal.json',import.meta.url)));
test('one-shot super proposal signed by distinct SSH namespace, tampering and expiry denied',()=>{
 const dir=mkdtempSync(join(tmpdir(),'super-probe-test-'));
 try{
  const key=join(dir,'key'),path=join(dir,'proposal');
  assert.equal(spawnSync('ssh-keygen',['-q','-t','rsa','-b','2048','-N','','-f',key]).status,0);
  writeFileSync(path,canonicalProposalBytes(proposal));
  assert.equal(spawnSync('ssh-keygen',['-Y','sign','-f',key,'-n',SUPER_PROBE_NAMESPACE,path]).status,0);
  const trustedPublicKey=readFileSync(key+'.pub','utf8');
  const base={proposal,signature:readFileSync(path+'.sig','utf8'),trustedPublicKey,
    expectedFingerprint:sshFingerprint(trustedPublicKey),now:new Date('2026-11-07T12:00:00Z')};
  assert.equal(verifySuperProbeApproval(base).ok,true);
  for(const patch of [
   {effect:{...proposal.effect,command:'sudo useradd bad'}},
   {effect:{...proposal.effect,payload_hash:'sha256:malicious'}},
   {budget_limits:{max_steps:2}},
   {single_use:false},
   {mandate_ref:'mandate:jhn:john-root'},
  ])assert.equal(verifySuperProbeApproval({...base,proposal:{...proposal,...patch}}).ok,false);
  assert.equal(verifySuperProbeApproval({...base,now:new Date('2026-11-14T00:00:00Z')}).ok,false);
  assert.equal(verifySuperProbeApproval({...base,expectedFingerprint:'SHA256:untrusted'}).ok,false);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
