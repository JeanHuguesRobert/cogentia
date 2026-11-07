/** Pre-admission bounded selector gate for the convenience John read call.
 * Never upgrades scopes or forwards arbitrary values into the browser.
 */
const ACTIONS=new Set(['status','tabs','structure','frames','context']);
export function normalizeJohnReadArguments(capability,args){
 if(!['browser.hosted.inspect','browser.navigation.instances'].includes(capability))throw Error('john_read_arguments_capability_denied');
 if(args==null)args={};
 if(!args || typeof args!=='object' || Array.isArray(args))throw Error('john_read_arguments_invalid');
 if(capability==='browser.navigation.instances'){
  if(Object.keys(args).length)throw Error('john_read_arguments_invalid');
  return {};
 }
 if(Object.keys(args).some(k=>!['action','tab_id','max_chars','include_url'].includes(k)) || !ACTIONS.has(args.action))
  throw Error('john_read_arguments_invalid');
 if(['structure','frames','context'].includes(args.action)){
  if(!Number.isSafeInteger(args.tab_id)||args.tab_id<1)throw Error('john_read_arguments_tab_required');
 }else if(args.tab_id!==undefined)throw Error('john_read_arguments_invalid');
 if(args.max_chars!==undefined && (args.action!=='context'||!Number.isSafeInteger(args.max_chars)||args.max_chars<1||args.max_chars>12000))throw Error('john_read_arguments_invalid');
 if(args.include_url!==undefined && typeof args.include_url!=='boolean')throw Error('john_read_arguments_invalid');
 // Sensitive paths are never included in the read selector; caller may ask
 // for URLs through existing explicit authorization and read exposure.
 return {...args};
}
