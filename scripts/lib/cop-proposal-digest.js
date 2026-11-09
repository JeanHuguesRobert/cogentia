/** Deterministic digest for one structured COP proposal, portable across CLI,
 * MCP and future A2A representations. Not a signature or authority proof.
 */
import {createHash} from 'node:crypto';
function stable(value){
  if(Array.isArray(value))return value.map(stable);
  if(value&&typeof value==='object'){
    return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));
  }
  return value;
}
export const canonicalCopProposalBytes=proposal=>Buffer.from(JSON.stringify(stable(proposal)),'utf8');
export const mandateProposalHash=proposal=>'sha256:'+createHash('sha256').update(canonicalCopProposalBytes(proposal)).digest('hex');
