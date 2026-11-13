/**
 * Prepare one exact, least-privilege amendment from the existing canonical
 * mandate. Pure: no signature, no mandate grant and no state write.
 */
import { amendMandate, resolveMandate } from "../../../inseme/packages/cop-core/src/governed-act.js";
import { canonicalProposalBytes, proposalHash } from "./john-root-mandate.js";
import { RESULT_RETURN_CAPABILITY } from "./cogentia-mcp-judgment-result-host.js";

export const RESULT_MANDATE_REF = "mandate:jhn:john-root";
export const RESULT_MANDATE_REASON =
  "Enable receipt-only COP continuation result submission; no browser action, publication, or external effect authorization";

export function prepareJohnResultMandateAmendment(store) {
  if (!store || typeof store.replay !== "function")
    return { ok:false, reason:"canonical_store_required" };
  const current = resolveMandate(store, RESULT_MANDATE_REF);
  if (!current || current.principal_ref !== "principal:jhn" ||
      current.logical_agent_ref !== "agent:jhn" ||
      !Array.isArray(current.scope?.allowed_actions) ||
      !Array.isArray(current.scope?.forbidden_actions))
    return { ok:false, reason:"canonical_root_mandate_invalid" };
  if (current.scope.allowed_actions.includes(RESULT_RETURN_CAPABILITY))
    return { ok:false, reason:"capability_already_authorized" };

  const scope = structuredClone(current.scope);
  scope.allowed_actions = [...scope.allowed_actions, RESULT_RETURN_CAPABILITY];
  const input = {
    mandate_ref: RESULT_MANDATE_REF,
    expected_version:current.version,
    principal_ref:"principal:jhn",
    scope,
    reason:RESULT_MANDATE_REASON,
  };
  // The canonical kernel validates validity/revocation/expected version and
  // synthesizes the exact proposal, but is not allowed to append on prepare.
  let proposal = null;
  const dry = amendMandate(store,input,{
    verifyPrincipalApproval:(candidate)=>{
      proposal = candidate; return { verified:false };
    },
  });
  if (!proposal || dry?.error !== "principal_approval_unverified")
    return { ok:false, reason:dry?.error || "mandate_draft_not_generated" };
  return {
    ok:true, input, proposal, proposal_hash:proposalHash(proposal),
    canonical_bytes:canonicalProposalBytes(proposal),
    summary: {
      mandate_ref:proposal.mandate_ref, previous_version:proposal.previous_version,
      new_version:proposal.new_version, existing_actions:current.scope.allowed_actions,
      added_action:RESULT_RETURN_CAPABILITY,
      forbidden_actions_unchanged:JSON.stringify(current.scope.forbidden_actions) ===
        JSON.stringify(proposal.scope.forbidden_actions),
      budget_ceiling_unchanged:JSON.stringify(current.scope.budget_ceiling) ===
        JSON.stringify(proposal.scope.budget_ceiling),
      valid_until:current.valid_until, reason:proposal.reason,
    },
  };
}
