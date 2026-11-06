/** FBF: never confuse ordinary sudo denial with global super unavailability.
 * Pure decision: remote route discovery is evidence, never authorization.
 */
export function decideFractaExecutionRoute({requires_root=false,normal={},super_broker={},grant={},principal_signature_required=false}={}){
 if(principal_signature_required)return {route:'principal_signature',executable:false,
  reason:'independent_personal_key_required'};
 if(!requires_root&&normal.reachable===true)return {route:'normal',executable:true,reason:'unprivileged_shell_reachable'};
 if(!requires_root)return {route:'discover',executable:false,reason:'normal_shell_not_verified'};
 if(super_broker.reachable!==true)return {route:'discover_super',executable:false,
  reason:'normal_sudo_denial_does_not_prove_super_unavailable'};
 if(grant.issuer_verified!==true||grant.payload_bound!==true||
    grant.budget_reserved!==true||grant.not_expired!==true)return {route:'super_prepare',
   executable:false,reason:'real_super_broker_available_but_effect_authority_unverified'};
 return {route:'super',executable:true,reason:'effect_specific_super_authority_confirmed'};
}
