/**
 * Mission authority is established by a trusted governance resolver, not by
 * a tool argument, claimed mandate string, or arbitrary shell output.
 * A positive verdict authorizes a specific internal effect within an
 * already-granted mission; no per-command Principal approval is implied.
 */
export async function resolveHostMissionAuthority(resolver, request) {
  if (typeof resolver !== 'function') return null;
  const verdict = await resolver(Object.freeze({ ...request }));
  if (!verdict || verdict.allowed !== true || verdict.verified !== true
      || typeof verdict.authority_id !== 'string' || !verdict.authority_id
      || verdict.actor !== request.actor || verdict.mandate !== request.mandate
      || verdict.capability !== request.capability || verdict.target !== request.target) {
    return null;
  }
  if (!Array.isArray(verdict.allowed_operations) || !verdict.allowed_operations.includes(request.capability)) return null;
  if (verdict.expires_at && (!Number.isFinite(Date.parse(verdict.expires_at)) || Date.parse(verdict.expires_at) <= Date.now())) return null;
  // Never treat an ordinary mission verdict as permission for externally
  // engaging acts: those remain subject to explicit Principal authority.
  if (/^(gmail|communication|whatsapp)\.|\.(send|publish|submit|transfer)$/.test(request.capability)) return null;
  return Object.freeze({
    authority_id: verdict.authority_id,
    mandate: verdict.mandate,
    actor: verdict.actor,
    origin: 'verified_mission',
  });
}
