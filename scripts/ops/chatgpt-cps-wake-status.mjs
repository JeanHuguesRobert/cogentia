#!/usr/bin/env node
/** Read-only operational preflight for durable ChatGPT CPS return wakes. */
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {resolveMandate,evaluateMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {listChatgptCpsWakes} from '../lib/chatgpt-cps-wake-consumer.js';
const path='/var/lib/cogentia/cop/john-root-v1.sqlite';
if(process.argv.length!==3||process.argv[2]!=='--status'){
  console.error('Usage: node scripts/ops/chatgpt-cps-wake-status.mjs --status');
  process.exitCode=2;
}else{
  const store=createSqliteCopEventStore(path);
  try{
    const ref='mandate:jhn:john-root';
    const mandate=resolveMandate(store,ref);
    const auth=mandate?evaluateMandate(store,{
      mandate_ref:ref,version_pin:mandate.version,
      expected_principal_ref:'principal:jhn',expected_actor_ref:'agent:jhn',
      capability:'browser.chatgpt.turn',
    }):{granted:false};
    const all=store.replay();
    const declarations=all.filter(e=>e.payload?.profile==='cop/continuation'&&
      e.payload?.continuation?.provider==='chatgpt'&&
      e.payload?.continuation?.channel==='browser').length;
    const browserIds=new Set(all.filter(e=>e.payload?.profile==='cop/continuation'&&
      e.payload?.continuation?.provider==='chatgpt'&&
      e.payload?.continuation?.channel==='browser')
      .map(e=>e.payload.continuation.continuation_id));
    const returned=all.filter(e=>e.payload?.profile==='cop.continuation-result/v1'&&
      e.payload.phase==='returned'&&browserIds.has(e.payload.continuation_id)).length;
    const wakes=all.filter(e=>e.payload?.profile==='cop.continuation-scheduler-wake/v1').length;
    const processed=all.filter(e=>e.payload?.profile==='cop.continuation-dispatch/v1'&&
      e.payload.phase==='handler_completed').length;
    const pending=listChatgptCpsWakes(store,{limit:100});
    console.log(JSON.stringify({ok:true,mode:'read_only',journal:'canonical-jhn-cop',
      mandate:{version:mandate?.version||null,browser_turn_scope:auth.granted===true},
      counts:{chatgpt_declarations:declarations,chatgpt_returned_events:returned,
        wake_events:wakes,consumer_completed_events:processed,
        pending_wakes:pending.filter(x=>x.status==='pending').length,
        reconciliation_required:pending.filter(x=>x.status==='needs_reconciliation').length},
      pending:pending.slice(0,15).map(x=>({continuation_id:x.continuation_id,status:x.status})),
      note:'No browser or model execution; no new COP effects.'},null,2));
  }finally{store.close()}
}
