/**
 * Narrow browser automation of the Principal's own ChatGPT conversation.
 * No user-authored JS, no cross-site writes, no secrets, and no generic CDP.
 * The caller MUST independently pass canonical COP mandate + budget admission.
 */
import {createGatewaySession} from './navigation-assistant/gateway-session.js';
const ORIGIN='https://chatgpt.com';
const BROWSER='fracta2-hosted';
const GATEWAY='ws://127.0.0.1:8776/assistant';
const deny=code=>{throw Object.assign(new Error(code),{code});};
const textLimit=(s,n)=>typeof s==='string'?s.slice(0,n):'';
export function validateChatgptTurnRequest(input={}){
 if(!input||typeof input!=='object'||!['submit','observe'].includes(input.action))
   return {ok:false,error:'chatgpt_action_invalid'};
 if(!Number.isSafeInteger(input.tab_id)||input.tab_id<1)
   return {ok:false,error:'chatgpt_target_tab_invalid'};
 if(input.action==='submit' &&
    (typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>6000))
   return {ok:false,error:'chatgpt_prompt_invalid'};
 if(input.action==='observe'&&input.prompt!==undefined)
   return {ok:false,error:'chatgpt_unexpected_prompt'};
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
  const send=document.querySelector('button[data-testid="send-button"],button[aria-label="Send prompt"],button[aria-label="Envoyer le message"]');
  if(!send||send.disabled)return {ok:false,error:"send_button_not_ready"};
  send.click();return {ok:true,click_dispatched:true};
})()`;
const observeCode=`(() => {
  if(location.origin!=="https://chatgpt.com")return {ok:false,error:"origin_changed"};
  const assistant=[...document.querySelectorAll('[data-message-author-role="assistant"]')];
  const last=assistant.at(-1);
  const generating=!!document.querySelector('button[data-testid="stop-button"],button[aria-label="Stop generating"]');
  const input=!!document.querySelector("#prompt-textarea,[contenteditable=true][role=textbox]");
  return {ok:true,assistant_count:assistant.length,
    last_answer:(last?.innerText||"").slice(-9000),
    generating,composer_present:input,
    current_path:location.pathname};
})()`;
function value(result){return result?.value||{};}
export function createChatgptTurnCapability({gateway=GATEWAY,browserId=BROWSER,timeoutMs=12000,sessionFactory=createGatewaySession}={}){
 return {name:'browser.chatgpt.turn',kind:'tool',risk:'internal_recoverable',
   resultVisibility:'private',costUnits:1,
   description:'Submit one prompt to Principal-owned ChatGPT Brave tab or observe its answer, under pre-admitted COP authority.',
   inputSchema:{type:'object',properties:{
     action:{type:'string',enum:['submit','observe']},
     tab_id:{type:'integer',minimum:1},
     prompt:{type:'string',maxLength:6000},
   },required:['action','tab_id'],additionalProperties:false},
   async execute(input={}){
     const v=validateChatgptTurnRequest(input);
     if(!v.ok)deny(v.error);
     const session=await sessionFactory(gateway,{timeoutMs});
     try{
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
           const observed=await rpc(observeCode);
           if(!observed.ok)deny(observed.error||'chatgpt_observation_unconfirmed');
           return {...meta,action:'observe',...observed};
         }
         // Preflight is a focused field only, not an arbitrary page script.
         const focus=await rpc(focusCode);
         if(!focus.ok)deny(focus.error||'chatgpt_composer_unavailable');
         const inserted=await owner.call('page.insertText',{
           browser_instance_id:browserId,tabId:input.tab_id,
           expectedUrl:tab.url,text:input.prompt});
         if(inserted?.insertedLength!==input.prompt.length||
            inserted?.tab?.id!==input.tab_id)deny('chatgpt_insert_not_confirmed');
         const submitted=await rpc(submitCode);
         if(!submitted.ok)deny(submitted.error||'chatgpt_submit_not_confirmed');
         return {...meta,action:'submit',submitted:true,
           prompt_chars:input.prompt.length,
           delivery_state:'ui_click_dispatched_not_model_result'};
       },30000);
     }finally{session.close();}
   },
 };
}
