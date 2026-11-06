/** FBF #300: compare actual client-exposed host process tools with server schema.
 * Never grants or executes host operations.
 */
const REQUIRED=['execution_mode','command','timeout_ms','target','provider'];
export function auditConnectedHostProcessContract({serverTools,connectedTools}={}){
 const observed=[];
 for(const name of ['cogentia_host_process_prepare','cogentia_host_process_run']){
  const server=serverTools?.find?.(t=>t.name===name)?.inputSchema;
  const client=connectedTools?.find?.(t=>t.name===name)?.inputSchema;
  if(!server||!client){observed.push({name,status:'missing_schema',missing:!client?'connected':'server'});continue;}
  const differences=[];
  for(const prop of REQUIRED){
   const a=server.properties?.[prop],b=client.properties?.[prop];
   if(!a||!b){differences.push({field:prop,kind:'missing_property',side:!b?'connected':'server'});continue;}
   for(const key of ['maxLength','maximum','minimum'])if(a[key]!==b[key])
    differences.push({field:prop,kind:'bound_mismatch',property:key,server:a[key]??null,connected:b[key]??null});
   if(JSON.stringify(a.enum||null)!==JSON.stringify(b.enum||null))
    differences.push({field:prop,kind:'enum_mismatch'});
  }
  observed.push({name,status:differences.length?'contract_drift':'aligned',differences});
 }
 return {ok:observed.every(x=>x.status==='aligned'),tools:observed,
  super_callable_from_connector:observed.every(x=>x.status==='aligned')};
}
