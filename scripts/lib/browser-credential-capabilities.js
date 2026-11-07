/** Credential capabilities: metadata lookup and trusted direct fill.
 * No generic browser script, secret, or credential value crosses the agent API.
 * The production adapters must supply independently verified COP grants.
 */
const IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const FIELDS = new Set(['username', 'password']);
const codeError = (code) => Object.assign(new Error('Browser credential operation refused'), { name: 'CredentialCapabilityError', code });

function target(input) {
  if (!input || !IDENTIFIER.test(input.browser_instance_id || '') ||
      !Number.isSafeInteger(input.tab_id) || input.tab_id < 1 ||
      typeof input.expected_origin !== 'string' ||
      typeof input.credential_ref !== 'string' ||
      !IDENTIFIER.test(input.credential_ref)) throw codeError('CREDENTIAL_TARGET_INVALID');
  let parsed;
  try { parsed = new URL(input.expected_origin); } catch { throw codeError('CREDENTIAL_ORIGIN_INVALID'); }
  if (parsed.protocol !== 'https:' || parsed.origin !== input.expected_origin ||
      parsed.username || parsed.password) throw codeError('CREDENTIAL_ORIGIN_INVALID');
  return Object.freeze({browser_instance_id:input.browser_instance_id, tab_id:input.tab_id,
    expected_origin:parsed.origin,credential_ref:input.credential_ref});
}

function normalizeMetadata(meta, request, principal_ref) {
  if (!meta || meta.credential_ref !== request.credential_ref ||
      meta.principal_ref !== principal_ref || meta.origin !== request.expected_origin ||
      !Array.isArray(meta.available_fields) ||
      meta.available_fields.some(x => !FIELDS.has(x))) throw codeError('CREDENTIAL_METADATA_MISMATCH');
  return {credential_ref:request.credential_ref, origin:request.expected_origin,
    available_fields:[...new Set(meta.available_fields)], configured:true};
}

/**
 * vault.describe(request) returns metadata only; vault.withSecret(request, fn) is trusted
 * and must never put secrets into error messages, logs or public receipts.
 * authorize(request) MUST verify COP Principal/actor/issuer/mandate/effect scope.
 * browser.fillSecret({target,field,secret}) runs in trusted infrastructure, verifies
 * actual tab, top-level frame, URL origin and field type at fill time, and does NOT
 * submit, navigate, expose values, or accept arbitrary JS from the agent.
 * Without all three adapters these capabilities fail closed (no mock fallback).
 */
export function createBrowserCredentialCapabilities({vault,authorize,browser}={}) {
  async function gate(action, input, field) {
    const t=target(input);
    if (typeof authorize !== 'function') throw codeError('CREDENTIAL_COP_UNAVAILABLE');
    const grant=await authorize({action, target:t, field});
    if (!grant || grant.authorized !== true || grant.principal_ref == null ||
        grant.actor_ref == null || grant.mandate_ref == null ||
        (action === 'credential.fill' && (!grant.effect_authorization_id || !grant.budget_reservation_id)))
      throw codeError('CREDENTIAL_AUTHORITY_DENIED');
    return {target:t,principal_ref:grant.principal_ref};
  }
  return Object.freeze({
    async lookup(input) {
      const {target:t,principal_ref}=await gate('credential.lookup',input);
      if (typeof vault?.describe !== 'function') throw codeError('CREDENTIAL_VAULT_UNAVAILABLE');
      return normalizeMetadata(await vault.describe(t),t,principal_ref);
    },
    async fill(input) {
      if (!FIELDS.has(input?.field)) throw codeError('CREDENTIAL_FIELD_UNSUPPORTED');
      const {target:t,principal_ref}=await gate('credential.fill',input,input.field);
      if (typeof vault?.describe !== 'function' || typeof vault?.withSecret !== 'function' ||
          typeof browser?.fillSecret !== 'function') throw codeError('CREDENTIAL_BACKEND_UNAVAILABLE');
      const meta=normalizeMetadata(await vault.describe(t),t,principal_ref);
      if (!meta.available_fields.includes(input.field)) throw codeError('CREDENTIAL_FIELD_UNAVAILABLE');
      // Trusted callback never yields a secret to the caller: sanitize exceptions.
      let receipt;
      try {
        receipt=await vault.withSecret({...t,principal_ref,field:input.field},async (secret)=> {
          if (typeof secret !== 'string' || !secret) throw codeError('CREDENTIAL_SECRET_UNAVAILABLE');
          return browser.fillSecret({target:t,field:input.field,secret});
        });
      } catch { throw codeError('CREDENTIAL_FILL_FAILED'); }
      if (receipt?.ok!==true || receipt?.submitted!==false ||
          receipt?.origin!==t.expected_origin || receipt?.tab_id!==t.tab_id ||
          receipt?.browser_instance_id!==t.browser_instance_id ||
          receipt?.field!==input.field) throw codeError('CREDENTIAL_FILL_UNCONFIRMED');
      return Object.freeze({ok:true,field:input.field,credential_ref:t.credential_ref,
        browser_instance_id:t.browser_instance_id,tab_id:t.tab_id,
        origin:t.expected_origin,submitted:false});
    },
  });
}
