/** One reviewed route set; an adapter is capability-specific, not an
 * authority issuer. New routes must have an existing canonical executor
 * and a signed-scope predicate. Never route arbitrary MCP tool names. */
export const HOST_PROCESS='host.process.run';
export const BROWSER_INSTANCES='browser.navigation.instances';
const targets={'node:fracta2':'unix-process','node:i7-thinkpad-jhr':'windows-ssh'};
export const exactKeys=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
export function validNormalWorkRoute(r){
 if(!exactKeys(r,['capability','target','provider','execution_mode'])||r.execution_mode!=='normal')return false;
 if(r.capability===HOST_PROCESS)return typeof r.provider==='string'&&Object.hasOwn(targets,r.target)&&targets[r.target]===r.provider;
 return r.capability===BROWSER_INSTANCES&&r.target==='node:fracta2'&&r.provider==='navigation-gateway';
}
export function routeInSignedScope(scope,route){
 if(!validNormalWorkRoute(route)||!scope?.allowed_actions?.includes(route.capability)||
   scope.forbidden_actions?.includes(route.capability))return false;
 if(route.capability===BROWSER_INSTANCES)return true; // existing signed inventory capability
 return !!scope.standing_operations?.some(op=>op.profile==='host.process-general/v1'&&
   op.capability===route.capability&&op.target===route.target&&op.provider===route.provider&&
   op.execution_mode===route.execution_mode);
}
export function normalizeWorkAct(route,act){
 if(!validNormalWorkRoute(route))return null;
 const fields=['target','provider','execution_mode','timeout_ms'];
 if(!exactKeys(act,route.capability===HOST_PROCESS?[...fields,'command']:fields)||
   act.target!==route.target||act.provider!==route.provider||act.execution_mode!==route.execution_mode||
   !Number.isSafeInteger(act.timeout_ms))return null;
 if(route.capability===HOST_PROCESS){
   if(act.timeout_ms<1||act.timeout_ms>120000||typeof act.command!=='string'||
     !act.command.trim()||act.command.length>32768)return null;
 }else if(act.timeout_ms<1000||act.timeout_ms>30000)return null;
 return {...act};
}
