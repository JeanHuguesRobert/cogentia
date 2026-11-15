/**
 * #299: semantic effect coordinator for the existing JHN standing mandate.
 * One canonical budget reservation per requested effect. No shell supplied
 * by the caller; providers receive only validated, fixed semantic parameters.
 */
import {canonicalPayloadHash} from "./side-effect-authorization.js";
import {isResolvedCallerAuth} from "./cogentia-mcp-auth.js";

export const MUSEUM_DNS=Object.freeze({
  zone:"baronsmariani.org",name:"museum.baronsmariani.org",
  type:"CNAME",content:"fracta.fractavolta.com",proxied:false,
});
export const MUSEUM_RELEASE=Object.freeze({
  host:"museum.baronsmariani.org",
  repository:"JeanHuguesRobert/barons-Mariani",
  revision:"f7f8ef131b5fc81d5a68e11cb404e886ad865861",
});
const denied=code=>({ok:false,error_class:code,executed:false,canonical_cop:false});

function exactProps(a,b) {
  return a && typeof a==="object" && !Array.isArray(a) &&
    Object.keys(a).length===Object.keys(b).length &&
    Object.entries(b).every(([k,v])=>a[k]===v);
}

export function createStandingTechnicalEffects({
  missionAuthorityResolver,dnsProvider,siteProvider,
}={}) {
  if(typeof missionAuthorityResolver!=="function" ||
    typeof dnsProvider?.ensure!=="function" ||
    typeof siteProvider?.release!=="function")
    throw new TypeError("standing_semantic_provider_not_configured");

  async function perform({auth,capability,effect,provider,target,invoke}) {
    if(!isResolvedCallerAuth(auth) || auth.auth!=="jhn" ||
      auth.allowMutate!==true || auth.principal_ref!=="principal:jhn")
      return denied("standing_authenticated_caller_required");
    const payload_hash=canonicalPayloadHash({
      capability,target,provider,effect,
    });
    const requested={
      actor:auth.actor,principal:auth.principal_ref,
      mandate:auth.mandate_ref,caller_auth:auth,
      capability,provider,target,effect,payload_hash,
      execution_mode:"normal",
    };
    const grant=await missionAuthorityResolver(requested);
    if(!grant?.allowed || !grant.verified || !grant.finalize)
      return denied(grant?.reason || "standing_mission_missing");
    let attempted=false,ok=false,receipt=null,settlement=null,response=null;
    try {
      if(typeof grant.beforeDispatch!=="function" ||
        await grant.beforeDispatch()!==true) {
        response=denied("standing_mission_revoked_before_dispatch");
        return response;
      }
      attempted=true;
      const outcome=await invoke(effect);
      ok=outcome?.ok===true && outcome?.verified===true;
      receipt=outcome?.receipt||null;
      if(!ok) {
        response={...denied(outcome?.reason || "provider_result_unverified"),
          executed:true,provider_receipt:receipt};
        return response;
      }
      response={ok:true,executed:true,verified:true,changed:outcome.changed===true,
        action_class:capability,payload_hash,
        provider_receipt:receipt,
        authority_id:grant.authority_id,mandate_version:grant.mandate_version};
      return response;
    } catch (e) {
      response={...denied(e?.error_class||"provider_execution_failed"),
        executed:attempted};
      return response;
    } finally {
      // A provider launch consumes one canonical step even if its ACK is lost.
      settlement=await grant.finalize({attempted,ok,receipt});
      if (settlement?.ok!==true) {
        // Do not silently claim success without COP settlement. Raising from
        // finally overrides any optimistic provider result.
        throw Object.assign(new Error("canonical_cop_settlement_unconfirmed"),
          {error_class:"canonical_cop_settlement_unconfirmed"});
      }
      if (response) {
        response.canonical_cop=true;
        response.accounting_complete=true;
        response.cop_spend={
          budget_action:settlement.budget_action,
          reservation_id:settlement.reservation_id,
          mandate_ref:settlement.mandate_ref,
          mandate_version:settlement.mandate_version,
        };
      }
    }
  }
  return Object.freeze({
    ensureDns({auth,effect}={}) {
      if(!exactProps(effect,MUSEUM_DNS))return denied("semantic_dns_effect_outside_registry");
      return perform({auth,capability:"dns.record.ensure",effect,
        target:"zone:baronsmariani.org",provider:"cloudflare",
        invoke:dnsProvider.ensure});
    },
    releaseSite({auth,effect}={}) {
      if(!exactProps(effect,MUSEUM_RELEASE))return denied("semantic_site_effect_outside_registry");
      return perform({auth,capability:"site.static.release",effect,
        target:"host:museum.baronsmariani.org",provider:"operium-static",
        invoke:siteProvider.release});
    },
  });
}
