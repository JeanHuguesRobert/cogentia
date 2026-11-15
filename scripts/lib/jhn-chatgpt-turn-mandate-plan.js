/**
 * Standing JHN browser-ChatGPT turn delegation: existing owner-authenticated
 * COP consent and existing canonical budget; no automatic grant on planning.
 */
import {resolveMandate,isMandateActive} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
const REF='mandate:jhn:john-root';
const CAP='browser.chatgpt.turn';
const fail=error=>({ok:false,error,mandate_amended:false});
export function johnChatgptTurnMandatePlan({store,at_time=new Date()}={}){
 if(typeof store?.replay!=='function'||typeof store?.listTopic!=='function')return fail('canonical_store_required');
 const current=resolveMandate(store,REF);
 if(!current||!isMandateActive(store,REF)||current.status!=='active'||
    current.principal_ref!=='principal:jhn'||current.logical_agent_ref!=='agent:jhn'||
    !/^v[1-9]\d*$/.test(current.version||'')||
    !Array.isArray(current.scope?.allowed_actions))return fail('root_mandate_unavailable');
 const now=+at_time;
 if(!Number.isFinite(now)||(current.valid_from&&Date.parse(current.valid_from)>now)||
    (current.valid_until&&Date.parse(current.valid_until)<=now))return fail('mandate_expired');
 if((current.scope.forbidden_actions||[]).includes(CAP))return fail('browser_chatgpt_turn_forbidden');
 if(current.scope.allowed_actions.includes(CAP))return {ok:true,already_authorized_in_scope:true,mandate_ref:REF,version:current.version,mandate_amended:false};
 const grants=store.replay().filter(e=>e.payload?.kind==='ExecutionBudgetGrant'&&e.payload.mandate_ref===REF);
 const ids=[...new Set(grants.map(e=>e.payload.budget_id))];
 if(ids.length!==1)return fail('canonical_budget_not_unique');
 const budget=createEventSourcedExecutionBudgetLedger({store,budget_id:ids[0],require_authority_grant:true}).snapshot();
 if(!budget.has_grant||budget.mandate_ref!==REF||
    !Number.isInteger(budget.available?.max_steps)||budget.available.max_steps<1)
   return fail('canonical_budget_unavailable');
 const scope=structuredClone(current.scope);
 scope.allowed_actions=[...scope.allowed_actions,CAP];
 // The structured target policy is additional narrowing, not a magic
 // permission for generic web editing.
 scope.chatgpt_turn_policy={origin:'https://chatgpt.com',
    browser_instance_id:'fracta2-hosted',
    operations:['submit_prompt','observe_result'],
    third_party_communication:false,
    prompt_publication:false,
    max_prompt_chars:6000,
    max_consecutive_turns:8,
    require_tab_epoch_guard:true,
    require_cop_result_receipt:true};
 const mandate={mandate_ref:REF,principal_ref:'principal:jhn',
   expected_version:current.version,scope,valid_from:current.valid_from,
   valid_until:current.valid_until,
   reason:'Délégation permanente au jumeau numérique pour lancer et reprendre des tours ChatGPT dans le Brave hébergé, avec résultat COP corrélé et budget existant; aucun droit d écriture générale sur les autres sites.'};
 return {ok:true,requires_owner_consent:true,mandate_ref:REF,
    previous_version:current.version,added_capabilities:[CAP],
    target_policy:scope.chatgpt_turn_policy,mandate,
    budget_snapshot_for_review:{budget_id:budget.budget_id,available:budget.available,limits:budget.limits},
    mandate_amended:false};
}
