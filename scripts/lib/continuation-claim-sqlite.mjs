/**
 * Host-local SQLite storage for COP PacketClaim epochs and terminal receipts.
 * Storage is NOT mandate or budget admission. All competing epoch appends
 * serialize only their short local commit boundary, not the work itself.
 */
import {DatabaseSync} from 'node:sqlite';
import {continuationDatabasePath} from './continuation-sqlite-repository.mjs';

const id=s=>{
  if(typeof s!=='string'||!/^[a-zA-Z0-9_.:-]{1,160}$/.test(s)||s.includes('..'))
    throw Error('invalid_continuation_claim_id');
  return s;
};
function connection(root){
  const db=new DatabaseSync(continuationDatabasePath(root));
  db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS cop_claim_epochs(
    continuation_id TEXT NOT NULL, epoch INTEGER NOT NULL,
    record_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(continuation_id,epoch)
  );
  CREATE TABLE IF NOT EXISTS cop_terminal_receipts(
    continuation_id TEXT PRIMARY KEY, receipt_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`);
  return db;
}
const decode=x=>x?JSON.parse(x.record_json??x.receipt_json):null;
function use(root,fn){
  const db=connection(root);
  try{return fn(db)}finally{db.close()}
}
export function claimEpochs(root,continuationId){
  return use(root,db=>db.prepare(`SELECT record_json FROM cop_claim_epochs
    WHERE continuation_id=? ORDER BY epoch`).all(id(continuationId)).map(decode));
}
export function currentClaimEpoch(root,continuationId){
  return use(root,db=>decode(db.prepare(`SELECT record_json FROM cop_claim_epochs
    WHERE continuation_id=? ORDER BY epoch DESC LIMIT 1`).get(id(continuationId))));
}
export function getClaimEpoch(root,continuationId,epoch){
  if(!Number.isSafeInteger(epoch)||epoch<1)throw Error('invalid_epoch');
  return use(root,db=>decode(db.prepare(`SELECT record_json FROM cop_claim_epochs
    WHERE continuation_id=? AND epoch=?`).get(id(continuationId),epoch)));
}
export function listClaimIds(root){
  return use(root,db=>db.prepare('SELECT DISTINCT continuation_id FROM cop_claim_epochs ORDER BY continuation_id')
    .all().map(x=>x.continuation_id));
}
export function getTerminalReceipt(root,continuationId){
  return use(root,db=>decode(db.prepare(`SELECT receipt_json FROM cop_terminal_receipts
    WHERE continuation_id=?`).get(id(continuationId))));
}
/** Atomic conditional epoch creation. decide(previous) returns
 * {ok:true,record} or a typed {ok:false,code,...} refusal. The callback
 * performs no network or user-visible effect. */
export function appendClaimEpoch(root,continuationId,decide){
  if(typeof decide!=='function')throw Error('claim_epoch_decider_required');
  return use(root,db=>{
    db.exec('BEGIN IMMEDIATE');
    try{
      const safe=id(continuationId);
      const previous=decode(db.prepare(`SELECT record_json FROM cop_claim_epochs
        WHERE continuation_id=? ORDER BY epoch DESC LIMIT 1`).get(safe));
      const result=decide(previous);
      if(!result?.ok){
        db.exec('COMMIT');
        return result;
      }
      const record=result.record;
      if(!record||record.epoch!==(previous?.epoch||0)+1)
        throw Error('non_monotonic_epoch');
      db.prepare('INSERT INTO cop_claim_epochs(continuation_id,epoch,record_json) VALUES(?,?,?)')
        .run(safe,record.epoch,JSON.stringify(record));
      db.exec('COMMIT');
      return result;
    }catch(e){db.exec('ROLLBACK');throw e}
  });
}
/** A receipt is immutable. Repeated writes must agree on result digest. */
export function putTerminalReceipt(root,continuationId,receipt){
  return use(root,db=>{
    db.exec('BEGIN IMMEDIATE');
    try{
      const safe=id(continuationId);
      const existing=decode(db.prepare(`SELECT receipt_json FROM cop_terminal_receipts
        WHERE continuation_id=?`).get(safe));
      if(existing){
        db.exec('COMMIT');
        const same=existing.result_sha256===receipt.result_sha256&&
          existing.claim_id===receipt.claim_id&&
          existing.settlement_epoch===receipt.settlement_epoch&&
          existing.result_ref===receipt.result_ref&&
          (existing.budget_reservation?.reservation_id??null)===
            (receipt.budget_reservation?.reservation_id??null);
        return {ok:same,code:'RECEIPT_ALREADY_PRESENT',receipt:existing};
      }
      db.prepare('INSERT INTO cop_terminal_receipts(continuation_id,receipt_json) VALUES(?,?)')
        .run(safe,JSON.stringify(receipt));
      db.exec('COMMIT');
      return {ok:true,code:'COMPLETED',receipt};
    }catch(e){db.exec('ROLLBACK');throw e}
  });
}
/** Explicit one-time import. Never overwrite previously imported epochs. */
export function importClaimEpoch(root,continuationId,record){
  if(!record||!Number.isSafeInteger(record.epoch)||record.epoch<1)
    throw Error('invalid_claim_epoch');
  return use(root,db=>{
    db.exec('BEGIN IMMEDIATE');
    try{
      const safe=id(continuationId);
      const old=decode(db.prepare(`SELECT record_json FROM cop_claim_epochs
        WHERE continuation_id=? AND epoch=?`).get(safe,record.epoch));
      if(old){
        db.exec('COMMIT');
        return JSON.stringify(old)===JSON.stringify(record)
          ?{ok:true,existing:true}:{ok:false,code:'CLAIM_EPOCH_CONFLICT'};
      }
      db.prepare('INSERT INTO cop_claim_epochs(continuation_id,epoch,record_json) VALUES(?,?,?)')
        .run(safe,record.epoch,JSON.stringify(record));
      db.exec('COMMIT');
      return {ok:true,existing:false};
    }catch(e){db.exec('ROLLBACK');throw e}
  });
}
