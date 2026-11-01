#!/usr/bin/env node
/** One-shot operator-mandated JHN probe. No secret in command-line or logs. */
import { MANDATE_ID, PRINCIPAL_ID } from './lib/agent-jhn-whatsapp/constants.js';
const endpoint = process.env.COGENTIA_JHN_MCP_ENDPOINT || 'http://127.0.0.1:8791/mcp';
const secret = process.env.COGENTIA_MCP_JHN_TOKEN;
const mandate = process.env.COGENTIA_JHN_MANDATE_REF || MANDATE_ID;
const actor = 'agent:jhn/handler:navigation-probe';
if (!secret || !mandate || mandate !== MANDATE_ID) {
  console.error('NOT_RUN: requires a pre-provisioned JHN credential and the canonical non-commitment mandate; no secrets printed');
  process.exitCode = 2;
} else if (!/^http:\/\/(127\.0\.0\.1|localhost):8791\/mcp$/.test(endpoint)) {
  console.error('NOT_RUN: only the local MCP service is eligible');
  process.exitCode = 2;
} else {
  const id = 'nav-jhn-positive-' + Date.now();
  const body = {
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'cogentia_john_run', arguments: {
      request_id: id, prompt: 'List browser instances only. Do not inspect tabs or pages.',
      capability: 'browser.navigation.instances', exposure: 'read_only',
      max_steps: 3, max_tool_calls: 1, max_elapsed_ms: 8000,
      mandate_id: mandate, principal_id: PRINCIPAL_ID,
    } },
  };
  try {
    const response = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(10000), headers: {
      'content-type': 'application/json', accept: 'application/json',
      authorization: `Bearer ${secret}`,
      'x-cogentia-actor': actor,
      'x-cogentia-mandate': mandate,
      'x-cogentia-principal': PRINCIPAL_ID,
    }, body: JSON.stringify(body) });
    const document = await response.json();
    const data = document.result?.structuredContent?.data;
    const events = data?.events || [];
    const receipt = events.find(e => e.type === 'john.tool.receipt' && e.data?.capability === 'browser.navigation.instances');
    const settled = events.find(e => e.type === 'john.accounting.settled');
    const completed = events.find(e => e.type === 'john.run.completed');
    const bound = events.filter(e => e.type === 'john.run.started' || e.type === 'john.tool.requested');
    const identityBound = bound.length >= 2 && bound.every(e => e.principal_id === PRINCIPAL_ID && e.mandate?.id === mandate);
    const valid = identityBound && response.ok && data?.ok === true && data.status === 'completed'
      && receipt?.data?.status === 'completed' && Boolean(settled && completed)
      && data.accounting?.tool_calls_count === 1
      && data.accounting?.external_effects === 0
      && data.accounting?.ithaca_returned === true;
    console.log(JSON.stringify({
      ok: valid, request_id: id, http_status: response.status,
      actor, mandate, identity_bound: identityBound,
      status: data?.status || 'unavailable', receipt: Boolean(receipt),
      accounting: Boolean(settled), tool_calls: data?.accounting?.tool_calls_count ?? null,
      external_effects: data?.accounting?.external_effects ?? null,
      ithaca_returned: data?.accounting?.ithaca_returned ?? false,
      failure_code: data?.failure?.code || document.result?.structuredContent?.error_class || null,
    }));
    if (!valid) process.exitCode = 1;
  } catch (error) {
    console.error('PROBE_FAILED: ' + error.name);
    process.exitCode = 1;
  }
}
