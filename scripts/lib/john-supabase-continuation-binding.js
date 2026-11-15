/**
 * Agent John's existing Supabase instance binding, not a second login.
 *
 * Technical caller authentication comes from resolveCallerAuth() and its
 * server-side JHN credential. Supabase is independently consulted to verify
 * that the registered 'jhn' instance has a confirmed, non-anonymous Principal.
 * Neither public.instances nor the service_role credential establishes
 * authority to execute a COP effect: the signed mandate/budget gate remains.
 *
 * In contrast with the Principal approval flow, no human access token is
 * required or accepted here; that flow already uses auth.getUser(token).
 */
import { isResolvedCallerAuth } from "./cogentia-mcp-auth.js";
import { JHN_VAULT_INSTANCE_ID } from "../../../inseme/apps/platform/scripts/lib/vault-catalog.js";

const deny=reason=>Object.freeze({ok:false,reason,instance:"jhn",
  principal_ref:null,runtime_authenticated:false,cop_authorized:false});

export async function verifyJohnSupabaseRuntimeBinding({
  auth,adminClient,authClient,
}={}) {
  if(!isResolvedCallerAuth(auth) || auth.auth!=="jhn" ||
     auth.allowMutate!==true || auth.principal_ref!=="principal:jhn" ||
     !auth.actor?.startsWith("agent:jhn"))
    return deny("john_runtime_credential_required");
  if(typeof adminClient?.from!=="function" ||
     typeof authClient?.auth?.admin?.getUserById!=="function")
    return deny("supabase_verifiers_unavailable");
  try {
    const {data:instance,error:instanceError}=await adminClient.from("instances")
      .select("id,canonical_slug,status,principal_id")
      .eq("id",JHN_VAULT_INSTANCE_ID).single();
    if(instanceError || !instance || instance.id!==JHN_VAULT_INSTANCE_ID ||
       instance.canonical_slug!=="jhn" || instance.status!=="autonomous" ||
       typeof instance.principal_id!=="string" || !instance.principal_id)
      return deny("john_instance_principal_unbound");
    const {data,error}=await authClient.auth.admin.getUserById(instance.principal_id);
    const user=data?.user;
    if(error || !user || user.id!==instance.principal_id ||
       !user.email_confirmed_at || user.is_anonymous===true)
      return deny("supabase_principal_not_confirmed");
    // Deliberately do NOT return the Supabase Auth UUID or any token.
    return Object.freeze({ok:true,instance:"jhn",principal_ref:"principal:jhn",
      runtime_authenticated:true,principal_bound:true,
      identity_proof:"jhn_service_credential_and_supabase_principal_binding",
      cop_authorized:false, mandate_required:true});
  }catch{return deny("supabase_identity_check_unavailable");}
}

/**
 * Only a server-owned adapter can construct auth/adminClient/authClient/store.
 * This composes two independent existing gates, not a new authentication
 * system. It is still an internal function, not a remote MCP operation.
 */
export async function resolveJohnCopViaSupabaseInstance(root,id,{
  auth,adminClient,authClient,...governedOptions
}={}) {
  const identity=await verifyJohnSupabaseRuntimeBinding({
    auth,adminClient,authClient,
  });
  if(!identity.ok)
    return {ok:false,code:"JOHN_INSTANCE_IDENTITY_DENIED",reason:identity.reason};
  // Dynamic import avoids binding network auth module to the sync COP core.
  const {resolveJohnCopContinuation}=await import("./continuation-cop-governed.js");
  const result=resolveJohnCopContinuation(root,id,{...governedOptions,auth});
  return {...result,instance_binding_verified:true,
    instance:"jhn",principal_ref:"principal:jhn"};
}
