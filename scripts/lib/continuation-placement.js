/** Locality-first, read-only meeting projection. NOT a claim or scheduler authority.
 * A handler declaration is evidence to investigate, never proof of mandate or reachability.
 */
export const PLACEMENT_PROTOCOL='cogentia.continuation_placement.v1';
const string=x=>typeof x==='string'?x.trim():'';
const unique=xs=>[...new Set(xs.map(string).filter(Boolean))];
export function projectContinuationPlacement({continuations=[],handlers=[],homeNode='',now='2026-11-09T00:00:00.000Z'}={}){
  const time=Date.parse(now);
  if(!Number.isFinite(time))throw new Error('Invalid projection time');
  const entries=[];
  for(const c of continuations){
    if(!c||c.status!=='active'||!string(c.id||c.continuation_id))continue;
    const id=string(c.id||c.continuation_id);
    const packetRef=string(c.packetRef||c.packet_ref||c.context?.packetRef||c.context?.packet_ref||c.context?.parentRef||c.context?.parent_packet_ref||c.subject?.packet_id)||`continuation:${id}`;
    const required=unique(Array.isArray(c.required_capabilities)?c.required_capabilities:[c.required_capability]);
    const locality=string(c.placement?.home_node||c.context?.home_node||c.context?.placement?.home_node||c.subject?.home_node||homeNode);
    const age=Math.max(0,Math.floor((time-Date.parse(c.created_at||now))/1000))||0;
    const waitUntil=Date.parse(c.conditions?.resumeAfter||c.resume_after||'');
    const waiting=Number.isFinite(waitUntil)&&waitUntil>time;
    const matches=handlers.filter(h=>h&&string(h.id||h.resolver_id)&&h.available===true&&required.every(cap=>h.capabilities?.includes(cap)))
      .map(h=>({handler_id:string(h.id||h.resolver_id),node:string(h.node||h.home_node||h.locality),match_basis:'declared_capabilities_only',capability_confidence:['verified','observed','declared'].includes(h.capability_confidence)?h.capability_confidence:'declared',locality:locality&&string(h.node||h.home_node||h.locality)===locality?'same_home':locality?'remote_or_unknown':'unplaced',mandate_verified:false,claim_acquired:false}));
    matches.sort((a,b)=>(a.locality==='same_home'?0:1)-(b.locality==='same_home'?0:1)||a.handler_id.localeCompare(b.handler_id));
    entries.push({continuation_id:id,packet_ref:packetRef,packet_projection:packetRef.startsWith('continuation:')?'minimal_from_continuation':'derived_from_lineage',home_node:locality||null,required_capabilities:required,priority:Number(c.priority)||0,wait_age_seconds:age,runnable_candidate:!waiting&&matches.length>0,blocked_reason:waiting?'waiting_until_due':matches.length?'':'no_declared_available_capable_handler',handler_candidates:matches,selected_handler:null,claim_acquired:false,effect_authorized:false,return_ref:c.return_contract?.result_ref||`continuation:${id}/resolution`});
  }
  // A monotone age-first policy is fair only among continuously eligible work and with finite completion/service capacity.
  entries.sort((a,b)=>(b.runnable_candidate?1:0)-(a.runnable_candidate?1:0)||b.wait_age_seconds-a.wait_age_seconds||b.priority-a.priority||a.continuation_id.localeCompare(b.continuation_id));
  return {protocol:PLACEMENT_PROTOCOL,read_only:true,policy:'runnable_first_then_oldest_eligible',home_node:homeNode||null,projected_at:new Date(time).toISOString(),entries,counts:{active:entries.length,runnable_candidates:entries.filter(e=>e.runnable_candidate).length,blocked:entries.filter(e=>!e.runnable_candidate).length},notices:['No Handler capability declaration grants authority, availability proof, or Packet Closure.','Selection is advisory. Actual execution requires COP PacketClaim, mandate and provider fencing.','No cross-node global listing is implied; each node projects only the continuations it can observe.','Oldest-first prevents priority-driven starvation only under sustained eligibility and sufficient service.']};
}
