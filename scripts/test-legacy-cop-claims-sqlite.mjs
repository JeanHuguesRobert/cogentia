import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {migrateLegacyCopClaims} from './ops/migrate-legacy-cop-claims-sqlite.mjs';
import {claimEpochs,getTerminalReceipt}
  from './lib/continuation-claim-sqlite.mjs';

test('COP claim JSON epochs and terminal receipt migrate to SQLite idempotently',()=>{
  const root=mkdtempSync(join(tmpdir(),'cop-legacy-migrate-'));
  const prior=process.env.COGENTIA_CONTINUATIONS_DB;
  process.env.COGENTIA_CONTINUATIONS_DB=join(root,'local.sqlite');
  try{
    const epochs=join(root,'.cogentia','resolvers','claims-v1','ctn_abc12345');
    const receipts=join(root,'.cogentia','resolvers','settlements');
    mkdirSync(epochs,{recursive:true});mkdirSync(receipts,{recursive:true});
    const claim={schema:'cop.packet-claim/v1',epoch:1,claim_id:'id-1',
      handler_ref:'agent',status:'active',packet_ref:'continuation:ctn_abc12345'};
    const receipt={schema:'cogentia.continuation-settlement-receipt/v1',
      continuation_id:'ctn_abc12345',claim_id:'id-1',settlement_epoch:2,
      result_ref:'r1',result_sha256:'digest',completed_at:'2026-11-16T00:00:00Z'};
    writeFileSync(join(epochs,'000000000001.json'),JSON.stringify(claim));
    writeFileSync(join(receipts,'ctn_abc12345.json'),JSON.stringify(receipt));
    assert.equal(migrateLegacyCopClaims(root).apply,false);
    assert.equal(migrateLegacyCopClaims(root).epochs,1);
    assert.equal(claimEpochs(root,'ctn_abc12345').length,0);
    const first=migrateLegacyCopClaims(root,{apply:true});
    assert.equal(first.ok,true);
    assert.equal(first.imported,2);
    assert.equal(claimEpochs(root,'ctn_abc12345')[0].claim_id,'id-1');
    assert.equal(getTerminalReceipt(root,'ctn_abc12345').result_ref,'r1');
    const again=migrateLegacyCopClaims(root,{apply:true});
    assert.equal(again.already_imported,2);
    const conflicting={...claim,handler_ref:'agent-different'};
    writeFileSync(join(epochs,'000000000001.json'),JSON.stringify(conflicting));
    const clash=migrateLegacyCopClaims(root,{apply:true});
    assert.equal(clash.ok,false);
    assert.equal(clash.conflicts[0].code,'CLAIM_EPOCH_CONFLICT');
  }finally{
    if(prior===undefined)delete process.env.COGENTIA_CONTINUATIONS_DB;
    else process.env.COGENTIA_CONTINUATIONS_DB=prior;
    rmSync(root,{recursive:true,force:true});
  }
});
