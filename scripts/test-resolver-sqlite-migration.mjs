import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
  importLegacyResolverJson,listResolvers,getClaim,claimContinuation,
  releaseClaim,registerResolver,
} from './lib/resolver-registry.js';

test('old resolver and claim JSON are imported idempotently to local SQLite',()=>{
  const root=mkdtempSync(join(tmpdir(),'resolver-sqlite-migrate-'));
  const previous=process.env.COGENTIA_CONTINUATIONS_DB;
  process.env.COGENTIA_CONTINUATIONS_DB=join(root,'operational.sqlite');
  try{
    const d=join(root,'.cogentia','resolvers');
    const claims=join(d,'claims');
    mkdirSync(claims,{recursive:true});
    writeFileSync(join(d,'agent-a.json'),JSON.stringify({
      resolver_id:'agent-a',capabilities:['tool_use'],registered_at:'2026-11-01T00:00:00Z'}));
    writeFileSync(join(claims,'ctn_foo.json'),JSON.stringify({
      continuation_id:'ctn_foo',resolver_id:'agent-a',claimed_at:'2026-11-01T10:00:00Z'}));
    const dry=importLegacyResolverJson(root);
    assert.equal(dry.resolvers,1);
    assert.equal(dry.claims,1);
    assert.equal(listResolvers(root).length,0);
    const imported=importLegacyResolverJson(root,{apply:true});
    assert.equal(imported.ok,true);
    assert.equal(imported.imported,2);
    assert.equal(listResolvers(root)[0].resolver_id,'agent-a');
    assert.equal(getClaim(root,'ctn_foo').resolver_id,'agent-a');
    const again=importLegacyResolverJson(root,{apply:true});
    assert.equal(again.ok,true);
    assert.equal(again.already_present,2);
    assert.equal(claimContinuation(root,'ctn_foo','agent-b').claimed,false);
    releaseClaim(root,'ctn_foo');
    assert.equal(claimContinuation(root,'ctn_foo','agent-b').claimed,true);
    const conflicting=importLegacyResolverJson(root,{apply:true});
    assert.equal(conflicting.ok,false);
    assert.equal(conflicting.conflicts.length,1);
  }finally{
    if(previous===undefined)delete process.env.COGENTIA_CONTINUATIONS_DB;
    else process.env.COGENTIA_CONTINUATIONS_DB=previous;
    rmSync(root,{recursive:true,force:true});
  }
});
