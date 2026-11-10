/** Private Cogentia MCP runtime composition. No new COP issuer or credential copy. */
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {createSqliteCopEventStore} from '../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js';
import {sshFingerprint} from './john-sshsig-approval.js';
import {createOfflineJohnIssuerVerifier} from './john-offline-issuer-verifier.js';
import {createCanonicalAgentMailAuthorizer} from './agent-mail-cop-authority.js';
import {createAgentMailIssuerLineageVerifier} from './agent-mail-issuer-lineage.js';
import {createLocalStalwartCredentialBroker} from './agent-mail-credential-broker.js';

const FINGERPRINT='SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c';
const fail=code=>{throw Object.assign(new Error(code),{error_class:code});};
export function createAgentMailRuntime(env=process.env) {
  if(env.COGENTIA_AGENT_MAIL_RUNTIME!=='1')return {enabled:false,extras:{},close(){}};
  const path=String(env.COGENTIA_JHN_CANONICAL_STORE_PATH||'');
  const keyFile=String(env.COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS||'');
  if(!path||!keyFile)fail('agent_mail_canonical_authority_unconfigured');
  try {if(realpathSync(path)!=='/var/lib/cogentia/cop/john-root-v1.sqlite'||!statSync(path).isFile())fail('agent_mail_canonical_store_untrusted');}
  catch(error){if(error?.error_class)throw error;fail('agent_mail_canonical_store_unavailable');}
  let trusted;
  try {trusted=readFileSync(keyFile,'utf8').split('\n').find(line=>{
    try{return sshFingerprint(line)===FINGERPRINT;}catch{return false;}
  });}catch{fail('agent_mail_trusted_issuer_key_unavailable');}
  if(!trusted)fail('agent_mail_trusted_issuer_key_unavailable');
  const store=createSqliteCopEventStore(path);
  try {
    const rootIssuer=createOfflineJohnIssuerVerifier({trustedSshPublicKey:trusted,expectedSshFingerprint:FINGERPRINT});
    const issuer=createAgentMailIssuerLineageVerifier({store,verifyRootIssuer:rootIssuer});
    const authorize=createCanonicalAgentMailAuthorizer({store,verifyIssuer:issuer});
    const credentialBroker=createLocalStalwartCredentialBroker();
    return {enabled:true,extras:{agentMailCredentialBroker:credentialBroker,agentMailAuthorize:authorize},close(){store.close()}};
  }catch(error){store.close();throw error;}
}
