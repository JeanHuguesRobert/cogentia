#!/usr/bin/env node
/** Governed, exact-match cleanup of an OWN previously completed CPS draft.
 * A new browser.chatgpt.turn action, not a raw CDP bypass. No sending,
 * new provider, scheduler, or synthetic result. Supports read-only preview.
 */
import {createHash}from'node:crypto';
import {createSqliteCopEventStore}from'../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import{buildAssignedChatgptCpsPrompt}from'../lib/chatgpt-cps-assigned-dispatch.js';
import{createGovernedJohnBrowserAction}from'../lib/chatgpt-cps-john-dispatch.js';
import{createGatewaySession}from'../lib/navigation-assistant/gateway-session.js';
import{loadEnvFiles}from'../../../operium/lib/node-agent/job-env.js';

const DB='/var/lib/cogentia/cop/john-root-v1.sqlite';
const argv=process.argv.slice(2),idFlag=argv.filter(x=>x.startsWith('--id=')),tabFlag=argv.filter(x=>x.startsWith('--tab='));
const apply=argv.includes('--apply');
const id=idFlag[0]?.slice(5),tab=Number(tabFlag[0]?.slice(6));
if(idFlag.length!==1||tabFlag.length!==1||argv.length!==(apply?3:2)||
   !/^ctn_chatgpt_browser_[a-f0-9]{32}$/.test(id||'')||
   !Number.isSafeInteger(tab)||tab<1){
  console.error('usage: node scripts/ops/clear-owned-cps-browser-draft.mjs --id=<completed cps id> --tab=<root tab ID> [--apply]');
  process.exitCode=2;
}else{
  const st=createSqliteCopEventStore(DB);
  try{
    const child=st.listTopic('continuation:'+id);
    const c=child.find(x=>x.payload?.profile==='cop/continuation')?.payload?.continuation;
    const parentId=c?.state?.assignment_ref?.startsWith('legacy:')
      ?c.state.assignment_ref.slice('legacy:'.length):null;
    const parent=parentId?st.listTopic('continuation:'+parentId):[];
    const returned=child.find(e=>e.payload?.profile==='cop.continuation-result/v1'&&
      e.payload?.phase==='returned');
    const settled=parent.find(e=>e.payload?.profile==='cogentia.legacy-continuation-settlement/v1'&&
      e.payload?.phase==='local_resolution_confirmed');
    const completed=child.some(e=>e.payload?.profile==='cop.continuation-dispatch/v1'&&
      e.payload?.phase==='handler_completed'&&e.payload.parent_packet_status==='completed');
    const prompt=buildAssignedChatgptCpsPrompt(c);
    if(!returned||!settled||!completed||!prompt.ok){
      console.log(JSON.stringify({ok:false,status:'canonical_source_not_completed'}));
      process.exitCode=1;
    }else{
      const proofId='cps-browser:owned-draft-cleared:'+id+':tab:'+tab;
      const already=st.eventByIdempotency(proofId);
      if(already){
        console.log(JSON.stringify({ok:true,status:'already_cleared',duplicate:true,
          receipt_ref:proofId}));
      }else{
        const gateway=await createGatewaySession('ws://127.0.0.1:8776/assistant',{timeoutMs:8000});
        let match=false;
        try{
          const tabs=await gateway.call('tabs.list',{browser_instance_id:'fracta2-hosted'});
          const target=tabs?.tabs?.find(t=>t.id===tab);
          if(target&&target.url==='https://chatgpt.com/'&&
             !String(target.title||'').startsWith('[COGENTIA JUDGMENT - NE PAS INTERAGIR]')){
            const code=`(() => {if(location.origin!=="https://chatgpt.com"||location.pathname!=="/")return {ok:false};const expected=${JSON.stringify(prompt.prompt)};const editor=document.querySelector('#prompt-textarea,[contenteditable=true][role=textbox]');const actual=editor?.innerText||'';const norm=x=>x.replace(/\\r/g,'').replace(/\\n{2,}/g,'\\n').trim();const active=!!document.querySelector('button[data-testid="stop-button"],button[aria-label="Stop generating"]');return {ok:true,match:!!editor&&editor.isContentEditable&&norm(actual)===norm(expected)&&!active};})()`;
            const result=await gateway.withTabLease('fracta2-hosted',tab,
              o=>o.call('page.evaluate',{browser_instance_id:'fracta2-hosted',
                tabId:tab,expectedUrl:target.url,code}),8000);
            match=(result?.value||result)?.match===true;
          }
        }finally{gateway.close()}
        if(!match){
          console.log(JSON.stringify({ok:false,status:'owned_draft_mismatch_or_tab_not_safe',
            tab_id:tab,source_child_id:id}));
          process.exitCode=1;
        }else if(!apply){
          console.log(JSON.stringify({ok:true,status:'owned_draft_verified_no_effect',
            source_child_id:id,tab_id:tab,clearing_authorized:false}));
        }else{
          const env=loadEnvFiles(['/srv/cogentia/secrets/ona.env',
            '/srv/cogentia/secrets/cps-john.env'],process.env);
          const invoke=createGovernedJohnBrowserAction({token:env.COGENTIA_MCP_JHN_TOKEN});
          // The first attempt's John budget was settled but the browser
          // script failed to parse. Its effect was independently verified
          // absent. Use a distinct canonical John request ID; never replay
          // the already-accounted original request.
          const result=await invoke('clear_owned_draft',id,{action:'clear_owned_draft',
            tab_id:tab,expected_continuation_id:id,expected_prompt:prompt.prompt},1);
          if(!result.ok||result.observation?.cleared!==true){
            console.log(JSON.stringify({ok:false,status:'governed_clear_needs_reconciliation',
              diagnostic_code:result.error||'john_clear_receipt_missing',
              source_child_id:id,tab_id:tab}));
            process.exitCode=1;
          }else{
            const e=st.append({topic_id:'continuation:'+id,event_type:'cop.event/v1',
              actor_id:'cop:cps-owned-draft-cleanup',subject_ref:'continuation:'+id,
              visibility:'restricted',epistemic_status:'observed',
              idempotency_key:proofId,
              causal_refs:[returned.idempotency_key,settled.idempotency_key,
                'john:'+result.request_id],
              payload:{profile:'cogentia.cps-browser-owned-draft/v1',
                phase:'verified_owned_draft_cleared',source_continuation_id:id,
                source_parent_ref:'continuation:'+parentId,
                source_prompt_sha256:createHash('sha256').update(prompt.prompt).digest('hex'),
                tab_id:tab,confirmed_by_john:true,send_effects:0},
            });
            console.log(JSON.stringify({ok:e.ok,status:e.ok?'cleared':'receipt_not_committed',
              source_child_id:id,tab_id:tab,receipt_ref:e.ok?proofId:null,
              canonical_audit:st.auditCommitments().ok}));
            if(!e.ok)process.exitCode=1;
          }
        }
      }
    }
  }finally{st.close()}
}
