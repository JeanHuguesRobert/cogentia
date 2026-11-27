/** Site libraries provide observed semantic roles, not additional authority.
 * Select reviewed local code by a parsed HTTPS host, never a page-supplied
 * filename, script or URL. A new site extends this data table.
 */
import {readFileSync} from 'node:fs';
import {editorRole as facebookEditorRole} from '../../browser-stdlib/adapters/facebook-editor.js';

const sites=Object.freeze([
 Object.freeze({id:'facebook',domain:'facebook.com',
  roles:Object.freeze(['facebook.comment-composer']),editorRole:facebookEditorRole}),
]);
function siteFor(url){
 try{
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||parsed.username||parsed.password)return null;
  return sites.find(site=>parsed.hostname===site.domain||parsed.hostname.endsWith('.'+site.domain))??null;
 }catch{return null}
}
export function siteEditorProjection(url){
 const site=siteFor(url);
 return site?{id:site.id,matcher:'('+site.editorRole.toString()+')'}:null;
}
export function projectSiteEditorRole(url,role){
 return siteFor(url)?.roles.includes(role)?{semantic_role:role}:{};
}


// Legacy TUI uses the same matcher, packaged with the existing site library.
// A short observation or edit needs only the matcher, not the whole adapter.
export function facebookAdapterSource(){
 const source=readFileSync(new URL('../../browser-stdlib/adapters/facebook.js',import.meta.url),'utf8');
 return '(() => {const editorRole='+facebookEditorRole.toString()+';\n'+source+'\n})()';
}
