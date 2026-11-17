/** MCP 2026-07-28 Tasks extension negotiation and result-shape boundary.
 * Pure: no new task store, side effect, provider, scheduler or authority.
 * Source: https://tasks.extensions.modelcontextprotocol.io/specification/2026-07-28/tasks
 */
export const MCP_TASKS_EXTENSION_ID='io.modelcontextprotocol/tasks';
export const MCP_TASKS_MISSING_CLIENT_CAPABILITY=-32021;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const statuses=new Set(['working','input_required','completed','failed','cancelled']);
const iso=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT/.test(x)&&Number.isFinite(Date.parse(x));

/** The modern MCP core is stateless: initialization or client identity does
 * NOT prove optional Tasks support; client opt-in is PER REQUEST. */
export function clientSupportsMcpTasks(meta,{protocolEra='modern'}={}){
  if(protocolEra!=='modern'||!object(meta))return false;
  const cap=meta['io.modelcontextprotocol/clientCapabilities'];
  return object(cap)&&object(cap.extensions)&&
    Object.hasOwn(cap.extensions,MCP_TASKS_EXTENSION_ID)&&
    object(cap.extensions[MCP_TASKS_EXTENSION_ID]);
}

/** Opt-in adapter is supplied by an actual persisted COP/ONA bridge. No
 * source-side inference or environment flag alone advertises the feature. */
export function isMcpTasksAdapterReady(adapter){
  return object(adapter)&&adapter.durable===true&&
    ['shouldCreate','create','get','update','cancel'].every(key=>
      typeof adapter[key]==='function');
}

/** Flat CreateTaskResult/GetTaskResult carry task data directly on `result`.
 * Do not convert an underlying CallToolResult with isError:true to failed:
 * `completed` with result is the correct MCP Tasks semantics. */
export function formatMcpTask(record,{operation='get',expectedId}={}){
  if(!object(record)||typeof record.taskId!=='string'||
    !record.taskId.trim()||record.taskId.length>512||
    (expectedId!==undefined&&record.taskId!==expectedId)||
    !statuses.has(record.status)||!iso(record.createdAt)||
    !iso(record.lastUpdatedAt)||
    (record.ttlMs!==null&&(!Number.isSafeInteger(record.ttlMs)||record.ttlMs<0))||
    (record.pollIntervalMs!==undefined&&
      (!Number.isSafeInteger(record.pollIntervalMs)||record.pollIntervalMs<0)))
    throw new TypeError('invalid_mcp_task_state');
  if(operation!=='create'&&operation!=='get')throw new TypeError('invalid_mcp_task_operation');
  if(record.status==='completed'&&!object(record.result))
    throw new TypeError('completed_task_requires_result');
  if(record.status==='failed'&&(!object(record.error)||!Number.isSafeInteger(record.error.code)||
    typeof record.error.message!=='string'))
    throw new TypeError('failed_task_requires_jsonrpc_error');
  if(record.status==='input_required'&&!object(record.inputRequests))
    throw new TypeError('input_required_requires_requests');
  // Avoid exposing adapter-internal fields (principal, secrets, receipt refs).
  const keys=['taskId','status','statusMessage','createdAt','lastUpdatedAt','ttlMs',
    'pollIntervalMs','result','error','inputRequests'];
  return Object.fromEntries([['resultType',operation==='create'?'task':'complete'],
    ...keys.filter(k=>Object.hasOwn(record,k)).map(k=>[k,record[k]])]);
}

export function validateMcpTaskId(value){
  return typeof value==='string'&&value.trim().length>0&&value.length<=512;
}
