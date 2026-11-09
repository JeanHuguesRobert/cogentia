/**
 * Trusted provider-bound secret consumption. The reasoner/MCP sees only the
 * credential reference and a narrow receipt, NEVER the credential value.
 *
 * This is an in-process composition factory, not a tool that accepts arbitrary
 * network destinations, commands or caller-supplied callbacks. Provider
 * descriptors and authorization/settlement implementations are trusted code.
 * None is installed by default, thus an unconfigured deployment fails closed.
 */
const NAME = /^[a-z][a-z0-9_.-]{0,95}$/;
const REF = /^jhn-vault:([a-z][a-z0-9_]{0,127})$/;
const CODE = /^[A-Z][A-Z0-9_]{1,63}$/;
const fail = code => Object.assign(new Error('Governed provider operation refused'), {code});
const txt = value => typeof value === 'string' && value.length > 0;

export function createGovernedProviderSecretUse({vault, authorize, providers, settle} = {}) {
  const installed = new Map();
  // Only trusted startup composition may pass this registry; no MCP-driven
  // mutation of provider aliases, secret bindings or network destinations.
  for (const [name, descriptor] of Object.entries(providers || {})) {
    if (!NAME.test(name) || !descriptor || typeof descriptor.invoke !== 'function' ||
        !REF.test(descriptor.credential_ref || '') ||
        typeof descriptor.capability !== 'string' || !NAME.test(descriptor.capability))
      throw fail('PROVIDER_REGISTRATION_INVALID');
    installed.set(name,Object.freeze({...descriptor,name}));
  }

  async function invoke(request) {
    const name=request?.provider;
    const capability=request?.capability;
    if (!NAME.test(name || '') || !NAME.test(capability || ''))
      throw fail('PROVIDER_REQUEST_INVALID');
    const descriptor=installed.get(name);
    if (!descriptor || descriptor.capability !== capability)
      throw fail('PROVIDER_NOT_AVAILABLE');
    if (typeof authorize !== 'function' || typeof settle !== 'function' ||
        typeof vault?.withSecret !== 'function') throw fail('PROVIDER_GOVERNANCE_UNAVAILABLE');
    // Neither request credential refs nor provider endpoints are accepted here.
    // A caller supplies only validated semantic args. This bound prevents
    // arbitrary credential exfiltration through a dynamic destination.
    const input=request?.input;
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw fail('PROVIDER_REQUEST_INVALID');
    let grant;
    try {
      grant=await authorize({provider:name,capability,credential_ref:descriptor.credential_ref,
        input,context:request.context});
    } catch {throw fail('PROVIDER_AUTHORITY_DENIED');}
    if (!grant || grant.authorized!==true ||
        !txt(grant.principal_ref)||!txt(grant.actor_ref)||
        !txt(grant.mandate_ref)||!txt(grant.effect_authorization_id)||
        !txt(grant.budget_reservation_id)||!txt(grant.issuer_ref)||
        grant.provider!==name || grant.capability!==capability ||
        grant.credential_ref!==descriptor.credential_ref)
      throw fail('PROVIDER_AUTHORITY_DENIED');
    let providerReceipt;
    try {
      providerReceipt=await vault.withSecret(descriptor.credential_ref,async (secret)=>{
        if (!txt(secret)) throw fail('PROVIDER_CREDENTIAL_UNAVAILABLE');
        return descriptor.invoke({secret,input,grant});
      });
    } catch {
      // Provider error bodies may repeat API keys or submitted content.
      // Catch-and-sanitize even if Vault's adapter has its own redaction.
      try { await settle({grant,outcome:'failed',provider:name,capability}); } catch {}
      throw fail('PROVIDER_EXECUTION_FAILED');
    }
    // Any receipt from a provider is untrusted. Only take constant schema and
    // explicitly typed booleans/identifiers; never spread provider data.
    const ok = providerReceipt?.ok === true;
    try {
      await settle({grant,outcome:ok?'completed':'failed',provider:name,capability});
    } catch {throw fail('PROVIDER_SETTLEMENT_FAILED');}
    if (!ok) throw fail('PROVIDER_EXECUTION_FAILED');
    return Object.freeze({
      ok:true,schema:'cogentia.provider_secret_use_receipt.v1',
      provider:name,capability,credential_ref:descriptor.credential_ref,
      effect_authorization_id:grant.effect_authorization_id,
      budget_reservation_id:grant.budget_reservation_id,
      completed:true,values_exposed:false,
    });
  }
  return Object.freeze({invoke, available:()=>[...installed.values()].map(({name,capability,credential_ref})=>({name,capability,credential_ref}))});
}
