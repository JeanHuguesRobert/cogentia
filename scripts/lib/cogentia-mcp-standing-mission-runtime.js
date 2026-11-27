/**
 * #299 — Optional canonical standing mission composition for private MCP.
 * The same signed John mandate and hard execution budget used by other
 * canonical COP handlers; never creates mandates or bypasses an issuer.
 * No caller or model-supplied flag can enable it.
 */
import {readFileSync,realpathSync,statSync} from "node:fs";
import {createSqliteCopEventStore} from
  "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import {sshFingerprint} from "./john-sshsig-approval.js";
import {createOfflineJohnIssuerVerifier} from "./john-offline-issuer-verifier.js";
import {openConfiguredExistingWork,createCommissionedHostWorkRunner} from "./john-commission-existing-work.js";
import {createCanonicalStandingMissionResolver} from "./john-standing-mission-authority.js";

const PINNED_STORE="/var/lib/cogentia/cop/john-root-v1.sqlite";
const PINNED_ISSUER="SHA256:lG9BC3fIjurrBccYLO1w7VQpmc9ZMr8MvM1o3zJ6L3c";
const fail=(code)=>{throw Object.assign(new Error(code),{error_class:code});};

// Shared pinned verifier for the standing runtime and owner work service.
export function createConfiguredStandingIssuerVerifier(keyFile){
  let sshKey;
  try{
    sshKey=readFileSync(keyFile,"utf8").split("\n").find(line=>{
      try{return sshFingerprint(line)===PINNED_ISSUER;}
      catch{return false;}
    });
  }catch{fail("standing_mission_issuer_unavailable");}
  if(!sshKey)fail("standing_mission_issuer_unavailable");
  return createOfflineJohnIssuerVerifier({trustedSshPublicKey:sshKey,expectedSshFingerprint:PINNED_ISSUER});
}

export function createMcpStandingMissionRuntime(env=process.env) {
  if(env.COGENTIA_MCP_STANDING_MISSION_ENABLED!=="1")
    return {enabled:false,extras:{},close(){}};
  const storePath=String(env.COGENTIA_JHN_CANONICAL_STORE_PATH||"");
  const keyFile=String(env.COGENTIA_JHN_ISSUER_AUTHORIZED_KEYS||"");
  if(!storePath||!keyFile)fail("standing_mission_authority_unconfigured");
  try{
    if(realpathSync(storePath)!==PINNED_STORE||!statSync(storePath).isFile())
      fail("standing_mission_store_untrusted");
  }catch(e){
    if(e.error_class)throw e;
    fail("standing_mission_store_unavailable");
  }
  const verifyIssuer=createConfiguredStandingIssuerVerifier(keyFile);
  const store=createSqliteCopEventStore(storePath);
  let local;
  try{
    local=openConfiguredExistingWork(env);
    const work=local?createCommissionedHostWorkRunner({rootStore:store,...local,verifyIssuer}):null;
    const missionAuthorityResolver=createCanonicalStandingMissionResolver({
      store,verifyIssuer,resolvePacketContext:work?.resolvePacketContext??null,
    });
    return {enabled:true,extras:{missionAuthorityResolver,
      ...(work?{runCommissionedHostWork:work.run}:{})},
      close(){local?.close();store.close();}};
  }catch(e){local?.close();store.close();throw e;}
}
