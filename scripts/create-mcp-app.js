#!/usr/bin/env node
// Small declarative MCP Apps scaffold. Does NOT deploy or activate effects.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const argv=process.argv.slice(2);
const option=(flag,defaultValue='')=>{const i=argv.indexOf(flag);return i<0?defaultValue:argv[i+1];};
const slug=option('--name'),title=option('--title',slug);
if(!/^[a-z][a-z0-9-]{0,63}$/.test(slug||'')||!title||title.length>150){
 console.error('Usage: node scripts/create-mcp-app.js --name my-app --title "My App"');
 process.exit(2);
}
const dir=path.resolve('mcp-apps',slug);
if(fs.existsSync(dir)){console.error('Already exists: '+dir);process.exit(2);}
const tool='cogentia_'+slug.replaceAll('-','_');
const manifest={
 schema:'cogentia.mcp-app.manifest.v1',name:slug,tool,
 uri:'ui://cogentia/'+slug+'-v1',title,
 description:'MCP App '+title+' — interface de démonstration sans effet.',
 html:'index.html',visibility:['model','app'],access:'public',
 mode:'read_only',kind:'cogentia.'+slug.replaceAll('-','_')+'.v1',
 inputSchema:{type:'object',properties:{},additionalProperties:false},
 csp:{connectDomains:[],resourceDomains:[]}
};
fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const esc=x=>x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const html='<!doctype html><html lang="fr"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>'+esc(title)+'</title></head><body><h2>'+esc(title)+'</h2>'+
 '<p>MCP App déclarative. Aucune action externe.</p>'+
 '<button id="toggle">Vérifier l’interaction</button><p id="status">Initialisation…</p>'+
 '<!-- BUNDLED_SDK_SCRIPT --></body></html>';
fs.writeFileSync(path.join(dir,'template.html'),html);
fs.writeFileSync(path.join(dir,'client.js'),`import {App} from '@modelcontextprotocol/ext-apps';
const app=new App({name:${JSON.stringify(title)},version:'1.0.0'});
const status=document.getElementById('status');
document.getElementById('toggle').addEventListener('click',()=>{
 status.textContent='Interaction locale vérifiée ; aucun effet externe.';
});
app.connect().then(()=>{status.textContent='MCP Apps connecté.';})
 .catch(e=>{status.textContent='Hôte indisponible : '+e.message;});
`);
const sourceBuild=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../mcp-apps/idual-calibration/build.mjs');
fs.copyFileSync(sourceBuild,path.join(dir,'build.mjs'));
fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({
 name:'@cogentia/'+slug+'-app',version:'1.0.0',private:true,type:'module',
 scripts:{build:'node build.mjs'},
 dependencies:{'@modelcontextprotocol/ext-apps':'2.0.4'},
 devDependencies:{esbuild:'0.25.12'}
},null,2)+'\n');
fs.writeFileSync(path.join(dir,'.gitignore'),'node_modules/\n');
console.log('Created '+dir+'; run: cd '+dir+' && npm install && npm run build');
