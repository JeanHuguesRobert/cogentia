import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {recordMandateDeclaration} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {recordExecutionBudgetGrant,createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {resolveCallerAuth} from './cogentia-mcp-auth.js';
import {assessJohnCopAuthority} from './john-cop-authority-preflight.js';
import {openExistingJohnCopStore} from './john-cop-existing-store.js';
test('read-only attachment never invents a database or modifies canonical events',()=>{
 const path=join(tmpdir(),'missing-'+process.pid+'.db');
 assert.equal(openExistingJohnCopStore(path).error,'cop_store_unavailable');
 const dir=mkdtempSync(join(tmpdir(),'john-cop-'));
 try{
  const dbpath=join(dir,'existing.db');
  const initial=createSqliteCopEventStore(dbpath);
  recordMandateDeclaration(initial,{mandate_id:'mandate:test',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',scope:{allowed_actions:['browser.hosted.inspect']}});
  const count=initial.replay().length;initial.close();
  const attached=openExistingJohnCopStore(dbpath);
  assert.equal(attached.ok,true,attached.error);
  assert.equal(attached.store.replay().length,count);
  assert.equal(attached.store.listTopic('mandate:mandate:test').length,1);
  assert.equal(attached.store.append({}).error,'read_only_cop_store');
  attached.close();
  const confirm=new DatabaseSync(dbpath,{readOnly:true});
  assert.equal(confirm.prepare('select count(*) as n from cop_events').get().n,count);
  confirm.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('existing unrelated database is rejected without schema initialization',()=>{
 const dir=mkdtempSync(join(tmpdir(),'john-cop-invalid-'));
 try{
  const path=join(dir,'unrelated.db');const db=new DatabaseSync(path);
  db.exec('create table unrelated (id integer)');db.close();
  assert.equal(openExistingJohnCopStore(path).error,'canonical_cop_schema_missing');
  const inspect=new DatabaseSync(path,{readOnly:true});
  assert.equal(inspect.prepare("select count(*) as n from sqlite_master where name='cop_events'").get().n,0);
  inspect.close();
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('real Inseme store reopened read-only admits only preflight, never an effect',()=>{
 const dir=mkdtempSync(join(tmpdir(),'john-cop-preflight-'));
 const mandate_ref='mandate:jhn:fixture';
 try{
  const path=join(dir,'existing.db');const writer=createSqliteCopEventStore(path);
  recordMandateDeclaration(writer,{mandate_id:mandate_ref,version:'v1',principal_ref:'principal:jhn',logical_agent_ref:'agent:jhn',scope:{allowed_actions:['browser.hosted.inspect'],forbidden_actions:['payment.execute']}});
  recordExecutionBudgetGrant(writer,{budget_id:'budget:fixture',mandate_ref,principal_ref:'principal:jhn',limits:{max_steps:3}});
  writer.close();
  const attached=openExistingJohnCopStore(path);assert.equal(attached.ok,true);
  try {
   const auth=resolveCallerAuth({COGENTIA_MCP_JHN_MUTATE:'1',COGENTIA_MCP_JHN_TOKEN:'fixture'}, {headers:{authorization:'Bearer fixture','x-cogentia-actor':'agent:jhn','x-cogentia-mandate':mandate_ref}});
   const ledger=createEventSourcedExecutionBudgetLedger({store:attached.store,budget_id:'budget:fixture',limits:{max_steps:3},require_authority_grant:true});
   const args={store:attached.store,auth,mandate_ref,version_pin:'v1',capability:'browser.hosted.inspect',ledger,verifyIssuer:()=>({verified:true,principal_ref:'principal:jhn',mandate_ref})};
   const result=assessJohnCopAuthority(args);
   assert.equal(result.preflight_ok,true,JSON.stringify(result));
   assert.equal(result.authorized_to_execute,false);
   assert.equal(result.reservation,null);
   assert.equal(assessJohnCopAuthority({...args,capability:'payment.execute'}).ok,false);
   assert.equal(ledger.snapshot().available.max_steps,3);
  } finally {attached.close();}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
