/** #299: a server-configured alias links an authenticated tunnel label to a
 * separately issued, verifiable Inseme mandate. Not an issuer or grant.
 * No caller-supplied mapping is accepted at the MCP request boundary.
 */
import {isResolvedCallerAuth} from './cogentia-mcp-auth.js';
import {assessJohnCopAuthority} from './john-cop-authority-preflight.js';
const refuse=error=>({ok:false,admitted:false,authorized_to_execute:false,error});
const TRANSPORT_READ_CAPABILITIES=new Set(['browser.hosted.inspect','browser.navigation.instances']);
export function createJohnTransportMandateMap({transport_label,mandate_ref,version_pin,allowed_read_capabilities,verifyIssuer}={}) {
 if(!transport_label||!mandate_ref||!version_pin||typeof verifyIssuer!=='function'||
   !Array.isArray(allowed_read_capabilities)||!allowed_read_capabilities.length||
   allowed_read_capabilities.some(x=>!TRANSPORT_READ_CAPABILITIES.has(x)))
   throw Error('invalid_server_mandate_mapping');
 const readCapabilities=new Set(allowed_read_capabilities);
 return Object.freeze({
  inspect({auth,store,ledger,capability,at_time}={}){
   if(!isResolvedCallerAuth(auth)||auth.auth!=='jhn')return refuse('authenticated_jhn_caller_required');
   if(auth.mandate_ref!==transport_label)return refuse('transport_label_mismatch');
   if(!readCapabilities.has(capability))return refuse('transport_capability_not_delegated');
   // Preflight checks canonical scope, independent issuer proof, revocation
   // and ledger. This method deliberately does not reserve or dispatch.
   return assessJohnCopAuthority({auth,store,ledger,capability,at_time,
     mandate_ref,version_pin,verifyIssuer,transport_mandate_label:transport_label});
  }
 });
}
