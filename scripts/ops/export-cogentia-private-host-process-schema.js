#!/usr/bin/env node
/** Export ONLY the server's canonical host-process schemas for connector refresh.
 * The export is declarative and cannot grant authority or execute anything.
 */
import {writeFileSync} from 'node:fs';
import {createMcpCore} from '../lib/cogentia-mcp-core.js';
const tools=createMcpCore({COGENTIA_MCP_VIEW:'full',COGENTIA_ADMIN_TOKEN:'export-schema-fixture',COGENTIA_MCP_ALLOW_MUTATE:'1'}).tools;
const names=['cogentia_host_process_prepare','cogentia_host_process_run'];
const definitions=names.map(name=>{
 const t=tools.find(x=>x.name===name);
 if(!t?.inputSchema?.properties?.execution_mode?.enum?.includes('super'))throw Error('canonical_super_schema_not_published:'+name);
 const schema=JSON.parse(JSON.stringify(t.inputSchema));
 return {name,description:t.description,inputSchema:schema};
});
const result={kind:'cogentia.private.connector-schema-source/v1',
 source:'scripts/lib/cogentia-mcp-core.js',
 note:'A publication artifact only. Authentication, permissions, effect authorization and COP issuance are independent.',
 tools:definitions};
const json=JSON.stringify(result,null,2)+'\n';
if(process.argv[2]==='--write'){
 const path=process.argv[3]||'docs/connectors/cogentia-private-host-process-schema.json';
 writeFileSync(path,json);console.log('EXPORTED '+path);
}else process.stdout.write(json);
