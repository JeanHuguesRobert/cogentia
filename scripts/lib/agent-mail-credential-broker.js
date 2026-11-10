/**
 * Minimal private-file Stalwart credential broker for Fracta2.
 * An existing *single* root-owned JSON file remains the source of truth.
 * Read access is granted to the Cogentia service UID by the node owner.
 * No passwords are exposed through API/MCP results or application logs.
 */
import {readFile, stat} from 'node:fs/promises';

const FILE='/etc/stalwart/jhn-agent-mailboxes.json';
const DOMAIN='mail.fractavolta.com';
const ACCEPTED=/^[a-z][a-z0-9-]{0,62}@mail\.fractavolta\.com$/;
function fail(code){throw Object.assign(new Error(code),{error_class:code});}
export function createLocalStalwartCredentialBroker({filename=FILE,reader=readFile,statFile=stat}={}) {
  // The production path is pinned and not taken from MCP/CLI arguments or env.
  if(filename!==FILE) fail('mail_credential_source_untrusted');
  return async(address)=>{
    if(typeof address!=='string'||!ACCEPTED.test(address)) fail('outside_twin_trust_perimeter');
    let data,info;
    try {
      info=await statFile(filename);
      if(!info.isFile() || (info.mode & 0o007)!==0)fail('mail_credential_permissions_invalid');
      data=JSON.parse(await reader(filename,'utf8'));
    } catch(error) {if(error?.error_class)throw error;fail('mail_credential_source_unavailable');}
    const secret=data?.[address];
    if(typeof secret!=='string'||secret.length<16)fail('mail_agent_not_enrolled');
    return {password:secret};
  };
}
