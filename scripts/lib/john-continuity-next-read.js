/**
 * Structural boundary for a bounded next John read after a completed turn.
 * Authorization is NOT inferred from this predicate: the next John run must
 * independently pass its ordinary canonical issuer, mandate, budget and effect
 * checks. This only prevents an unbounded or effectful auto-chain.
 */
const CAPABILITIES = new Set(["browser.navigation.instances","browser.hosted.inspect"]);
export function admissibleJohnContinuationReadHop(parent,next,depth=0) {
  if (!parent || !next || typeof next!=="object" || Array.isArray(next))
    return {ok:false,reason:"next_request_missing"};
  if (!Number.isInteger(depth) || depth<0 || depth>=2)
    return {ok:false,reason:"continuation_hop_limit"};
  if (next.version!=="john.request.v1" || !next.request_id ||
      next.request_id===parent.request_id)
    return {ok:false,reason:"next_request_id_invalid"};
  if (!CAPABILITIES.has(next.capability) ||
      next.exposure!=="read_only" ||
      !["none","read_only"].includes(parent.exposure))
    return {ok:false,reason:"next_read_capability_required"};
  if (!next.handler || next.handler.kind!=="capability_once" ||
      !Array.isArray(next.handler.allowed_capabilities) ||
      next.handler.allowed_capabilities.length!==1 ||
      next.handler.allowed_capabilities[0]!==next.capability)
    return {ok:false,reason:"next_handler_mismatch"};
  if (next.mandate?.id!==parent.mandate?.id ||
      next.principal?.id!==parent.principal?.id ||
      next.budget?.id!==parent.budget?.id)
    return {ok:false,reason:"next_authority_scope_mismatch"};
  const b=next.execution_budget;
  if (!b || !Number.isInteger(b.max_steps) || b.max_steps<1 || b.max_steps>4 ||
      b.max_tool_calls!==1 || b.max_external_effects!==0 ||
      (b.max_internal_effects||0)!==0 || b.max_subagents!==0 ||
      !Number.isInteger(b.max_elapsed_ms) || b.max_elapsed_ms<100 ||
      b.max_elapsed_ms>15000)
    return {ok:false,reason:"next_budget_not_bounded"};
  if (next.input?.continuity?.goal_ref!==parent.input?.continuity?.goal_ref ||
      JSON.stringify(next.input.continuity.acceptance||[]) !==
        JSON.stringify(parent.input.continuity.acceptance||[]))
    return {ok:false,reason:"next_continuity_mismatch"};
  return {ok:true};
}
