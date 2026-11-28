/** First bounded MCP adapter to the existing Operium wake contract.
 * No default transport, admin-token forwarding or authority issuance.
 * A trusted host must supply the canonical schedule capability.
 */
import {attachExposePacket, executeAuthorizedEffect} from './side-effect-authorization.js';
import {isResolvedCallerAuth} from './cogentia-mcp-auth.js';

const ACTION = 'calendar.schedule';
const fail = code => Object.assign(new Error(code), {error_class:code});
const exact = (obj, keys) => obj && typeof obj === 'object' && !Array.isArray(obj)
  && Object.keys(obj).length === keys.length && keys.every(k=>Object.hasOwn(obj,k));
const dnsName = value => typeof value === 'string' && value.length <= 253
  && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(value);

/** Deliberately one known observation handler for the first slice.
 * Widen only when the occurrence's canonical admission/dispatch is proved.
 */
export function prepareCalendarSchedule({node_id,wake} = {}, {now=Date.now()}={}) {
  if(typeof node_id !== 'string' || !/^resource:\/\/[a-z0-9][a-z0-9-]{0,62}$/i.test(node_id))
    throw fail('calendar_invalid_node');
  if(!exact(wake,['id','packet_type','payload']) ||
    wake.packet_type !== 'cop/node.wake.v1' ||
    typeof wake.id !== 'string' || !/^cop:wake:[a-z0-9][a-z0-9:._-]{0,127}$/i.test(wake.id))
    throw fail('calendar_invalid_wake');
  const p=wake.payload;
  if(!exact(p,['schema','due_at','deadline','cadence','stop_condition','authorized','packet']) ||
    p.schema !== wake.packet_type || p.authorized !== false ||
    !exact(p.cadence,['kind']) || p.cadence.kind !== 'once' ||
    !exact(p.stop_condition,['type']) || p.stop_condition.type !== 'always')
    throw fail('calendar_pilot_requires_one_shot_observation');
  const due=Date.parse(p.due_at),deadline=Date.parse(p.deadline);
  if(typeof p.due_at!=='string'||typeof p.deadline!=='string'||
    !Number.isFinite(due)||!Number.isFinite(deadline)||due<=now||deadline<=due)
    throw fail('calendar_invalid_temporal_bounds');
  const q=p.packet,w=q?.payload;
  if(!exact(q,['envelope','payload']) ||
    !exact(q.envelope,['packet_kind','transmission_mode','status']) ||
    q.envelope.packet_kind!=='observation'||q.envelope.transmission_mode!=='copy'||q.envelope.status!=='active'||
    !exact(w,['id','kind','target_node','domain','expected_ns'])||
    w.kind!=='observation.dns.delegation'||w.id!==wake.id.slice('cop:wake:'.length)||
    w.target_node!==node_id||!dnsName(w.domain)||!Array.isArray(w.expected_ns)||
    w.expected_ns.length<1||w.expected_ns.length>8||!w.expected_ns.every(dnsName))
    throw fail('calendar_pilot_observation_not_supported');
  return attachExposePacket({
    kind:'cogentia.calendar_schedule_prepare/v1',action_class:ACTION,
    target:{node:node_id},payload:{node_id,wake:structuredClone(wake)},
    exposed_mutation:{node_id,wake:structuredClone(wake)},phase:'EXPOSE',
    note:'One-shot observation pilot. Preparation only. Deadline is an existing escalation date, not yet a hard expiry. No dispatch authority is issued.'
  });
}

export async function executeCalendarSchedule({node_id,wake,authorization,caller,schedule}={}) {
  if(typeof schedule!=='function')throw fail('calendar_schedule_runtime_not_enabled');
  if(!isResolvedCallerAuth(caller)||caller.auth!=='jhn'||caller.allowMutate!==true)
    throw fail('calendar_schedule_caller_not_verified');
  const prepared=prepareCalendarSchedule({node_id,wake});
  // A session can mint generic grants; those are not independent Principal
  // approval of a durable future obligation. No self-issued grant accepted.
  if(authorization?.authority_origin!=='principal'||
    authorization.principal!==caller.principal_ref||authorization.actor!==caller.actor||
    authorization.mandate_ref!==caller.mandate_ref)
    throw fail('calendar_schedule_principal_grant_required');
  return executeAuthorizedEffect({
    action_class:ACTION,target:prepared.target,payload:prepared.payload,authorization,
    run:async()=>{
      // The trusted transport owns target verification and canonical storage;
      // no credentials, arbitrary URLs or privileged shell command from caller.
      const result=await schedule({node_id,wake:prepared.payload.wake});
      if(result?.ok!==true||result.authorized!==false||
        result.obligation?.id!==wake.payload.packet.payload.id||
        result.obligation?.target_node!==node_id)
        throw fail('calendar_schedule_receipt_unverified');
      return {...result,id:result.obligation.id,status:'verified'};
    }
  });
}
