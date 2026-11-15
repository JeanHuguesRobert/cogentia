/**
 * Narrow browser automation of the Principal's own ChatGPT conversation.
 * No user-authored JS, no cross-site writes, no secrets, and no generic CDP.
 * The caller MUST independently pass canonical COP mandate + budget admission.
 */
import {createGatewaySession} from './navigation-assistant/gateway-session.js';
const ORIGIN='https://chatgpt.com';
const BROWSER='fracta2-hosted';
// A visual guardrail for browser tabs used by automated Judgment handlers.
// This does not rename the ChatGPT conversation in its account sidebar.
export const JUDGMENT_TAB_MARKER='[COGENTIA JUDGMENT - NE PAS INTERAGIR]';
const GATEWAY='ws://127.0.0.1:8776/assistant';
const deny=code=>{throw Object.assign(new Error(code),{code});};
const textLimit=(s,n)=>typeof s==='string'?s.slice(0,n):'';
/** Retry only after ChatGPT itself reports a failed send and the EXACT
 * previously submitted continuation is still in the composer. A successful
 * click alone is not proof of an accepted model turn. */
export function canRecoverChatgptFailedDraft(observed={}){
 return observed.send_failure_visible===true&&
   observed.draft_bound_to_requested_continuation===true&&
   observed.composer_present===true&&
   observed.composer_blank===false&&
   observed.generating===false;
}
export function validateChatgptTurnRequest(input={}){
 if(!input||typeof input!=='object'||!['submit','observe','send_draft','ensure_tab'].includes(input.action))
   return {ok:false,error:'chatgpt_action_invalid'};
 if(input.action==='ensure_tab'){
   if(input.tab_id!==undefined||input.prompt!==undefined||
      input.expected_continuation_id!==undefined)
     return {ok:false,error:'chatgpt_ensure_tab_unexpected_arguments'};
   return {ok:true};
 }
 if(!Number.isSafeInteger(input.tab_id)||input.tab_id<1)
   return {ok:false,error:'chatgpt_target_tab_invalid'};
 if(input.action==='submit' &&
    (typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>6000))
   return {ok:false,error:'chatgpt_prompt_invalid'};
 if(input.action==='send_draft'&&
    (typeof input.expected_continuation_id!=='string'||
     !/^ctn_chatgpt_browser_[a-f0-9]{32}$/.test(input.expected_continuation_id)||
     input.prompt!==undefined))
   return {ok:false,error:'chatgpt_draft_binding_invalid'};
 if(input.action==='observe'&&input.prompt!==undefined)
   return {ok:false,error:'chatgpt_unexpected_prompt'};
 if(input.action==='observe'&&input.expected_continuation_id!==undefined&&
    !/^ctn_chatgpt_browser_[a-f0-9]{32}$/.test(input.expected_continuation_id))
   return {ok:false,error:'chatgpt_observe_binding_invalid'};
 return {ok:true};
}
export function isChatgptTabUrl(url){
 try{const u=new URL(url);return u.origin===ORIGIN&&
   (u.pathname==='/'||/^\/c\/[a-zA-Z0-9-]{8,100}$/.test(u.pathname));}
 catch{return false;}
}
const focusCode=`(() => {
  if(location.origin!=="https://chatgpt.com")return {ok:false,error:"origin_changed"};
  const e=document.querySelector("#prompt-textarea,[contenteditable=true][data-placeholder],div[contenteditable=true][role=textbox]");
  if(!e||!e.isContentEditable)return {ok:false,error:"composer_missing"};
  e.focus();return {ok:document.activeElement===e,composer_found:true};
})()`;
const submitCode=`(() => {
  if(location.origin!=="https://chatgpt.com")return {ok:false,error:"origin_changed"};
  const e=document.querySelector("#prompt-textarea,[contenteditable=true][data-placeholder],div[contenteditable=true][role=textbox]");
  if(!e||(e.innerText||"").trim().length===0)return {ok:false,error:"composer_empty"};
  const send=e.closest('form')?.querySelector('button[type="submit"][aria-label="Send"],button[data-testid="send-button"],button[type="submit"]')
    ||document.querySelector('button[data-testid="send-button"],button[aria-label="Send prompt"],button[aria-label="Envoyer le message"]');
  if(!send||send.disabled)return {ok:false,error:"send_button_not_ready"};
  send.click();
  // Label only a tab actually used to submit a governed Judgment request.
  // This cosmetic guardrail stays local to the current browser document.
  // On SPA title updates, keep the marker until full navigation/reload.
  try {
    const marker='[COGENTIA JUDGMENT - NE PAS INTERAGIR]';
    const titleNode=document.querySelector('head > title');
    const label=()=>{
      const current=document.title||'ChatGPT';
      if(!current.startsWith(marker+' | '))
        document.title=marker+' | '+current.replaceAll(marker+' | ','').slice(0,80);
    };
    label();
    if(titleNode && !titleNode.__cogentiaJudgmentTitleObserver){
      const observer=new MutationObserver(label);
      observer.observe(titleNode,{childList:true,characterData:true,subtree:true});
      Object.defineProperty(titleNode,'__cogentiaJudgmentTitleObserver',
        {value:observer,configurable:true});
    }
  }catch{/* visual warning must never modify delivery accountability */}
  return {ok:true,click_dispatched:true};
})()`;
const observeCode=`(() => {
  const expectedContinuationId=null;
  if(location.origin!=="https://chatgpt.com")return {ok:false,error:"origin_changed"};
  const assistant=[...document.querySelectorAll('[data-message-author-role="assistant"]')];
  const last=assistant.at(-1);
  const responseSelectorCounts={
    article:document.querySelectorAll('article').length,
    conversation_turn:document.querySelectorAll('[data-testid^="conversation-turn"]').length,
    data_turn_id:document.querySelectorAll('[data-turn-id]').length,
    message_role:document.querySelectorAll('[data-message-author-role]').length
  };
  const responseText=(document.querySelector('main')?.innerText||'').slice(-6000);
  const transcriptReplies=responseText.split('ChatGPT said:');
  const transcriptCount=Math.max(0,transcriptReplies.length-1);
  const transcriptAnswer=transcriptCount
    ? transcriptReplies.at(-1).split('ChatGPT can make mistakes.')[0].trim().slice(-9000)
    : '';
  const generating=!!document.querySelector('button[data-testid="stop-button"],button[aria-label="Stop generating"]');
  const input=!!document.querySelector("#prompt-textarea,[contenteditable=true][role=textbox]");
  const composer=document.querySelector("#prompt-textarea,[contenteditable=true][role=textbox]");
  const form=composer?.closest("form");
  const sendFailureVisible=/Could not send this ChatGPT message/i.test(responseText);
  const draftBound=typeof expectedContinuationId==="string"&&
    !!expectedContinuationId&&(composer?.innerText||"").includes(expectedContinuationId);
  const buttons=[...(form?.querySelectorAll("button")||[])].slice(-20).map(b=>({
    testid:b.getAttribute("data-testid")||"",
    label:b.getAttribute("aria-label")||"",
    title:b.getAttribute("title")||"",
    type:b.type||"",
    disabled:b.disabled===true,
    html_type:b.tagName.toLowerCase()
  }));
  return {ok:true,assistant_count:assistant.length,
    composer_chars:(composer?.innerText||"").length,
    composer_blank:(composer?.innerText||"").trim().length===0,
    send_failure_visible:sendFailureVisible,
    draft_bound_to_requested_continuation:draftBound,
    composer_buttons:buttons,
    response_selector_counts:responseSelectorCounts,
    response_complete_text:responseText.includes('Response complete'),
    assistant_reply_visible:transcriptCount>0,
    transcript_assistant_count:transcriptCount,
    stable_composer:!generating&&input&&
      (composer?.innerText||'').trim().length===0&&transcriptCount>0,
    transcript_answer:transcriptAnswer,
    reply_tail:responseText.slice(-1800),
    last_answer:(last?.innerText||"").slice(-9000),
    generating,composer_present:input,
    current_path:location.pathname};
})()`;
function value(result){return result?.value||{};}
export function createChatgptTurnCapability({gateway=GATEWAY,browserId=BROWSER,timeoutMs=12000,sessionFactory=createGatewaySession}={}){
 return {name:'browser.chatgpt.turn',kind:'tool',risk:'internal_recoverable',
   resultVisibility:'reasoner',costUnits:1,
   description:'Find or create an available ChatGPT tab, submit one prompt, or observe the response under signed COP authority.',
   inputSchema:{type:'object',properties:{
     action:{type:'string',enum:['ensure_tab','submit','observe','send_draft']},
     tab_id:{type:'integer',minimum:1},
     prompt:{type:'string',maxLength:6000},
     expected_continuation_id:{type:'string'},
   },required:['action'],additionalProperties:false},
   async execute(input={}){
     const v=validateChatgptTurnRequest(input);
     if(!v.ok)deny(v.error);
     const session=await sessionFactory(gateway,{timeoutMs});
     try{
       if(input.action==='ensure_tab'){
         const listed=await session.call('tabs.list',{browser_instance_id:browserId});
         if(!Array.isArray(listed?.tabs))deny('chatgpt_tabs_list_unavailable');
         // Tabs owned by the Principal are considered reusable only if
         // their actual editor is empty and the response is not generating.
         // Never overwrite an existing draft or interrupt a running turn.
         for(const candidate of listed.tabs){
           if(!Number.isSafeInteger(candidate.id)||candidate.id<1||
              !isChatgptTabUrl(candidate.url))continue;
           try{
             const reusable=await session.withTabLease(
               browserId,candidate.id,async owner=>{
                 const fresh=await owner.call('tabs.list',{browser_instance_id:browserId});
                 const same=fresh.tabs?.find(x=>x.id===candidate.id);
                 if(!same||same.url!==candidate.url)return false;
                 const result=await owner.call('page.evaluate',{
                   browser_instance_id:browserId,tabId:candidate.id,
                   expectedUrl:candidate.url,code:observeCode,
                 });
                 const observation=value(result);
                 return observation.ok===true&&observation.composer_present===true&&
                   observation.generating===false&&
                   (observation.composer_chars===0||
                    (observation.composer_chars<=2&&observation.composer_blank===true));
               },12000
             );
             if(reusable)return {browser_instance_id:browserId,tab_id:candidate.id,
               origin:ORIGIN,action:'ensure_tab',created:false,reused:true,
               url:candidate.url};
           }catch{
             // A stale tab or temporarily inaccessible document cannot
             // be treated as reusable. Continue searching other tabs.
           }
         }
         // The extension already supports tabs.create. Keep the target
         // literal: no caller-controlled URL, generic tab creation or focus.
         const created=await session.call('tabs.create',{
           browser_instance_id:browserId,url:ORIGIN+'/',active:false,
         });
         const id=created?.tab?.id;
         if(!Number.isSafeInteger(id)||id<1)deny('chatgpt_tab_creation_unconfirmed');
         const fresh=await session.call('tabs.list',{browser_instance_id:browserId});
         const actual=fresh?.tabs?.find(x=>x.id===id);
         if(!actual||!isChatgptTabUrl(actual.url))
           deny('chatgpt_created_tab_not_verified');
         return {browser_instance_id:browserId,tab_id:id,
           origin:ORIGIN,action:'ensure_tab',created:true,reused:false,
           url:actual.url};
       }
       return await session.withTabLease(browserId,input.tab_id,async owner=>{
         const tabs=await owner.call('tabs.list',{browser_instance_id:browserId});
         const tab=tabs.tabs?.find(x=>x.id===input.tab_id);
         if(!tab||!isChatgptTabUrl(tab.url))deny('chatgpt_target_changed');
         const meta={browser_instance_id:browserId,tab_id:input.tab_id,
           origin:ORIGIN};
         const rpc=async code=>value(await owner.call('page.evaluate',{
           browser_instance_id:browserId,tabId:input.tab_id,
           expectedUrl:tab.url,code}));
         if(input.action==='observe'){
           const code=input.expected_continuation_id
             ?observeCode.replace('const expectedContinuationId=null;',
                'const expectedContinuationId='+JSON.stringify(input.expected_continuation_id)+';')
             :observeCode;
           const observed=await rpc(code);
           if(!observed.ok)deny(observed.error||'chatgpt_observation_unconfirmed');
           return {...meta,action:'observe',...observed};
         }
         // Submit exactly the already staged prompt, without inserting it
         // again, only if its declared continuation ID is still present.
         if(input.action==='send_draft'){
           const code=submitCode.replace(
             'const send=e.closest',
             'if(!(e.innerText||" ").includes('+JSON.stringify(input.expected_continuation_id)+'))return {ok:false,error:"draft_binding_mismatch"};\n  const send=e.closest'
           );
           const submitted=await rpc(code);
           if(!submitted.ok)deny(submitted.error||'chatgpt_draft_submit_failed');
           return {...meta,action:'send_draft',submitted:true,
             continuation_id:input.expected_continuation_id,
             delivery_state:'ui_click_dispatched_not_model_result'};
         }
         // Preflight is a focused field only, not an arbitrary page script.
         const focus=await rpc(focusCode);
         if(!focus.ok)deny(focus.error||'chatgpt_composer_unavailable');
         const inserted=await owner.call('page.insertText',{
           browser_instance_id:browserId,tabId:input.tab_id,
           expectedUrl:tab.url,text:input.prompt});
         if(inserted?.insertedLength!==input.prompt.length||
            inserted?.tab?.id!==input.tab_id)deny('chatgpt_insert_not_confirmed');
         // React can enable the Send control slightly after insertText
         // returns. Retry only pre-click states; NEVER retry after an
         // acknowledged click because that could submit twice.
         let submitted;
         for(let attempt=0;attempt<5;attempt++){
           submitted=await rpc(submitCode);
           if(submitted.ok)break;
           if(!['send_button_not_ready','composer_empty'].includes(submitted.error))
             break;
           if(attempt<4)await new Promise(resolve=>setTimeout(resolve,180));
         }
         if(!submitted.ok)deny(submitted.error||'chatgpt_submit_not_confirmed');
         return {...meta,action:'submit',submitted:true,
           prompt_chars:input.prompt.length,
           delivery_state:'ui_click_dispatched_not_model_result'};
       },30000);
     }finally{session.close();}
   },
 };
}
