/** #299 — bind John request labels to the proven MCP transport identity.
 * This is TRANSPORT attribution, not a canonical Inseme mandate grant.
 * Never use request fields as authenticated Principal or issuing authority.
 */
import {isResolvedCallerAuth} from './cogentia-mcp-auth.js';
export function bindJohnTransportClaims(req, auth) {
 if (!isResolvedCallerAuth(auth) || auth.auth!=='jhn') return {bound:false,request:req};
 if(auth.principal_ref!=='principal:jhn') return {bound:false,error:'unexpected_transport_principal',request:req};
 if(typeof auth.mandate_ref!=='string'||!auth.mandate_ref) return {bound:false,error:'missing_transport_mandate_label',request:req};
 return {bound:true,request:{...req,
   principal:{id:'principal:jhn'},
   mandate:{...req.mandate,id:auth.mandate_ref},
 }};
}
