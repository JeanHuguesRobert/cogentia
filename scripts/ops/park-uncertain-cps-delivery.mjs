#!/usr/bin/env node
/** CLI recipe using the established COP temperature + CPS lineage primitives.
 * No new capability, provider call, scheduler or deletion. --apply requires
 * the operator's independently authorized execution route; inspect is read-only.
 */
import {createSqliteCopEventStore}
  from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {inspectQuarantinedBrowserDelivery,quarantineUncertainBrowserDelivery}
  from '../lib/chatgpt-cps-delivery-quarantine.js';
import {projectPacketTemperature}
  from '../../../inseme/packages/cop-core/src/packet-temperature.js';

const argv=process.argv.slice(2),apply=argv.includes('--apply');
const ids=argv.filter(x=>x.startsWith('--id='));
if(ids.length!==1||argv.length!==(apply?2:1)||
   !/^ctn_chatgpt_browser_[a-f0-9]{32}$/.test(ids[0].slice(5))){
  console.error('usage: node scripts/ops/park-uncertain-cps-delivery.mjs --id=ctn_chatgpt_browser_<32 hex> [--apply]');
  process.exitCode=2;
}else{
  const id=ids[0].slice(5),store=createSqliteCopEventStore('/var/lib/cogentia/cop/john-root-v1.sqlite');
  try{
    const preview=inspectQuarantinedBrowserDelivery(store,id);
    const parent=preview.parent_ref;
    const p=parent?projectPacketTemperature(store,{packet_ref:parent}):null;
    if(!apply){
      console.log(JSON.stringify({ok:preview.ok,status:preview.status,
        continuation_id:id,parent_ref:parent||null,
        parent_temperature:p?.temperature||null,
        quarantined:preview.quarantined||false,
        retry_authorized:false,canonical_audit:store.auditCommitments().ok}));
    }else{
      const result=quarantineUncertainBrowserDelivery(store,{continuation_id:id});
      console.log(JSON.stringify({ok:result.ok,status:result.status,
        continuation_id:id,parent_ref:result.parent_ref||null,
        quarantined:result.quarantined||false,
        retry_authorized:false,duplicate:result.duplicate||false,
        causal_receipt_ref:result.quarantine_receipt_ref||null,
        canonical_audit:store.auditCommitments().ok}));
      if(!result.ok)process.exitCode=1;
    }
  }finally{store.close()}
}
