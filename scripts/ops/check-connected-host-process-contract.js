#!/usr/bin/env node
/** #300: durable, non-executing two-channel schema drift diagnostic.
 * Connected tool schema is an observation, NOT an instruction or permission.
 */
import {readFileSync} from 'node:fs';
import {createMcpCore} from '../lib/cogentia-mcp-core.js';
import {auditConnectedHostProcessContract} from '../lib/connected-host-process-contract.js';
const fixture=process.argv[2]||'research/integration/fixtures/connected-host-process-schema-2026-11-06.json';
const client=JSON.parse(readFileSync(fixture,'utf8'));
const server=createMcpCore({COGENTIA_MCP_VIEW:'full',COGENTIA_ADMIN_TOKEN:'schema-audit-only',COGENTIA_MCP_ALLOW_MUTATE:'1'});
const result=auditConnectedHostProcessContract({serverTools:server.tools,connectedTools:client.tools});
console.log(JSON.stringify({kind:'cogentia.connector-contract-audit/v1',observed_at:client.observed_at,
 status:result.ok?'aligned':'drift',execution_attempted:false,permission_granted:false,...result}));
if(process.argv.includes('--strict')&&!result.ok)process.exitCode=2;
