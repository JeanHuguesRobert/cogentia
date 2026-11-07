/** Explicit trusted host composition; no default production credentials or grants.
 * This factory deliberately does not register agent-visible tools or expose
 * vault values. A real use requires independently audited adapters.
 */
import {createBrowserCredentialCapabilities} from './browser-credential-capabilities.js';
import {createCredentialBoundAuthority} from './browser-credential-bound-authority.js';
export function createBoundBrowserCredentialCapabilities(options={}) {
  return createBrowserCredentialCapabilities({
    vault:options.vault,
    browser:options.browser,
    authorize:createCredentialBoundAuthority({
      trustDirectory:options.trustDirectory,
      authenticatePrincipal:options.authenticatePrincipal,
      attestNode:options.attestNode,
      copAuthorize:options.copAuthorize,
      nodeByBrowserInstance:options.nodeByBrowserInstance,
    }),
  });
}
