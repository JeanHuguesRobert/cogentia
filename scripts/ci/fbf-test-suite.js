#!/usr/bin/env node
/** FBF: GitHub transport is not the suite result. Emit a typed receipt always. */
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';
const commands=[
 ['pnpm','test'],
 ['node','scripts/check-mcp-apps-demo.js'],
 ['node','--test','scripts/lib/proportionate-risk.test.js'],
 ['node','scripts/check-mcp-risk-assess.js'],
 ['node','--test','scripts/super/principal-effect-issuer.test.mjs','scripts/lib/principal-super-effect-admission.test.js'],
 ['node','--test','scripts/lib/principal-super-effect-claim.test.js'],
 ['node','scripts/check-continuation-frontier-f2a.js'],
 ['node','scripts/check-calculette-cold-orientation.js'],
 ['node','scripts/check-calculette-git-delta.js'],
 ['python3','scripts/check-calculette-janus-receipts.py'],
 ['python3','scripts/check-calculette-decision-quality.py'],
 ['python3','scripts/check-calculette-orientation-cost.py'],
];
const entries=[];
for(const [program,...args] of commands){
 const command=[program,...args].join(' ');
 const r=spawnSync(program,args,{stdio:'inherit',timeout:120000,env:process.env});
 const ok=r.status===0&&!r.error;
 entries.push({command,status:ok?'completed':'failed',exit_code:r.status,error_code:r.error?.code||null});
 console.log(`[FBF] ${ok?'PASS':'FAIL'} ${command} (${r.status??r.error?.code})`);
}
const failed=entries.filter(e=>e.status==='failed');
const receipt={schema:'cogentia.ci-suite-result.v1',status:failed.length?'failed':'completed',phase:'test-suite',errors:failed.map(({command,exit_code,error_code})=>({code:error_code||'TEST_COMMAND_FAILED',command,exit_code})),entries};
mkdirSync('ci-receipts',{recursive:true});
writeFileSync(join('ci-receipts','test-suite.json'),JSON.stringify(receipt,null,2)+'\n');
const summary=`### FBF test-suite: **${receipt.status.toUpperCase()}**\n\n${entries.map(e=>`- ${e.status==='completed'?'PASS':'FAIL'}: \`${e.command}\``).join('\n')}\n\nMachine-readable receipt: \`ci-receipts/test-suite.json\`. GitHub check status is transport, not this test result.\n`;
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
if(failed.length) console.log(`::warning title=FBF test result FAILED::${failed.length} command(s) failed; see test-suite.json artifact and job summary`);
// Intentionally return 0: expected task failure is a durable result, not CI transport failure.
