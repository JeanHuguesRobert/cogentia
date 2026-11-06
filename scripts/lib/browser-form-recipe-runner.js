/** Compile a trusted, data-only recipe plan into the existing signed John v1 path.
 * This code changes on the daemon, never in the extension worker.
 */
import {FORM_RECIPES} from './browser-form-recipes.js';
export async function prepareFormAssistRequest({inspect,recipe_id,version=1,
  tab_id,expected_url,text,request_id,registry=FORM_RECIPES}={}){
 if(typeof inspect!=='function')throw Error('trusted_structure_inspector_required');
 if(typeof request_id!=='string'||!/^[-\w:.]{1,120}$/.test(request_id))throw Error('request_id_invalid');
 const structure=await inspect({action:'structure',tab_id});
 const plan=registry.plan({recipe_id,version,structure,tab_id,expected_url,text});
 // Do not invent authority: resulting packet must still pass the MCP's
 // independent Principal signature, per-capability COP and budget gate.
 return {version:'john.request.v1',request_id,principal:{id:'principal:jhn'},
  mandate:{id:'mandate:chatgpt-corpus-coding',version:'v1'},
  budget:{id:'budget:mandate:jhn:form-assist'},
  execution_budget:{max_steps:4,max_tool_calls:1,max_subagents:0,
   max_elapsed_ms:12000,max_external_effects:0,max_internal_effects:1},
  exposure:'bounded',capability:plan.capability,
  input:{prompt:'Insert non-secret text into a selected field. Do not submit.',arguments:plan.arguments},
  handler:{id:'capability.once.bounded',kind:'capability_once_bounded',allowed_capabilities:[plan.capability]}};
}
