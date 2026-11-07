/** Bind browser credential requests to verified Principal and FractaNode.
 * Each verifier is a separate trusted service boundary. A Tailscale/SSH
 * connection, access token, instance slug or database row alone is never COP authority.
 */
const IDENT=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const fail=()=>({authorized:false});
export function createCredentialBoundAuthority({trustDirectory,authenticatePrincipal,attestNode,copAuthorize,nodeByBrowserInstance}={}) {
  return async function authorize({action,target,field}={}) {
    if(!['credential.lookup','credential.fill'].includes(action)||!target||
        !['username','password',undefined].includes(field))return fail();
    // This map is an operator-pinned binding, not dynamically supplied by the agent.
    const assigned=nodeByBrowserInstance?.[target.browser_instance_id];
    if(!assigned||!IDENT.test(assigned.node_id||'')||!IDENT.test(assigned.network_id||''))return fail();
    if(typeof authenticatePrincipal!=='function'||typeof attestNode!=='function'||
       typeof trustDirectory?.check!=='function'||typeof copAuthorize!=='function')return fail();
    try {
      const [principal,node]=await Promise.all([
        authenticatePrincipal({action,target}),
        attestNode({node_id:assigned.node_id,network_id:assigned.network_id,browser_instance_id:target.browser_instance_id})
      ]);
      if(principal?.verified!==true||!principal.principal_ref||!principal.principal_id||
         principal.instance_slug!=='jhn'|| node?.verified!==true ||
         node.node_id!==assigned.node_id||node.network_id!==assigned.network_id)return fail();
      const directory=await trustDirectory.check({instance_slug:principal.instance_slug,
        principal_id:principal.principal_id,node_id:node.node_id,network_id:node.network_id});
      if(directory.bound!==true)return fail();
      const grant=await copAuthorize({action,target,field,principal_ref:principal.principal_ref,
        actor_ref:principal.actor_ref,node_id:node.node_id,network_id:node.network_id});
      if(grant?.authorized!==true || grant.principal_ref!==principal.principal_ref ||
          !grant.actor_ref || !grant.mandate_ref || grant.issuer_verified!==true ||
          grant.browser_instance_id!==target.browser_instance_id ||
          grant.tab_id!==target.tab_id || grant.origin!==target.expected_origin ||
          grant.credential_ref!==target.credential_ref ||
          (action==='credential.fill'&&(!grant.effect_authorization_id||!grant.budget_reservation_id ||
                                       grant.field!==field)))return fail();
      return Object.freeze({...grant,authorized:true});
    }catch{return fail();}
  };
}
