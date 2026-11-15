/**
 * COP-native journal bridge for John turn completion. A finished conversational
 * turn is NOT a completed parent mandate. This journal is an observation, not
 * an authorization, automatic dispatch or truth certificate.
 */
import {projectMandateProgress} from "./mandate-completion-projection.js";

const safeRef = x => typeof x === "string" && /^[a-zA-Z0-9_:.@/-]{1,160}$/.test(x);
const safeAcceptance = x => Array.isArray(x) && x.length <= 24 &&
  x.every(v => typeof v === "string" && /^[a-zA-Z0-9_.:-]{1,96}$/.test(v));

export function createJohnMandateTurnContinuity({store}={}) {
  if (!store || store.kind !== "sqlite" || typeof store.append !== "function" ||
      typeof store.eventByIdempotency !== "function")
    throw new TypeError("existing canonical COP store required");
  return {
    pending({goal_ref=null,limit=25}={}) {
      if (goal_ref !== null && !safeRef(goal_ref))
        return {ok:false,reason:"invalid_goal_ref"};
      if (!Number.isInteger(limit) || limit < 1 || limit > 50)
        return {ok:false,reason:"invalid_limit"};
      const rows=(goal_ref ? store.listTopic("john-mandate:"+goal_ref) : store.replay())
        .filter(e=>e.payload?.profile==="cop.john-mandate-turn/v1" &&
          e.payload?.principal_ref==="principal:jhn" &&
          (!goal_ref || e.payload.goal_ref===goal_ref));
      const latest=new Map();
      for (const e of rows) latest.set(e.payload.goal_ref,e);
      const pending=[...latest.values()].filter(e=>e.payload.needs_continuation===true)
        .slice(-limit).map(e=>({
          goal_ref:e.payload.goal_ref,
          turn_id:e.payload.turn_id,mandate_status:e.payload.mandate_status,
          needs_continuation:true,receipt_ref:"cop:event:"+e.event_id,
          acceptance:e.payload.acceptance || [],
        }));
      return {ok:true,goal_ref,pending,more:latest.size>limit};
    },
    record({request, events, actor, principal_ref}={}) {
      const contract=request?.input?.continuity;
      if (!contract) return null;
      if (!safeRef(contract.goal_ref) || !safeAcceptance(contract.acceptance) ||
          !safeRef(request?.request_id) || !safeRef(request?.mandate?.id) ||
          !safeRef(actor) || !actor.startsWith("agent:jhn") ||
          principal_ref !== "principal:jhn" ||
          request?.principal?.id !== principal_ref) return {ok:false,reason:"invalid_continuity_context"};
      const finished=events?.find(e=>e.type==="john.run.completed");
      const failure=events?.find(e=>e.type==="john.run.failed");
      if (!finished && !failure) return {ok:false,reason:"turn_not_terminal"};
      // A caller-supplied claim of success is NEVER evidence. This bridge only
      // has the turn receipt, not independently validated mandate acceptance.
      const progress=projectMandateProgress({
        acceptance:contract.acceptance, evidence:[], nextActions:[],
        agentClaim:finished ? "completed" : "failed",
      });
      const key="john:mandate-turn:"+request.request_id+":v1";
      const prior=store.eventByIdempotency(key);
      if (prior) {
        if (prior.payload?.goal_ref !== contract.goal_ref ||
            prior.payload?.mandate_ref !== request.mandate.id ||
            JSON.stringify(prior.payload?.acceptance || []) !==
              JSON.stringify(contract.acceptance))
          return {ok:false,reason:"request_idempotency_conflict"};
        return {ok:true,duplicate:true,receipt_ref:"cop:event:"+prior.event_id,
          mandate_status:prior.payload.mandate_status,
          needs_continuation:prior.payload.needs_continuation===true};
      }
      const written=store.append({
        topic_id:"john-mandate:"+contract.goal_ref,
        event_type:"cop.event/v1",
        actor_id:"cop:john-mandate-turn",
        subject_ref:"mandate:"+request.mandate.id,
        origin_ref:"john:turn:"+request.request_id,
        idempotency_key:key,
        visibility:"restricted",epistemic_status:"observed",
        payload:{
          profile:"cop.john-mandate-turn/v1",goal_ref:contract.goal_ref,
          mandate_ref:request.mandate.id,principal_ref,actor,
          acceptance:[...contract.acceptance],
          turn_id:request.request_id,turn_status:finished?"completed":"failed",
          mandate_status:progress.status,missing:progress.missing,
          reason:progress.reason,needs_continuation:progress.status!=="completed",
          // No model prompt, answer, secrets, or self-attested acceptance evidence.
        },
      });
      if (!written.ok)return {ok:false,reason:written.error||"journal_failed"};
      return {ok:true,duplicate:written.duplicate===true,
        receipt_ref:"cop:event:"+written.event.event_id,
        mandate_status:progress.status,
        needs_continuation:progress.status!=="completed"};
    },
  };
}
