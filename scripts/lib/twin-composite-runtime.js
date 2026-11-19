/**
 * Composite Digital Twin runtime adapter.
 *
 * Shared Core is Inseme COP: no second actor registry or mandate ledger.
 * The caller MUST be independently authenticated by its surface. This module
 * additionally verifies the currently effective COP mandate; a declaration
 * is not an issuer of independent authority. Supervised members are named
 * work specializations of John's replaceable handler, not new Principals.
 */
import {existsSync,statSync,realpathSync} from 'node:fs';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {evaluateMandate,resolveMandate} from '../../../inseme/packages/cop-core/src/governed-act.js';
import {declareLogicalAgent,transitionLogicalAgent,projectLogicalAgent,
  listTwinLogicalAgents} from '../../../inseme/packages/cop-core/src/logical-agent-composition.js';
import {dispatchLogicalAgentMission} from '../../../inseme/packages/cop-core/src/logical-agent-mission.js';
import {createEventSourcedExecutionBudgetLedger} from '../../../inseme/packages/cop-core/src/execution-budget.js';
import {createAiRouterClient} from './ai-router-client.js';
import {openExistingJohnCopStore} from './john-cop-existing-store.js';

const REF=/^[A-Za-z0-9][A-Za-z0-9_.:/@-]{2,255}$/;
const valid=x=>typeof x==='string'&&REF.test(x);
const refuse=error=>({ok:false,error});
export const JHN_COMPOSITE_DEFAULTS=Object.freeze({
  db:'/var/lib/cogentia/cop/john-root-v1.sqlite',
  principal_ref:'principal:jhn',coordinator_ref:'agent:jhn',
  twin_root_ref:'twin:jhn',mandate_ref:'mandate:jhn:john-root',
  budget_id:'budget:mandate:jhn:john-root',
  model:'fractavolta-guide',
});
function existingDb(db,write=false){
  if(!existsSync(db))throw new Error('canonical_cop_store_not_found');
  const canonical=realpathSync(db),stat=statSync(canonical);
  if(!stat.isFile())throw new Error('canonical_cop_store_not_file');
  if(write&&process.getuid?.()!==stat.uid)
    throw new Error('cop_store_owner_required');
  return canonical;
}
function authDecision(store,options){
  const current=resolveMandate(store,options.mandate_ref);
  if(!current)return refuse('root_mandate_missing');
  const verdict=evaluateMandate(store,{mandate_ref:options.mandate_ref,
    version_pin:current.version,
    expected_principal_ref:options.principal_ref,
    expected_actor_ref:options.coordinator_ref,
    capability:'host.process.run'});
  if(!verdict.granted)return refuse(verdict.error||'mandate_refused');
  return {ok:true,version:current.version};
}
/** Injected store/router make the identical Core accessible from CLI, MCP and tests. */
export function createTwinCompositeRuntime({
  store,router,options=JHN_COMPOSITE_DEFAULTS,
}={}){
  if(!store||typeof store.replay!=='function'||typeof store.listTopic!=='function')
    throw new TypeError('COP event store required');
  const cfg={...JHN_COMPOSITE_DEFAULTS,...options};
  const mandate=()=>authDecision(store,cfg);
  const list=({member_of=null}={})=>
    listTwinLogicalAgents(store,{twin_root_ref:cfg.twin_root_ref,member_of});
  const declare=(data)=>{
    const check=mandate();
    if(!check.ok)return check;
    if(!valid(data?.agent_ref)||!data.agent_ref.startsWith('agent:')||
       data.twin_root_ref!==cfg.twin_root_ref||
       !valid(data.profile_ref)||!Array.isArray(data.member_of)||
       !data.member_of.every(valid)||
       !valid(data.declaration_id)||data.declaration_id.length>160)
      return refuse('invalid_member_declaration');
    return declareLogicalAgent(store,{...data,issued_by_ref:cfg.coordinator_ref,
      reports_to:cfg.coordinator_ref,spawned_by:cfg.coordinator_ref,
      metadata:{...(data.metadata||{}),managed_as:'supervised_member'},
    });
  };
  const activate=({agent_ref,expected_revision,operation_id}={})=>{
    const check=mandate();
    if(!check.ok)return check;
    const agent=projectLogicalAgent(store,{agent_ref});
    if(!agent.ok||!agent.exists)return refuse('member_not_found');
    if(agent.twin_root_ref!==cfg.twin_root_ref||
       agent.reports_to!==cfg.coordinator_ref)return refuse('not_managed_member');
    return transitionLogicalAgent(store,{agent_ref,to_status:'available',
      expected_revision,operation_id,issued_by_ref:cfg.coordinator_ref});
  };
  const run=async({agent_ref,packet_ref,mission_id,prompt,
    disclosure_class='public'}={})=>{
    const check=mandate();
    if(!check.ok)return check;
    const agent=projectLogicalAgent(store,{agent_ref});
    if(!agent.ok||!agent.exists)return refuse('member_not_found');
    if(agent.twin_root_ref!==cfg.twin_root_ref||
       agent.reports_to!==cfg.coordinator_ref)return refuse('not_managed_member');
    if(typeof prompt!=='string'||!prompt.trim()||prompt.length>4000||
       disclosure_class!=='public')return refuse('public_bounded_prompt_required');
    if(!router||typeof router.chatCompletions!=='function')
      return refuse('model_handler_unavailable');
    const handler={
      id:'handler:magistral:'+cfg.model,
      async invoke(){
        const result=await router.chatCompletions({
          model:cfg.model,stream:false,max_tokens:280,
          messages:[
            {role:'system',content:
              'You are a supervised cognitive execution handler. '+
              'Named member: '+agent_ref+'. Profile: '+agent.profile_ref+
              '. Produce a concise factual analysis. Do not use tools or '+
              'make external commitments. You do not hold independent authority.'},
            {role:'user',content:prompt.trim()},
          ],
        });
        if(!result.ok)throw Error('magistral_'+(result.error||result.status));
        const text=result.body?.choices?.[0]?.message?.content;
        if(typeof text!=='string'||!text.trim())
          throw Error('magistral_missing_response');
        return {text,model:cfg.model,
          execution_usage:{max_steps:1},
          usage_observation:result.body?.usage||null};
      },
    };
    const ledger=createEventSourcedExecutionBudgetLedger({
      store,budget_id:cfg.budget_id,require_authority_grant:true});
    const result=await dispatchLogicalAgentMission({store,agent_ref,packet_ref,
      mission_id,commissioned_by_agent_ref:cfg.coordinator_ref,
      identity:{principal_ref:cfg.principal_ref,
        mandate_ref:cfg.mandate_ref,
        logical_agent_ref:cfg.coordinator_ref,version_pin:check.version},
      capability:'host.process.run',handler,ledger,demand:{max_steps:1},
      input:{prompt:prompt.trim(),purpose:'bounded_cognitive_analysis',
        disclosure_class},
    });
    return {ok:result.ok,status:result.status,error:result.error||null,
      execution_relation:result.execution_relation,
      agent_ref,packet_ref,mission_id,
      authority_agent_ref:result.authority_agent_ref||cfg.coordinator_ref,
      handler_instance_ref:handler.id,
      act_id:result.act_id||null,
      receipt:result.receipt||null,
      text:result.effect?.text||null};
  };
  return {list,declare,activate,run,inspect:({agent_ref}={})=>
    projectLogicalAgent(store,{agent_ref})};
}

/** Existing JHN profile is a deployment adapter, not a Core special case. */
export function openJohnCompositeRuntime({readOnly=false,db,router,
  env=process.env}={}){
  const pathname=existingDb(db||env.COGENTIA_JOHN_COP_STORE_PATH||
    JHN_COMPOSITE_DEFAULTS.db,!readOnly);
  if(readOnly){
    const x=openExistingJohnCopStore(pathname);
    if(!x.ok)throw Error(x.error);
    return {runtime:createTwinCompositeRuntime({store:x.store}),close:x.close};
  }
  const store=createSqliteCopEventStore(pathname);
  return {runtime:createTwinCompositeRuntime({store,
    router:router||createAiRouterClient(),options:JHN_COMPOSITE_DEFAULTS}),
    close:()=>store.close()};
}
