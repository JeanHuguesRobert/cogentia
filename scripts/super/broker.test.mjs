import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cogentia-super-cop-'));
const store=path.join(dir,'cop-grants.json');
process.env.COGENTIA_SEA_STORE_PATH=store;
process.env.COGENTIA_SUPER_AUDIT=path.join(dir,'audit.jsonl');
const {handle,effectHash,executionArguments}=await import('./broker.mjs');
const {prepareHostProcessRun}=await import('../lib/host-process-prepare.js');
const {mintSideEffectGrantFromPrepared,setAuthorizationStore}=await import('../lib/side-effect-authorization.js');
const {createFileStore}=await import('../lib/side-effect-store.js');
setAuthorizationStore(createFileStore(store));
function prepare(command,mode='super'){
  const prepared=prepareHostProcessRun({command,target:'node:fracta2',provider:'unix-process',execution_mode:mode});
  const grant=mintSideEffectGrantFromPrepared(prepared,{principal:'principal:test',actor:'agent:test',
    mandate_ref:'mandate:test',confirm:prepared.payload_hash});
  const req={op:'run',execution_mode:'super',authorization_id:grant.authorization_id,
    script:command,actor:'agent:test',principal:'principal:test',mandate:'mandate:test',target:'node:fracta2',provider:'unix-process'};
  return {grant,req};
}
test('uses canonical COP grant and prevents replay without broker grants',async()=>{
  const {grant,req}=prepare('printf COP_SUPER_OK');
  assert.equal(effectHash(req),grant.payload_hash);
  const a=await handle(req);
  assert.equal(a.ok,true);
  assert.equal(a.stdout,'COP_SUPER_OK');
  assert.equal(a.authority_id,grant.authorization_id);
  assert.equal((await handle(req)).error,'cop_authorization_denied');
  const data=JSON.parse(fs.readFileSync(store,'utf8'));
  assert.ok(data.grants[grant.authorization_id].consumed_at);
});
test('broker rejects transport-attested and mandate-derived origins without trusted Principal proof',async()=>{
  for(const origin of ['mcp_jhn_attested_mutate','mcp_admin_mutate','cli_principal_confirm','mandate_derived']){
    const {grant,req}=prepare('printf SHOULD_NOT_RUN');
    const contents=JSON.parse(fs.readFileSync(store,'utf8'));
    contents.grants[grant.authorization_id].authority_origin=origin;
    fs.writeFileSync(store,JSON.stringify(contents));
    const denied=await handle(req);
    assert.equal(denied.error,'cop_authorization_denied',origin);
  }
});
test('mode, actor, target, mandate and script are bound to the same COP grant',async()=>{
  const {req}=prepare('printf INTENDED');
  for(const alteration of [
    {execution_mode:'normal'}, {actor:'agent:forged'}, {principal:'principal:forged'},
    {target:'node:other'}, {mandate:'mandate:other'},
    {script:'printf ALTERED'}, {timeout_ms:500},
  ]){
    const result=await handle({...req,...alteration});
    assert.equal(result.ok,false);
  }
  assert.equal((await handle(req)).ok,true);
});
