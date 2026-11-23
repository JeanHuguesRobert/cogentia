// Alan v0.2 reference validator; Cogentia #36.
// GPT-6 under Jean Hugues Noël Robert's direction, 2026-11-23.
import {standard} from './stdlib.js';
export class AlanError extends Error{
  constructor(code,at='',detail=''){
    super([code,at,detail].filter(Boolean).join(': '));
    this.name='AlanError';this.code=code;this.at=at;
  }
}
const fail=(code,at,detail)=>{throw new AlanError(code,at,detail)};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  (Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const local=/^[A-Za-z_][A-Za-z0-9_]*$/;
const qualified=/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const forbidden=new Set(['__proto__','prototype','constructor']);
function name(x,at,regexp=local){
  if(typeof x!=='string'||!regexp.test(x)||x.split('.').some(s=>forbidden.has(s)))fail('ALAN_INVALID_NAME',at,String(x));
}
function own(x,at){if(!object(x))fail('ALAN_EXPECTED_OBJECT',at)}
function keysOnly(x,keys,at){
  for(const k of Object.keys(x))if(!keys.includes(k))fail('ALAN_UNKNOWN_FIELD',at,k);
}
function fields(x,at){
  own(x,at);for(const k of Object.keys(x))name(k,at);
}
function unique(names,at){
  if(new Set(names).size!==names.length)fail('ALAN_DUPLICATE',at);
}
function value(v,at,locals,depth=0){
  if(depth>40)fail('ALAN_AST_DEPTH',at);
  own(v,at);switch(v.kind){
    case 'literal':
      keysOnly(v,['kind','value'],at);
      if(v.value!==null&&!['string','number','boolean'].includes(typeof v.value)||
        typeof v.value==='number'&&!Number.isFinite(v.value))fail('ALAN_INVALID_LITERAL',at);
      return;
    case 'reference':
      keysOnly(v,['kind','path'],at);
      if(!Array.isArray(v.path)||!v.path.length)fail('ALAN_INVALID_REFERENCE',at);
      for(const p of v.path)name(p,at);
      if(!locals.has(v.path[0]))fail('ALAN_UNBOUND_REFERENCE',at,v.path[0]);
      return;
    case 'list':
      keysOnly(v,['kind','items'],at);
      if(!Array.isArray(v.items))fail('ALAN_EXPECTED_LIST',at);
      v.items.forEach((x,i)=>value(x,at+'.items['+i+']',locals,depth+1));
      return;
    case 'record':
      keysOnly(v,['kind','fields'],at);fields(v.fields,at+'.fields');
      for(const [k,x] of Object.entries(v.fields))value(x,at+'.'+k,locals,depth+1);
      return;
    default:fail('ALAN_UNKNOWN_VALUE_KIND',at,String(v.kind));
  }
}
function argumentsMatch(args,params,at,locals){
  fields(args,at+'.args');
  const a=Object.keys(args);
  for(const p of params)if(!Object.hasOwn(args,p))fail('ALAN_MISSING_ARGUMENT',at,p);
  for(const p of a)if(!params.includes(p))fail('ALAN_UNKNOWN_ARGUMENT',at,p);
  for(const [k,v] of Object.entries(args))value(v,at+'.args.'+k,locals);
}
function declaredLocals(body,vars){
  for(const op of body){
    if(!object(op))continue; // let the primary validator produce a typed diagnostic
    if(op.bind!==undefined)vars.add(op.bind);
    if(op.op==='if'){
      declaredLocals(op.then_body||[],vars);
      declaredLocals(op.else_body||[],vars);
    }
    if(op.op==='while')declaredLocals(op.body||[],vars);
  }
}
function checkBody(body,at,locals,scope,depth=0){
  if(depth>30)fail('ALAN_BODY_DEPTH',at);
  if(!Array.isArray(body))fail('ALAN_EXPECTED_BODY',at);
  for(let i=0;i<body.length;i++){
    const op=body[i],where=at+'['+i+']';
    own(op,where);
    if(op.bind!==undefined)name(op.bind,where);
    switch(op.op){
      case 'assign':
        keysOnly(op,['op','bind','value'],where);
        if(!op.bind)fail('ALAN_MISSING_BIND',where);
        value(op.value,where+'.value',locals);break;
      case 'call': {
        keysOnly(op,['op','bind','callee','args'],where);
        name(op.callee,where,qualified);
        const callee=scope.functions.get(op.callee);
        const std=standard[op.callee];
        if(!callee&&!std)fail('ALAN_UNKNOWN_CALLEE',where,op.callee);
        if(std&&!scope.uses.has('std.'+op.callee.split('.')[0]))fail('ALAN_MISSING_IMPORT',where);
        argumentsMatch(op.args,(callee?.params||std.params),where,locals);break;
      }
      case 'mcp': {
        keysOnly(op,['op','bind','capability','args'],where);
        name(op.capability,where,qualified);
        const ext=scope.externs.get(op.capability);
        if(!ext)fail('ALAN_UNKNOWN_CAPABILITY',where,op.capability);
        if(!scope.uses.has('std.mcp'))fail('ALAN_MISSING_IMPORT',where,'std.mcp');
        argumentsMatch(op.args,Object.keys(ext.input||{}),where,locals);break;
      }
      case 'if':
        keysOnly(op,['op','condition','then_body','else_body'],where);
        value(op.condition,where+'.condition',locals);
        checkBody(op.then_body,where+'.then',locals,scope,depth+1);
        if(op.else_body!==undefined)checkBody(op.else_body,where+'.else',locals,scope,depth+1);
        break;
      case 'while':
        keysOnly(op,['op','condition','body'],where);
        value(op.condition,where+'.condition',locals);
        checkBody(op.body,where+'.body',locals,scope,depth+1);break;
      case 'emit':
        keysOnly(op,['op','event','args'],where);
        name(op.event,where);
        argumentsMatch(op.args||{},Object.keys(op.args||{}),where,locals);break;
      case 'return':
        keysOnly(op,['op','value'],where);
        value(op.value,where+'.value',locals);
        if(op.value.kind!=='record')fail('ALAN_RETURN_RECORD',where);break;
      case 'fail':
        keysOnly(op,['op','code','message'],where);
        value(op.code,where+'.code',locals);
        if(op.message)value(op.message,where+'.message',locals);break;
      default:fail('ALAN_UNKNOWN_OP',where,String(op.op));
    }
  }
}
export function validate(program){
  own(program,'program');keysOnly(program,['type','version','uses','externs','functions'],'program');
  if(program.type!=='alan.program'||program.version!=='0.2')fail('ALAN_UNSUPPORTED_VERSION','program');
  if(!Array.isArray(program.uses)||!Array.isArray(program.functions)||
     !Array.isArray(program.externs))fail('ALAN_INVALID_PROGRAM','program');
  for(const u of program.uses)name(u,'uses',qualified);
  unique(program.uses,'uses');
  const functions=new Map(),externs=new Map();
  for(const f of program.functions){
    own(f,'function');
    keysOnly(f,['kind','name','params','body'],'function');
    if(!['fn','verb'].includes(f.kind))fail('ALAN_INVALID_FUNCTION_KIND',f.name);
    name(f.name,'function',qualified);
    if(functions.has(f.name)||Object.hasOwn(standard,f.name))
      fail('ALAN_DUPLICATE_FUNCTION',f.name);
    if(!Array.isArray(f.params))fail('ALAN_INVALID_PARAMETERS',f.name);
    for(const p of f.params)name(p,f.name);
    unique(f.params,f.name);
    functions.set(f.name,f);
  }
  for(const x of program.externs){
    own(x,'extern');keysOnly(x,['name','kind','effect','data','policy','input','output','mode'],'extern');
    name(x.name,'extern',qualified);
    if(externs.has(x.name))fail('ALAN_DUPLICATE_EXTERN',x.name);
    if(x.kind!=='tool'||!['P1','P3','P4','P5'].includes(x.policy)||
      !['read_only','private_data_access','repository_write','destructive_action'].includes(x.effect)||
      !['public','private'].includes(x.data))fail('ALAN_INVALID_EXTERN',x.name);
    fields(x.input,'extern.input');fields(x.output,'extern.output');
    for(const t of [...Object.values(x.input),...Object.values(x.output)])
      if(!['null','bool','int','float','string','list','map','record','any'].includes(t)&&
        !(typeof t==='string'&&/^[A-Z][A-Za-z0-9_]*$/.test(t)))
        fail('ALAN_INVALID_SIGNATURE',x.name,t);
    const minimum=x.effect==='destructive_action'?'P5':
      x.effect==='repository_write'?'P4':
      (x.effect==='private_data_access'||x.data==='private')?'P3':'P1';
    const levels=['P1','P3','P4','P5'];
    if(levels.indexOf(x.policy)<levels.indexOf(minimum)||
      (x.effect==='repository_write'&&x.policy!=='P5'&&x.mode!=='staged_only'))
      fail('ALAN_EXTERN_POLICY_MISMATCH',x.name);
    externs.set(x.name,x);
  }
  const scope={functions,externs,uses:new Set(program.uses)};
  for(const f of program.functions){
    const locals=new Set(f.params);
    declaredLocals(f.body||[],locals);
    checkBody(f.body,'fn.'+f.name,locals,scope);
  }
  return scope;
}
