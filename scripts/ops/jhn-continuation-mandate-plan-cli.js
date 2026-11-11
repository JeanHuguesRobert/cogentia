#!/usr/bin/env node
/** #299 — Principal's read-only canonical COP inventory.
 * No SQL mutation, consent request, grant, issuer, budget reservation or effect.
 * Invoked from the owner's existing SSH session on Fracta2, not via MCP shell.
 */
import {openExistingJohnCopStore} from '../lib/john-cop-existing-store.js';
import {johnContinuationMandatePlan} from '../lib/jhn-continuation-mandate-plan.js';
const PATH='/var/lib/cogentia/cop/john-root-v1.sqlite';

export function inspectJohnContinuationPlan(path=PATH) {
  const opened=openExistingJohnCopStore(path);
  if(!opened.ok)return {ok:false,error:opened.error,mutated:false};
  try {
    const result=johnContinuationMandatePlan({store:opened.store});
    if(!result.ok)return {ok:false,error:result.error,mutated:false};
    if(result.already_authorized_in_scope)
      return {ok:true,already_authorized_in_scope:true,mandate_ref:result.mandate_ref,
        version:result.version,mutated:false};
    // Scope/identity, not human/agent credentials. No raw SQLite event dumps.
    return {ok:true,kind:'cogentia.jhn_continuation_mandate_plan.v1',
      mandate_ref:result.mandate_ref,previous_version:result.previous_version,
      added_capabilities:result.added_capabilities,
      budget_snapshot_for_review:result.budget_snapshot_for_review,
      mandate:result.mandate,requires_owner_consent:true,
      challenge_created:false,mandate_amended:false,mutated:false};
  } finally {opened.close();}
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  if(process.argv.length!==2) {
    console.error(JSON.stringify({ok:false,error:'no_arguments_allowed'}));
    process.exitCode=2;
  } else {
    const result=inspectJohnContinuationPlan();
    console.log(JSON.stringify(result,null,2));
    if(!result.ok)process.exitCode=1;
  }
}
