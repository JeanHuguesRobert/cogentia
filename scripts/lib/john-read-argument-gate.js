/** Pre-admission bounded selector gate for the convenience John read call.
 * Never upgrades scopes or forwards arbitrary values into the browser.
 */
function exactHttpsOrigin(value){
 try{const u=new URL(value);return u.protocol==='https:'&&u.origin===value&&!u.username&&!u.password;}
 catch{return false;}
}
const ACTIONS=new Set(['status','tabs','structure','frames','context','frame_tree','frame_structure']);
export function normalizeJohnReadArguments(capability,args){
 if(!['browser.hosted.inspect','browser.navigation.instances'].includes(capability))throw Error('john_read_arguments_capability_denied');
 if(args==null)args={};
 if(!args || typeof args!=='object' || Array.isArray(args))throw Error('john_read_arguments_invalid');
 if(capability==='browser.navigation.instances'){
  if(Object.keys(args).length)throw Error('john_read_arguments_invalid');
  return {};
 }
 if(Object.keys(args).some(k=>!['action','tab_id','max_chars','include_url','expected_url','frame_id','expected_frame_origin'].includes(k)) || !ACTIONS.has(args.action))
  throw Error('john_read_arguments_invalid');
 if(['structure','frames','context','frame_tree','frame_structure'].includes(args.action)){
  if(!Number.isSafeInteger(args.tab_id)||args.tab_id<1)throw Error('john_read_arguments_tab_required');
 }else if(args.tab_id!==undefined)throw Error('john_read_arguments_invalid');
 if(['frame_tree','frame_structure'].includes(args.action)){
  if(typeof args.expected_url!=='string'||!args.expected_url.startsWith('https://'))throw Error('john_read_arguments_invalid');
  if(args.action==='frame_structure' && (!/^[A-Za-z0-9_-]{1,160}$/.test(args.frame_id||'')||
    !exactHttpsOrigin(args.expected_frame_origin)))throw Error('john_read_arguments_invalid');
 }else if(args.expected_url!==undefined||args.frame_id!==undefined||args.expected_frame_origin!==undefined)
  throw Error('john_read_arguments_invalid');
 if(args.max_chars!==undefined && (args.action!=='context'||!Number.isSafeInteger(args.max_chars)||args.max_chars<1||args.max_chars>12000))throw Error('john_read_arguments_invalid');
 if(args.include_url!==undefined && typeof args.include_url!=='boolean')throw Error('john_read_arguments_invalid');
 // Sensitive paths are never included in the read selector; caller may ask
 // for URLs through existing explicit authorization and read exposure.
 return {...args};
}
