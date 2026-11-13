/**
 * Independently signed root-mandate amendment. No signing authority is
 * granted to MCP callers. The signature is made outside this service.
 */
import { amendMandate } from "../../../inseme/packages/cop-core/src/governed-act.js";
import { verifyJohnAmendmentProof } from "./john-mandate-amendment-proof.js";
export function amendVerifiedJohnRoot({
  store, input, trustedPublicKeyPem, trustedSshPublicKey,
  expectedSshFingerprint, now = () => new Date(),
} = {}) {
  return amendMandate(store, input, {
    verifyPrincipalApproval: (proposal, proof) => verifyJohnAmendmentProof({
      proposal, proof, trustedPublicKeyPem, trustedSshPublicKey,
      expectedSshFingerprint, now:now(),
    }),
  });
}
