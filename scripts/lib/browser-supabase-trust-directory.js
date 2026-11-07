/** Read-only directory preflight for a Principal's Supabase instance and COP node.
 * This is NOT an authentication system or an authority grant. The caller's
 * independently authenticated Supabase principal UUID and node identity must
 * be proven by separate trusted verifiers, not asserted by an agent/SSH login.
 * Reads only explicit non-secret fields. Never queries instance_config.value,
 * vault.secrets, vault.decrypted_secrets, or auth tokens.
 */
const deny=reason=>Object.freeze({bound:false,reason});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDENT=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
export function createSupabaseTrustDirectory({url,serverKey,fetcher=globalThis.fetch}={}) {
  const endpoint=String(url||'').replace(/\/$/,'');
  let valid=false;
  try { const u=new URL(endpoint);valid=u.protocol==='https:' && /^[a-z0-9-]+\.supabase\.co$/.test(u.hostname) && u.origin===endpoint; }catch{}
  const usable=valid && typeof serverKey==='string'&&serverKey.length>=20&&typeof fetcher==='function';
  async function read(table,select,filter) {
    const u=new URL(endpoint+'/rest/v1/'+table);
    u.searchParams.set('select',select);
    for (const [k,v] of Object.entries(filter))u.searchParams.set(k,'eq.'+v);
    u.searchParams.set('limit','2');
    const result=await fetcher(u,{headers:{apikey:serverKey,Authorization:'Bearer '+serverKey,Accept:'application/json'},signal:AbortSignal.timeout(5000)});
    if (!result.ok)throw Error('directory_http_error');
    const rows=await result.json();
    if (!Array.isArray(rows)||rows.length!==1)throw Error('directory_identity_not_unique');
    return rows[0];
  }
  return Object.freeze({
    async check({instance_slug,principal_id,node_id,network_id}={}) {
      if(!usable)return deny('directory_not_configured');
      if(!IDENT.test(instance_slug||'')||!UUID.test(principal_id||'')||
         !IDENT.test(node_id||'')||!IDENT.test(network_id||''))return deny('directory_assertions_invalid');
      try {
        const instance=await read('instances','canonical_slug,principal_id,status',{canonical_slug:instance_slug});
        if(instance.principal_id!==principal_id || instance.status!=='autonomous')return deny('principal_identity_unbound');
        const node=await read('cop_nodes','network_id,node_id',{network_id,node_id});
        if(node.network_id!==network_id || node.node_id!==node_id)return deny('node_not_registered');
        return Object.freeze({bound:true,instance_slug,node_id,network_id});
      }catch{return deny('directory_preflight_unavailable');}
    }
  });
}
