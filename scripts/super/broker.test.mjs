import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cogentia-super-test-'));
process.env.COGENTIA_SUPER_STATE=dir;
const {issue,verify,handle,read,save,executionArguments}=await import('./broker.mjs');
test('a mandate is checked, spent before execution, exhausted and never reusable',async()=>{
  const g=issue({actor:'agent:jhn',mandate:'mission:test',ttl:1,uses:1});
  const req={id:g.id,secret:g.secret,actor:g.actor,mandate:g.mandate,script:'printf SUPER_TEST'};
  assert.equal(verify(req).remaining,1);
  assert.equal(verify({...req,secret:'0'.repeat(64)}),null);
  assert.equal(verify({...req,mandate:'mission:other'}),null);
  const result=await handle({...req,op:'run',execution_mode:'super'});
  assert.equal(result.ok,true);
  assert.equal(result.stdout,'SUPER_TEST');
  assert.equal((await handle({...req,op:'run',execution_mode:'super'})).error,'mandate_denied');
  assert.equal(read()[g.id].remaining,0);
});
test('revoked, expired and malformed mandates fail closed',async()=>{
  const g=issue({actor:'agent:jhn',mandate:'mission:revoke',uses:2});
  const req={op:'run',execution_mode:'super',id:g.id,secret:g.secret,actor:g.actor,mandate:g.mandate,script:'printf NO'};
  let all=read();all[g.id].revoked=true;save(all);
  assert.equal((await handle(req)).error,'mandate_denied');
  all=read();all[g.id].revoked=false;all[g.id].expires=Date.now()-1;save(all);
  assert.equal((await handle(req)).error,'mandate_denied');
  assert.equal((await handle({...req,script:''})).error,'invalid_script');
});
test('no command allowlist; actual script exit status is reported',async()=>{
  const g=issue({actor:'agent:jhn',mandate:'mission:general',uses:2});
  const r=await handle({op:'run',execution_mode:'super',id:g.id,secret:g.secret,actor:g.actor,mandate:g.mandate,
    script:'echo one; echo two; exit 3'});
  assert.equal(r.ok,false);
  assert.equal(r.exit_code,3);
  assert.match(r.stdout,/one\ntwo/);
});
test('super is explicit and the script itself requires sudo for root operations', async()=>{
  const g=issue({actor:'agent:jhn',mandate:'mission:explicit',uses:1});
  const req={op:'run',id:g.id,secret:g.secret,actor:g.actor,mandate:g.mandate,script:'id -u'};
  assert.equal((await handle(req)).error,'explicit_super_required');
  assert.equal(read()[g.id].remaining,1);
  assert.deepEqual(executionArguments('id; sudo -n id',0),
    ['sudo',['-n','-u','ubuntu','--','/bin/sh','-c','id; sudo -n id']]);
  const result=await handle({...req,execution_mode:'super'});
  assert.equal(result.ok,true);
  assert.equal(result.stdout.trim(),String(process.getuid()));
});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
