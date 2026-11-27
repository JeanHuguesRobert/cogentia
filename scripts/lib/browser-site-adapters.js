/** Site libraries provide observed semantic roles, not additional authority.
 * Select reviewed local code by a parsed HTTPS host, never a page-supplied
 * filename, script or URL. A new site extends this data table.
 */
import {readFileSync} from 'node:fs';
import {editorRole as facebookEditorRole,editorContext as facebookEditorContext,writeCommentParagraphs as facebookWriteParagraphs} from '../../browser-stdlib/adapters/facebook-editor.js';

const sites=Object.freeze([
 Object.freeze({id:'facebook',domain:'facebook.com',
  roles:Object.freeze(['facebook.comment-composer']),editorRole:facebookEditorRole,editorContext:facebookEditorContext,writeParagraphs:facebookWriteParagraphs}),
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
 return site?{id:site.id,matcher:'('+site.editorRole.toString()+')',context:'('+site.editorContext.toString()+')',writeParagraphs:'('+site.writeParagraphs.toString()+')'}:null;
}
export function projectSiteEditorRole(url,role){
 return siteFor(url)?.roles.includes(role)?{semantic_role:role}:{};
}


// Legacy TUI uses the same matcher, packaged with the existing site library.
// A short observation or edit needs only the matcher, not the whole adapter.
export function facebookAdapterSource(){
 const source=readFileSync(new URL('../../browser-stdlib/adapters/facebook.js',import.meta.url),'utf8');
 return '(() => {const editorRole='+facebookEditorRole.toString()+';const writeCommentParagraphs='+facebookWriteParagraphs.toString()+';\n'+source+'\n})()';
}


// Only allow the small, typed relationship; never project nearby text.
export function projectEditorContext(url,context,epoch){
 if(!siteFor(url)||!context||typeof context!=='object'||!(/^[a-f0-9]{32}$/.test(epoch||'')))return {};
 const valid=uid=>typeof uid==='string'&&/^[a-f0-9]{32}:[1-9][0-9]{0,15}$/.test(uid)&&uid.startsWith(epoch+':');
 if(!valid(context.scope_uid)||!valid(context.cancel_uid)||context.scope_uid===context.cancel_uid||
   !Number.isInteger(context.ancestor_distance)||context.ancestor_distance<1||context.ancestor_distance>12||
   typeof context.actionable!=='boolean')return {};
 return {edit_context:{scope_uid:context.scope_uid,cancel_uid:context.cancel_uid,
  ancestor_distance:context.ancestor_distance,actionable:context.actionable}};
}
