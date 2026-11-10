/**
 * Declarative local MCP Apps registry.
 *
 * MCP Apps standard boundary: _meta.ui.resourceUri -> ui:// resource
 * with text/html;profile=mcp-app. This file is a Cogentia registry, NOT a
 * competing transport/protocol. No dynamic JS execution or ambient effects.
 */
import fs from 'node:fs';
import path from 'node:path';
import { resolveRepoRoot } from './cogentia-agent-skills.js';

export const MCP_APP_MIME='text/html;profile=mcp-app';
const NAME=/^[a-z][a-z0-9-]{0,63}$/;
const TOOL=/^[a-z][a-z0-9_]{0,95}$/;
const URI=/^ui:\/\/cogentia\/[a-z0-9-]+-v[0-9]+$/;
const SAFE_HTML=/^[a-zA-Z0-9_-]+\.html$/;

export function listRegisteredMcpApps(options={}){
  const root=path.join(options.repoRoot||resolveRepoRoot(options.env||process.env),'mcp-apps');
  if(!fs.existsSync(root))return [];
  const apps=[],names=new Set(),uris=new Set();
  for(const entry of fs.readdirSync(root,{withFileTypes:true})){
    if(!entry.isDirectory()||!NAME.test(entry.name))continue;
    const dir=path.join(root,entry.name),manifestPath=path.join(dir,'manifest.json');
    if(!fs.existsSync(manifestPath))continue;
    const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    if(m.schema!=='cogentia.mcp-app.manifest.v1'||m.name!==entry.name||
      !TOOL.test(m.tool)||m.tool!=='cogentia_'+m.name.replaceAll('-','_')||
      !URI.test(m.uri)||!m.uri.startsWith('ui://cogentia/'+m.name+'-v')||
      !SAFE_HTML.test(m.html)||
      m.access!=='public'||
      !['conversation_mediated','read_only'].includes(m.mode)||
      !Array.isArray(m.visibility)||!m.visibility.includes('model')||
      m.visibility.some(v=>!['model','app'].includes(v))||
      m.inputSchema?.type!=='object'||m.inputSchema.additionalProperties!==false||
      typeof m.kind!=='string'||typeof m.title!=='string'||
      typeof m.description!=='string'||
      JSON.stringify(m.csp||{})!==JSON.stringify({connectDomains:[],resourceDomains:[]})||
      names.has(m.tool)||uris.has(m.uri)){
      throw new Error('Invalid or conflicting MCP App manifest: '+manifestPath);
    }
    const htmlPath=path.join(dir,m.html);
    if(!fs.statSync(htmlPath).isFile())throw new Error('Invalid MCP App resource: '+htmlPath);
    names.add(m.tool);uris.add(m.uri);
    apps.push({...m,htmlPath});
  }
  return apps;
}
export function listRegisteredMcpAppTools(options={}){
  return listRegisteredMcpApps(options)
    .filter(a=>a.visibility.includes('model'))
    .map(a=>({
      name:a.tool,description:a.description,
      inputSchema:a.inputSchema,
      _meta:{ui:{resourceUri:a.uri,visibility:a.visibility}},
      annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:false},
    }));
}
export function listRegisteredMcpAppResources(options={}){
  return listRegisteredMcpApps(options).map(a=>({
    uri:a.uri,name:a.name,title:a.title,
    mimeType:MCP_APP_MIME,description:a.description,
  }));
}
export function readRegisteredMcpAppResource(uri,options={}){
  const app=listRegisteredMcpApps(options).find(a=>a.uri===uri);
  if(!app)return null;
  return {ok:true,uri:app.uri,mimeType:MCP_APP_MIME,
    text:fs.readFileSync(app.htmlPath,'utf8'),
    uiMeta:{csp:app.csp||{connectDomains:[],resourceDomains:[]},prefersBorder:true},
  };
}
export function callRegisteredMcpAppTool(name,args={},options={}){
  const app=listRegisteredMcpApps(options).find(a=>a.tool===name);
  if(!app)return null;
  if(args===null||typeof args!=='object'||Array.isArray(args)||
     Object.keys(args).some(k=>!Object.hasOwn(app.inputSchema.properties||{},k)))
     throw Object.assign(new Error('Invalid MCP App arguments'),{error_class:'invalid_arguments'});
  // A declarative app is display-only. Semantic physical effects must be
  // registered independently through an actual, mandate-governed tool.
  return {ok:true,kind:app.kind,mode:app.mode,hardware_dispatch:false,
    physical_effect:false,status:'ready',ui_resource_uri:app.uri};
}
