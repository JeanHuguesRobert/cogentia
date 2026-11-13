/**
 * Optional authenticated browser adapter for the canonical consent workflow.
 * Mount ONLY behind a trusted application HTTPS origin; the hosting server
 * must not expose workflow.request()/apply() through this adapter. It accepts
 * a Supabase user access token (not a service key), validates it independently
 * through workflow.authenticate() on EVERY request and enforces same origin on
 * POST. CSRF cannot change a proposal from a third-party page with cookies:
 * there are no cookies and the Authorization bearer is required explicitly.
 */
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:JSON_HEADERS});
const denied=(status,error)=>reply(status,{ok:false,error,grants_mandate_authority:false});
function matchesExactMandatePlan(presented,expected) {
  return expected?.ok===true&&expected.requires_owner_consent===true&&
    presented?.kind==='cop.mandate-amendment.proposal/v1'&&
    presented.mandate_ref===expected.mandate_ref&&
    presented.principal_ref==='principal:jhn'&&
    presented.previous_version===expected.previous_version&&
    presented.new_version===`v${Number(expected.previous_version.slice(1))+1}`&&
    presented.valid_from===expected.mandate.valid_from&&
    presented.valid_until===expected.mandate.valid_until&&
    presented.reason===expected.mandate.reason&&
    JSON.stringify(presented.scope)===JSON.stringify(expected.mandate.scope);
}

export function createJhnConsentHttpHandler({workflow,origin,exactAgentMailAmendmentPlan,
  exactContinuationAmendmentPlan,requestExactContinuationConsent}={}) {
  if(!workflow||typeof workflow.inspect!=='function'||typeof workflow.decide!=='function'||typeof workflow.authenticate!=='function')
    throw Error('canonical_consent_workflow_required');
  if(typeof origin!=='string'||!/^https:\/\/[^/]+$/.test(origin))
    throw Error('trusted_https_origin_required');
  return async function consentHttp(request) {
    if(request.method!=='GET'&&request.method!=='POST')return denied(405,'method_not_allowed');
    const url=new URL(request.url);
    if(url.origin!==origin)return denied(403,'wrong_origin');
    const match=/^\/api\/cop\/principal-consent\/([a-f0-9-]{36})$/.exec(url.pathname);
    if(!match||!ID.test(match[1]))return denied(404,'consent_route_not_found');
    if(request.method==='POST'&&request.headers.get('origin')!==origin)
      return denied(403,'cross_origin_decision_forbidden');
    const token=request.headers.get('authorization')?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
    if(!token||token.length>8192)return denied(401,'supabase_human_session_required');
    const session={accessToken:token};
    let identity;
    try{identity=await workflow.authenticate({session});}
    catch{return denied(503,'principal_preflight_unavailable');}
    if(identity?.ok!==true||identity.authenticated!==true||identity.principal_ref!=='principal:jhn')
      return denied(403,'principal_session_not_verified');
    // The ONLY browser-exposed creation operation is a fixed, owner-authenticated,
    // server-generated continuation amendment, never an arbitrary supplied mandate.
    if(isContinuationRequest) {
      if(typeof requestExactContinuationConsent!=='function'||
         typeof exactContinuationAmendmentPlan!=='function')
        return denied(403,'continuation_request_not_enabled');
      const body=await request.text().catch(()=>null);
      if(body!=='{}')return denied(400,'request_body_must_be_empty_object');
      const plan=exactContinuationAmendmentPlan();
      if(!plan?.ok)return denied(409,plan?.error||'continuation_plan_unavailable');
      if(plan.already_authorized_in_scope)return reply(200,{ok:true,already_authorized_in_scope:true});
      if(!plan.requires_owner_consent)return denied(409,'continuation_plan_not_pending');
      const created=await requestExactContinuationConsent();
      if(!created?.ok)return denied(409,created?.error||'continuation_request_failed');
      return reply(201,{ok:true,challenge_id:created.challenge_id,payload_hash:created.payload_hash,
        expires_at:created.expires_at,url:'/cop/consent/'+created.challenge_id,
        grants_mandate_authority:false});
    }
    const challenge_id=match[1];
    if(request.method==='GET'){
      const check=workflow.inspect({challenge_id});
      if(!check.ok)return denied(404,'challenge_not_found');
      return reply(200,check);
    }
    let data;
    try {
      const body=await request.text();
      if(body.length>2048)return denied(413,'decision_body_too_large');
      data=JSON.parse(body);
    } catch{return denied(400,'invalid_decision_json');}
    if(!data||Object.keys(data).some(k=>!['payload_hash','decision'].includes(k)))
      return denied(400,'invalid_decision_fields');
    // Fail closed unless the Principal approves the exact deterministic
    // current mandate delta computed from the canonical store.
    const presented=workflow.inspect({challenge_id}).proposal;
    const shouldApply=data.decision==='approve'&&(
      (typeof exactAgentMailAmendmentPlan==='function'&&
       matchesExactMandatePlan(presented,exactAgentMailAmendmentPlan()))||
      (typeof exactContinuationAmendmentPlan==='function'&&
       matchesExactMandatePlan(presented,exactContinuationAmendmentPlan()))
    );
    const result=await workflow.decide({challenge_id,payload_hash:data.payload_hash,
      decision:data.decision,session});
    if(!result.ok)return denied(result.error==='challenge_not_pending'?409:403,result.error||'decision_refused');
    if(!shouldApply)return reply(200,result);
    // Uses the same independently authenticated Supabase Principal session.
    // apply() rechecks the canonical version, revocation and one-time approved
    // challenge; it cannot mint a new unrelated mandate.
    const applied=await workflow.apply({challenge_id,session});
    if(!applied?.ok)return reply(409,{...result,mandate_amendment_applied:false,
      apply_error:applied?.error||'canonical_consent_apply_failed'});
    return reply(200,{...result,mandate_amendment_applied:true,
      mandate_ref:applied.mandate_ref,mandate_version:applied.version,
      approval_evidence_ref:applied.receipt?.approval_evidence_ref,
      grants_mandate_authority:true});
  };
}
