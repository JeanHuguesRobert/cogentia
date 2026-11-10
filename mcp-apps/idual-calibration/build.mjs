import fs from 'node:fs/promises';
import {build} from 'esbuild';
const result=await build({
 entryPoints:['client.js'],bundle:true,minify:true,write:false,
 format:'iife',platform:'browser',target:'es2022',
 logLevel:'warning'
});
const script=result.outputFiles[0].text;
const template=await fs.readFile('template.html','utf8');
if(!template.includes('<!-- BUNDLED_SDK_SCRIPT -->'))throw Error('Missing template insertion point');
await fs.writeFile('index.html',template.replace('<!-- BUNDLED_SDK_SCRIPT -->',()=>'<script>'+script+'</script>'));
console.log('MCP Apps SDK bundled into index.html:',script.length,'bytes');
