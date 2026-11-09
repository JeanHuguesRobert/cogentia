import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {cmdCopConsent} from './cop-consent-cli.js';
const p={kind:'cop.mandate-amendment.proposal/v1',mandate_ref:'mandate:jhn:example',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',previous_version:'v1',new_version:'v2',reason:'Read-only extension fixture',scope:{allowed_actions:['corpus.read']}};
test('CLI reads same packet and does not approve automatically or via non-TTY',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'consent-cli-'));
 try{
  const f=join(dir,'proposal.json');writeFileSync(f,JSON.stringify(p));
  const review=await cmdCopConsent(['review','--from',f]);
  assert.equal(review.ok,true);assert.equal(review.grants_mandate_authority,false);
  assert.equal((await cmdCopConsent(['decide','--from',f,'--decision','approve'],{input:{isTTY:false},output:{isTTY:false}})).error,'CONSENT_INTERACTIVE_TERMINAL_REQUIRED');
  assert.equal((await cmdCopConsent(['decide','--from',f,'--decision','execute'])).error,'CONSENT_DECISION_INVALID');
  assert.equal((await cmdCopConsent(['review','--from',join(dir,'absent')])).error,'CONSENT_FILE_INVALID');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
