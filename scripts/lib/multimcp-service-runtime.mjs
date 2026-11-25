/**
 * Opt-in MultiMCP composition for the existing Cogentia HTTP MCP process.
 * A pre-existing local COP journal is the only authority for Task history.
 * Disabled path does not access Inseme or create any database.
 */
import {existsSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {createSqliteCopEventStore} from "../../../inseme/packages/cop-core/src/sqlite-cop-event-store.js";
import {
  resolveCallerAuth,isResolvedCallerAuth,ACTOR_META_KEY,PRINCIPAL_META_KEY,
} from "./cogentia-mcp-auth.js";
import {createMultiMcpProgramRuntime} from "./multimcp-program.mjs";
import {createMultiMcpCopBridge} from "./multimcp-cop-bridge.mjs";
import {createMultiMcpMcpSurface} from "./multimcp-mcp-surface.mjs";
import {packetTopicForMcpTask,mcpTaskIdFromPacketTopic,
  packetRefForMcpTask} from "./mcp-tasks-cop-pilot.mjs";
import {assignedCpsReference,createCanonicalChatgptCpsReturnVerifier}
  from "./multimcp-cps-return.js";

function verifiedJhn(auth) {
  return isResolvedCallerAuth(auth) && auth.auth==="jhn" &&
    auth.allowMutate===true && auth.reason==="jhn_attested" &&
    auth.principal_ref==="principal:jhn" && typeof auth.actor==="string";
}

export function createMultiMcpServiceRuntime(env=process.env,{
  coreAccessor,additionalProviders={},cpsStore=null,
}={}) {
  if (String(env.COGENTIA_MCP_MULTIMCP_ENABLED||"")!=="1")
    return {enabled:false,extras:{},async start(){},close(){}};
  if (typeof coreAccessor!=="function")
    throw new Error("multimcp_host_core_required");
  const filename=String(env.COGENTIA_MCP_TASKS_COP_DATABASE||"").trim();
  const ownerInstanceRef=String(env.COGENTIA_MCP_LOCAL_INSTANCE_REF||"").trim();
  const primaryStoreId=String(env.COGENTIA_MCP_LOCAL_STORE_ID||"").trim();
  if (!filename||!existsSync(filename))
    throw new Error("multimcp_existing_local_cop_store_required");
  if (!/^instance:[a-zA-Z0-9][a-zA-Z0-9:._-]{1,127}$/.test(ownerInstanceRef) ||
    !/^sqlite:[a-zA-Z0-9:._-]+$/.test(primaryStoreId))
    throw new Error("multimcp_explicit_local_placement_required");
  if (String(env.COGENTIA_MCP_JHN_MUTATE||"")!=="1"||
    !String(env.COGENTIA_MCP_JHN_TOKEN||"").trim())
    throw new Error("multimcp_existing_jhn_attestation_required");
  const reader=new DatabaseSync(filename,{readOnly:true});
  try {
    for (const [table,columns] of Object.entries({
      cop_events:["topic","event_id","seq","envelope"],
      cop_topic_commitments:["topic","seq","head"],
    })) {
      const actual=new Set(reader.prepare("PRAGMA table_info("+table+")")
        .all().map(x=>x.name));
      if (!columns.every(c=>actual.has(c)))
        throw new Error("multimcp_local_committed_cop_schema_required");
    }
  } finally {reader.close();}

  function taskIds() {
    const db=new DatabaseSync(filename,{readOnly:true});
    try {
      return db.prepare("SELECT DISTINCT topic FROM cop_events "+
        "WHERE topic LIKE 'packet:pkt-mcp-%' ORDER BY topic")
        .all().map(x=>mcpTaskIdFromPacketTopic(x.topic));
    } finally {db.close();}
  }

  const store=createSqliteCopEventStore(filename);
  try {
    const coreProvider={
      async handleJsonRpc(message) {
        const core=coreAccessor();
        if (!core) throw new Error("multimcp_host_core_unavailable");
        const response=await core.handleJsonRpc(message);
        if (message.method==="tools/list"&&response?.result?.tools)
          return {...response,result:{...response.result,
            tools:response.result.tools.filter(x=>!x.name.startsWith("multimcp_"))}};
        return response;
      },
    };
    const providers={cogentia:coreProvider,...additionalProviders};
    const runtime=createMultiMcpProgramRuntime({
      providers,
      authorizeCall:async({context,tool})=>
        verifiedJhn(context?.auth)&&tool?.name!==undefined,
    });
    const surface=createMultiMcpMcpSurface({runtime});
    async function authorizationForTask(taskId) {
      const created=store.listTopic(packetTopicForMcpTask(taskId))
        .find(e=>e.payload?.phase==="created"&&
          e.payload?.toolName==="multimcp_program_execute");
      const owner=created?.payload?.owner;
      if (typeof owner!=="string"||!owner.startsWith("jhn:"))return null;
      const actor=owner.slice(4);
      const auth=resolveCallerAuth(env,{view:"public",
        headers:{"x-cogentia-jhn-token":env.COGENTIA_MCP_JHN_TOKEN},
        meta:{[ACTOR_META_KEY]:actor,[PRINCIPAL_META_KEY]:"principal:jhn"},
      });
      return verifiedJhn(auth)&&auth.actor===actor?auth:null;
    }
    const bridge=createMultiMcpCopBridge({
      runtime,store,primaryStoreId,ownerInstanceRef,
      authorizationForTask,listTaskIds:taskIds,
      // The canonical CPS source can be in another locality. Its reader is
      // supplied by the host; never copy it into a second central ledger.
      verifyExternalResult:cpsStore
        ? createCanonicalChatgptCpsReturnVerifier({cpsStore}) : null,
    });
    // Preserve the authority boundary for Task creation even if used from
    // another host composition; the Core also checks this exact identity.
    const adapter={
      ...bridge.adapter,
      async shouldCreate(context) {
        return verifiedJhn(context.auth)&&
          bridge.adapter.shouldCreate(context);
      },
      async create(context) {
        if (!verifiedJhn(context.auth))
          throw new Error("multimcp_attested_caller_required");
        return bridge.adapter.create(context);
      },
    };
    let closed=false,started=false;
    // Source-local projection for the existing signed CPS assignment API.
    // This does not dispatch a browser turn or create a new continuation.
    async function pendingCps({taskId,auth}={}) {
      const task=await bridge.adapter.get({taskId,auth});
      if(task.status!=="input_required")
        return null;
      const events=store.listTopic(packetTopicForMcpTask(taskId));
      const open=events.findLast(x=>x.payload?.phase==="input_required");
      const pending=open?.payload?.pending;
      if(open?.payload?.verified_external_result_required!==true ||
        pending?.capability!=="chatgpt.delegate" ||
        typeof pending.input?.prompt!=="string" ||
        !pending.input.prompt.trim())
        return null;
      const ref=assignedCpsReference({
        packetRef:packetRefForMcpTask(taskId),pending,
      });
      return {...ref,question:pending.input.prompt,
        task_id:taskId,source_event_ref:open.idempotency_key};
    }
    async function acceptCanonicalCpsReturn({taskId,auth,continuation_id}={}) {
      if(!cpsStore)throw new Error("canonical_cps_source_not_connected");
      const expected=await pendingCps({taskId,auth});
      if(!expected||expected.continuation_id!==continuation_id)
        throw new Error("cps_task_correlation_mismatch");
      return bridge.adapter.acceptVerifiedExternalResult(taskId,auth,{
        continuation_id,
      });
    }
    async function acceptAssignedCpsReturn({
      assignment_ref,continuation_id,
    }={}) {
      if(!cpsStore)return {status:"not_connected"};
      const match=/^packet:pkt-mcp-([0-9a-f-]{36}):slot:([0-9]+)$/
        .exec(assignment_ref||"");
      if(!match)return {status:"not_applicable"};
      const taskId="task:"+match[1];
      const auth=await authorizationForTask(taskId);
      if(!auth)return {status:"not_authorized"};
      try {
        const receipt=await acceptCanonicalCpsReturn({
          taskId,auth,continuation_id,
        });
        return {status:receipt.duplicate
          ? "already_resumed" : receipt.ok?"resume_scheduled":"not_confirmed"};
      }catch{return {status:"needs_reconciliation"}}
    }
    return {
      enabled:true,extras:{

        mcpProgramSurface:surface,
        mcpTasksAdapter:adapter,
      },
      pendingCps,acceptCanonicalCpsReturn,acceptAssignedCpsReturn,
      async start() {
        if (closed)throw new Error("multimcp_runtime_closed");
        if (started)return;
        for (const taskId of taskIds()) {
          const events=store.listTopic(packetTopicForMcpTask(taskId));
          if (events.some(e=>e.payload?.phase==="created"&&
            e.payload?.toolName==="multimcp_program_execute")&&
            !bridge.pilot.auditPacket(taskId).ok)
            throw new Error("multimcp_local_packet_audit_failed");
        }
        bridge.start();
        started=true;
        try{return await bridge.recover();}
        catch(error){bridge.stop();started=false;throw error;}
      },
      close() {
        if (closed)return;
        bridge.stop();store.close();closed=true;
      },
    };
  }catch(error){store.close();throw error;}
}
