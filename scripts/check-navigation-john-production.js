#!/usr/bin/env node
/** Production positive probe. Run ONLY inside an already mandated JHN client. */
const endpoint = process.env.COGENTIA_JHN_MCP_ENDPOINT || 'http://127.0.0.1:8791/mcp';
const secret = process.env.COGENTIA_MCP_JHN_TOKEN;
const mandate = process.env.COGENTIA_JHN_MANDATE_REF;
if (!secret || !mandate) {
  console.error('NOT_RUN: requires an existing JHN credential and explicit mandate reference; no secrets were read or printed');
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
      mandate_id: mandate, principal_id: 'principal:jhn',
    } },
  };
  try {
    const response = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(10000), headers: {
      'content-type': 'application/json', accept: 'application/json',
      authorization: `Bearer ${secret}`,
      'x-cogentia-actor': 'agent:jhn',
      'x-cogentia-mandate': mandate,
      'x-cogentia-principal': 'principal:jhn',
    }, body: JSON.stringify(body) });
    const document = await response.json();
    const data = document.result?.structuredContent?.data;
    const events = data?.events || [];
    const receipt = events.find(e => e.type === 'john.tool.receipt' && e.data?.capability === 'browser.navigation.instances');
    const settled = events.find(e => e.type === 'john.accounting.settled');
    const completed = events.find(e => e.type === 'john.run.completed');
    const valid = response.ok && data?.ok === true && data.status === 'completed'
      && receipt?.data?.status === 'completed' && Boolean(settled && completed)
      && data.accounting?.tool_calls_count === 1
      && data.accounting?.external_effects === 0
      && data.accounting?.ithaca_returned === true;
    console.log(JSON.stringify({
      ok: valid, request_id: id, http_status: response.status,
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
