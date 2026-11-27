/** Compile a trusted, data-only recipe plan into the existing signed John v1 path.
 * This code changes on the daemon, never in the extension worker.
 */
import {FORM_PLANNER} from './browser-form-recipes.js';
export async function prepareFormAssistRequest({inspect,recipe_id,version=1,field_type,selection,
  tab_id,expected_url,text,request_id,operation='insert-at-selection',browser_instance_id,planner=FORM_PLANNER}={}){
 if(typeof inspect!=='function')throw Error('trusted_structure_inspector_required');
 if(typeof request_id!=='string'||!/^[-\w:.]{1,120}$/.test(request_id))throw Error('request_id_invalid');
 const structure=await inspect({action:'structure',tab_id,...(operation==='replace-all'?{browser_instance_id,expected_url,include_element_identity:true}:{})});
 const plan=planner.plan({recipe_id,version,field_type,selection,structure,tab_id,expected_url,text,operation,browser_instance_id});
 // Do not invent authority: resulting packet must still pass the MCP's
 // independent Principal signature, per-capability COP and budget gate.
 return {version:'john.request.v1',request_id,principal:{id:'principal:jhn'},
  mandate:{id:'mandate:chatgpt-corpus-coding',version:'v1'},
  budget:{id:'budget:mandate:jhn:form-assist'},
  execution_budget:{max_steps:4,max_tool_calls:1,max_subagents:0,
   max_elapsed_ms:12000,max_external_effects:0,max_internal_effects:1},
  exposure:'bounded',capability:plan.capability,
  input:{prompt:operation==='replace-all'?'Replace non-secret text in the identified field. Do not submit.':'Insert non-secret text into a selected field. Do not submit.',arguments:plan.arguments},
  handler:{id:'capability.once.bounded',kind:'capability_once_bounded',allowed_capabilities:[plan.capability]}};
}
