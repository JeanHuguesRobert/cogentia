// Contract-only local relay. No sockets, secrets, provider invocation or process spawn.
// A relay must enforce authority independently of an agent's text.
export const RELAY_SCHEMA="cogentia.read-only-relay/v1";
export function authorizeRelayRequest({mandate,request,usage={calls:0,bytes:0},now=Date.now()}={}) {
  const deny=(code)=>({schema:RELAY_SCHEMA,allowed:false,code,receipt:{schema:"cogentia.relay-decision-receipt/v1",decision:"DENIED",reason:code,execution_effect:false}});
  if(!mandate || mandate.schema!=="cogentia.read-only-relay-mandate/v1" ||
    mandate.verified_by_trusted_adapter!==true) return deny("MANDATE_NOT_VERIFIED");
  // A local manifest claiming verification is never enough: this function
  // produces advisory classifications, not enforcement or executable grants.
  if(!Number.isFinite(now)||!Number.isFinite(Date.parse(mandate.expires_at))||
    now>=Date.parse(mandate.expires_at))return deny("MANDATE_EXPIRED");
  if(request?.kind!=="read_document")return deny("OPERATION_NOT_ALLOWED");
  if(!["JeanHuguesRobert/inseme","JeanHuguesRobert/cogentia"].includes(request.repository))return deny("REPOSITORY_NOT_ALLOWED");
  const path=request.path;
  if(typeof path!=="string"||!path||path.startsWith("/")||path.includes("\\")||
    path.split("/").some(part=>part===".."||part==="."||part==="")) return deny("PATH_NOT_ALLOWED");
  if(!Number.isInteger(mandate.max_calls)||mandate.max_calls<1||
    !Number.isInteger(mandate.max_bytes)||mandate.max_bytes<1 ||
    usage.calls>=mandate.max_calls||usage.bytes>=mandate.max_bytes)return deny("BUDGET_EXHAUSTED");
  return {schema:RELAY_SCHEMA,allowed:false,code:"ADVISORY_ONLY_TRUSTED_RELAY_NOT_CONNECTED",
    candidate:{repository:request.repository,path,kind:request.kind},
    receipt:{schema:"cogentia.relay-decision-receipt/v1",decision:"PENDING_ENFORCEMENT",execution_effect:false}};
}
