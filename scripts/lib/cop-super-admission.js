/** #299: preflight against canonical Inseme authority; never mints a grant. */
export function assessCopSuperAdmission({store,evaluateMandate,ledger,mandate_ref,principal_ref,actor_ref,capability='host.process.run',demand,target,execution_mode}={}) {
  const refuse=error=>({ok:false,admitted:false,error,reservation:null});
  if(execution_mode!=='super')return refuse('super_mode_required');
  if(!target||!mandate_ref||!principal_ref||!actor_ref)return refuse('authority_context_required');
  if(!store||typeof store.listTopic!=='function'||typeof store.append!=='function'||typeof evaluateMandate!=='function')return refuse('canonical_authority_unavailable');
  if(!ledger||typeof ledger.snapshot!=='function'||typeof ledger.reserve!=='function')return refuse('canonical_budget_unavailable');
  if(!demand||typeof demand!=='object'||Array.isArray(demand)||!Object.keys(demand).length)return refuse('budget_demand_required');
  let grant;
  try { grant=evaluateMandate(store,{mandate_ref,expected_principal_ref:principal_ref,expected_actor_ref:actor_ref,capability,demand}); }
  catch { return refuse('canonical_authority_evaluation_failed'); }
  if(grant?.granted!==true)return refuse(grant?.error||'mandate_denied');
  if(grant.mandate_ref!==mandate_ref||grant.principal_ref!==principal_ref)return refuse('authority_identity_mismatch');
  let snapshot;
  try {snapshot=ledger.snapshot();}catch{return refuse('canonical_budget_unavailable');}
  if(!snapshot?.has_grant||snapshot.mandate_ref!==mandate_ref)return refuse('budget_authority_mismatch');
  // Admission is not execution: Inseme must atomically reserve budget before dispatch.
  return {ok:true,admitted:true,grant,reservation:null,requires_canonical_reservation:true,target,execution_mode};
}
