/**
 * ONA's thin optional runtime binding to the EXISTING John/COP browser turn.
 * Required environment is operator-managed and NEVER inferred from an MCP
 * message, model answer or browser cookie. No new authorization issuer.
 * The same governed adapter also prepares child questions explicitly proposed
 * by the designated JudgmentHandler. No independent second LLM or scheduler.
 */
import {resolveMandate,evaluateMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {createCpsGovernedJohnBrowserDispatch} from './chatgpt-cps-john-dispatch.js';
import {prepareAssignedChatgptCpsContinuation} from './chatgpt-cps-assignment.js';
import {dispatchAssignedChatgptCpsContinuation} from './chatgpt-cps-assigned-dispatch.js';
const REF='mandate:jhn:john-root';
const BUDGET='budget:'+REF;
export function createCpsDefaultAssignedWorker({store,env={},verifyIssuer,
  fetchImpl}={}){
  if(store?.kind!=='sqlite'||typeof verifyIssuer!=='function'||
      env.COGENTIA_CPS_BROWSER_DISPATCH_ENABLED!=='1')return null;
  const reviewed=String(env.COGENTIA_CPS_BROWSER_DISPATCH_PERMITTED_CHANNELS||'')
    .split(',').map(x=>x.trim());
  // This is a separate OPERATOR-REVIEWED channel permission reference. It
  // must identify genuine provider permission; merely setting the variable
  // does not establish legal/provider authorization. Never auto-enable it.
  const evidence=String(env.COGENTIA_CPS_BROWSER_PROVIDER_PERMISSION_REF||'').trim();
  const token=String(env.COGENTIA_MCP_JHN_TOKEN||'');
  const tab=env.COGENTIA_CPS_BROWSER_TAB_ID;
  const tab_id=tab==null||tab===''?undefined:Number(tab);
  if(!reviewed.includes('chatgpt:browser')||!evidence||evidence.length>180||
     !token||(tab_id!==undefined&&(!Number.isSafeInteger(tab_id)||tab_id<1)))
    return null;
  let dispatch;
  try{dispatch=createCpsGovernedJohnBrowserDispatch({token,tab_id,fetchImpl});}
  catch{return null}
  const admit=async()=>{
    const mandate=resolveMandate(store,REF);
    if(!mandate)return {granted:false};
    const issuer=verifyIssuer({mandate,mandate_ref:REF,store});
    if(issuer?.verified!==true||issuer.principal_ref!=='principal:jhn'||
       issuer.mandate_ref!==REF)return {granted:false};
    const authority=evaluateMandate(store,{mandate_ref:REF,
      version_pin:mandate.version,expected_principal_ref:'principal:jhn',
      expected_actor_ref:'agent:jhn',capability:'browser.chatgpt.turn'});
    const policy=mandate.scope?.chatgpt_turn_policy;
    if(authority.granted!==true||policy?.origin!=='https://chatgpt.com'||
       policy.browser_instance_id!=='fracta2-hosted'||
       policy.require_cop_result_receipt!==true)
      return {granted:false};
    const ledger=createEventSourcedExecutionBudgetLedger({store,budget_id:BUDGET,
      require_authority_grant:true});
    const snapshot=ledger.snapshot();
    // Status, ensure_tab (if needed), and submit are each separately
    // budgeted John requests. This availability is a preflight; the
    // authoritative executor still performs its own atomic reservations.
    const required=tab_id===undefined?9:6;
    if(snapshot.has_grant!==true||
       (snapshot.available?.max_steps||0)<required)
      return {granted:false};
    const grant=store.listTopic('execution-budget:'+BUDGET)
      .find(e=>e.event_type==='ExecutionBudgetGrant'&&
        e.payload?.mandate_ref===REF);
    if(!grant)return {granted:false};
    return {granted:true,provider_permitted:true,budget_admitted:true,
      authorization_ref:REF+'@'+mandate.version,
      provider_permission_receipt_ref:evidence,
      budget_authorization_ref:grant.idempotency_key||'cop:event:'+grant.event_id};
  };
  return {admit,dispatch};
}

/** Child candidate after the admitted JudgmentHandler says `continue` and
 * provides the next cognitive question. Only that agent decides the question;
 * actual John/partner/claim/budget gates remain unchanged. */
export function createCpsDefaultNextWorker({store,assignedWorker}={}){
  if(store?.kind!=='sqlite'||typeof assignedWorker?.admit!=='function'||
     typeof assignedWorker?.dispatch!=='function')return null;
  return {
    admit:async({continuation_id,action_id,next_question})=>{
      if(typeof next_question!=='string'||!next_question.trim()||
         next_question.length>4500||typeof action_id!=='string')
        return {granted:false};
      const declaration=store.listTopic('continuation:'+continuation_id)
        .find(e=>e.payload?.profile==='cop/continuation')?.payload?.continuation;
      if(declaration?.provider!=='chatgpt'||declaration.channel!=='browser')
        return {granted:false};
      const current=resolveMandate(store,REF);
      const max=current?.scope?.chatgpt_turn_policy?.max_consecutive_turns;
      const hop=declaration?.state?.hop_count||0;
      if(!Number.isSafeInteger(max)||hop+1>=max)return {granted:false};
      const authority=await assignedWorker.admit({continuation:declaration});
      return authority?.granted===true?{...authority,action_id}:{granted:false};
    },
    dispatch:async({continuation_id,action_id,next_question})=>{
      if(typeof next_question!=='string'||!next_question.trim())return {ok:false};
      const parent=store.listTopic('continuation:'+continuation_id)
        .find(e=>e.payload?.profile==='cop/continuation')?.payload?.continuation;
      if(!parent)return {ok:false};
      const hop=(parent.state?.hop_count||0)+1;
      const created=await prepareAssignedChatgptCpsContinuation({store,
        task_ref:'cps:'+continuation_id+':'+action_id,
        question:next_question,hop_count:hop});
      if(!created.ok)return {ok:false};
      const sent=await dispatchAssignedChatgptCpsContinuation({store,
        continuation_id:created.continuation_id,
        admit:assignedWorker.admit,dispatch:assignedWorker.dispatch});
      if(!sent.ok)return {ok:false};
      return {ok:true,child_continuation_id:created.continuation_id,
        execution_receipt_ref:sent.receipt_ref};
    },
  };
}
