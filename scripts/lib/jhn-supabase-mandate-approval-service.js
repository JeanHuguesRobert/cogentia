/**
 * Full server-side composition: real Supabase Auth session -> canonical JHN
 * instance binding -> independently approved exact proposal -> Inseme COP
 * append-only amendment. Not itself an HTTP/MCP route. The issuing authority
 * must be supplied by a protected operator-controlled service.
 */
import {createJhnAuthSessionVerifier} from '../../../inseme/apps/platform/scripts/lib/jhn-auth-session-verifier.js';
import {createVaultPrincipalPreflight} from '../../../inseme/apps/platform/scripts/lib/vault-principal-preflight.js';
import {createVaultAnchoredMandateAmendment} from './vault-anchored-mandate-amendment.js';

export function createJhnSupabaseMandateApprovalService({adminClient,authClient,store,verifyExactApproval}={}) {
  const preflight=createVaultPrincipalPreflight({
    client:adminClient,
    authenticateHuman:createJhnAuthSessionVerifier({authClient}),
  });
  const bridge=createVaultAnchoredMandateAmendment({preflight,store,verifyExactApproval});
  return Object.freeze({
    inspect:({session}={})=>preflight.inspect({session}),
    amend:({session,mandate,approval}={})=>bridge.amend({session,mandate,approval}),
  });
}
