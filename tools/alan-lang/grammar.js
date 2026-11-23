// Alan v0.2 compact strict source parser — Cogentia #36.
// GPT-6 under Jean Hugues Noël Robert's direction, 2026-11-23.
// No JS/Python eval, implicit precedence, inferred identifiers or tool access.
import {AlanError,validate} from './validate.js';
const error=(code,line,detail='')=>{throw new AlanError(code,'line '+line,detail)};
const simple=/^[A-Za-z_][A-Za-z0-9_]*$/;
const qualified=/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
function linesOf(text){
  if(typeof text!=='string')error('ALAN_SOURCE_TYPE',1);
  const lines=[],rows=text.replaceAll('\r\n','\n').split('\n');
  let buffer='',opened=0,quote=false,escape=false,start=1;
  for(let i=0;i<rows.length;i++){
    let clean='';
    for(const ch of rows[i]){
      if(quote){
        clean+=ch;
        if(escape)escape=false;
        else if(ch==='\\')escape=true;
        else if(ch==='"')quote=false;
      }else if(ch==='"'){quote=true;clean+=ch}
      else if(ch==='#')break;
      else{
        if(ch==='{'||ch==='[')opened++;
        if(ch==='}'||ch===']')opened--;
        if(opened<0)error('ALAN_UNBALANCED_LITERAL',i+1);
        clean+=ch;
      }
    }
    if(!buffer)start=i+1;
    buffer+=(buffer?' ':'')+clean.trim();
    if(!quote&&opened===0){
      const trimmed=buffer.trim();
      if(trimmed)lines.push({line:start,text:trimmed});
      buffer='';
    }
  }
  if(opened||quote)error('ALAN_UNBALANCED_LITERAL',start);
  return lines;
}
function splitTop(s,delimiter){
  const result=[];let start=0,depth=0,quote=false,escape=false;
  for(let i=0;i<s.length;i++){
    const ch=s[i];
    if(quote){
      if(escape)escape=false;
      else if(ch==='\\')escape=true;
      else if(ch==='"')quote=false;
    }else if(ch==='"')quote=true;
    else if(ch==='{'||ch==='[')depth++;
    else if(ch==='}'||ch===']')depth--;
    else if(depth===0&&(delimiter==='space'?/\s/.test(ch):ch===delimiter)){
      if(s.slice(start,i).trim())result.push(s.slice(start,i).trim());
      start=i+1;
    }
  }
  if(s.slice(start).trim())result.push(s.slice(start).trim());
  return result;
}
function parseValue(s,line){
  s=s.trim();
  if(s==='null')return {kind:'literal',value:null};
  if(s==='true'||s==='false')return {kind:'literal',value:s==='true'};
  if(/^"(?:[^"\\]|\\.)*"$/.test(s)){
    try{return {kind:'literal',value:JSON.parse(s)}}catch{error('ALAN_INVALID_STRING',line)}
  }
  if(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(s)){
    const n=Number(s);
    if(!Number.isFinite(n))error('ALAN_INVALID_NUMBER',line);
    return {kind:'literal',value:n};
  }
  if(s.startsWith('$')&&qualified.test(s.slice(1)))
    return {kind:'reference',path:s.slice(1).split('.')};
  if(s.startsWith('[')&&s.endsWith(']')){
    const inner=s.slice(1,-1).trim();
    return {kind:'list',items:inner?splitTop(inner,',').map(x=>parseValue(x,line)):[]};
  }
  if(s.startsWith('{')&&s.endsWith('}')){
    const inner=s.slice(1,-1).trim(),fields=Object.create(null);
    if(inner)for(const part of splitTop(inner,',')){
      const match=/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.+)$/s.exec(part);
      if(!match)error('ALAN_INVALID_RECORD',line,part);
      if(Object.hasOwn(fields,match[1]))error('ALAN_DUPLICATE_FIELD',line,match[1]);
      fields[match[1]]=parseValue(match[2],line);
    }
    return {kind:'record',fields:{...fields}};
  }
  error('ALAN_INVALID_VALUE',line,s);
}
function parseArgs(s,line){
  const args=Object.create(null);
  if(s.trim())for(const token of splitTop(s.trim(),'space')){
    const match=/^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/s.exec(token);
    if(!match)error('ALAN_INVALID_ARGUMENT',line,token);
    if(Object.hasOwn(args,match[1]))error('ALAN_DUPLICATE_ARGUMENT',line,match[1]);
    args[match[1]]=parseValue(match[2],line);
  }
  return {...args};
}
function signature(s,line){
  if(!s.startsWith('{')||!s.endsWith('}'))error('ALAN_INVALID_SIGNATURE',line);
  const fields=Object.create(null),inner=s.slice(1,-1).trim();
  if(inner)for(const part of splitTop(inner,',')){
    const match=/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)$/.exec(part);
    if(!match||Object.hasOwn(fields,match?.[1]))error('ALAN_INVALID_SIGNATURE',line,part);
    fields[match[1]]=match[2];
  }
  return {...fields};
}
export function parseAlan(source){
  const lines=linesOf(source);let cursor=0;
  const next=()=>lines[cursor];
  const take=()=>lines[cursor++];
  const head=take();
  if(!head||head.text!=='alan 0.2')error('ALAN_UNSUPPORTED_VERSION',head?.line||1);
  const program={type:'alan.program',version:'0.2',uses:[],externs:[],functions:[]};
  let defs=false;
  function block(){
    const body=[];
    while(next()&&next().text!=='end'&&next().text!=='else'){
      const {line,text}=take();
      let match;
      if((match=/^if\s+(.+)$/s.exec(text))){
        const condition=parseValue(match[1],line),then_body=block();
        let else_body;
        if(next()?.text==='else'){take();else_body=block()}
        if(next()?.text!=='end')error('ALAN_MISSING_END',line);
        take();body.push({op:'if',condition,then_body,...(else_body?{else_body}:{})});
      }else if((match=/^while\s+(.+)$/s.exec(text))){
        const condition=parseValue(match[1],line),inner=block();
        if(next()?.text!=='end')error('ALAN_MISSING_END',line);
        take();body.push({op:'while',condition,body:inner});
      }else if((match=/^(?:([A-Za-z_][A-Za-z0-9_]*)\s*=\s*)?(call|mcp)\s+([A-Za-z_][A-Za-z0-9_.]*)(?:\s+(.+))?$/s.exec(text))){
        const [,bind,kind,target,argText]=match;
        body.push({op:kind,...(bind?{bind}:{}),
          [kind==='call'?'callee':'capability']:target,args:parseArgs(argText||'',line)});
      }else if((match=/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/s.exec(text))){
        body.push({op:'assign',bind:match[1],value:parseValue(match[2],line)});
      }else if((match=/^return(?:\s+(.+))?$/s.exec(text))){
        body.push({op:'return',value:{kind:'record',
          fields:parseArgs(match[1]||'',line)}});
      }else if((match=/^fail\s+(.+)$/s.exec(text))){
        const args=parseArgs(match[1],line);
        if(!args.code)error('ALAN_MISSING_FAILURE_CODE',line);
        body.push({op:'fail',code:args.code,...(args.message?{message:args.message}:{})});
        if(Object.keys(args).some(k=>!['code','message'].includes(k)))
          error('ALAN_UNKNOWN_FAILURE_FIELD',line);
      }else if((match=/^emit\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(.+))?$/s.exec(text))){
        body.push({op:'emit',event:match[1],args:parseArgs(match[2]||'',line)});
      }else error('ALAN_UNKNOWN_STATEMENT',line,text);
    }
    return body;
  }
  while(next()){
    const {line,text}=take();
    let match;
    if((match=/^use\s+([A-Za-z_][A-Za-z0-9_.]*)$/.exec(text))){
      if(defs)error('ALAN_DECLARATION_ORDER',line);
      program.uses.push(match[1]);
    }else if((match=/^extern\s+([A-Za-z_][A-Za-z0-9_.]*)$/.exec(text))){
      if(defs)error('ALAN_DECLARATION_ORDER',line);
      const ext={name:match[1]};
      while(next()&&next().text!=='end'){
        const field=take(),m=/^(kind|effect|data|policy|mode|input|output)\s+(.+)$/s.exec(field.text);
        if(!m||Object.hasOwn(ext,m?.[1]))error('ALAN_INVALID_EXTERN_FIELD',field.line);
        ext[m[1]]=['input','output'].includes(m[1])?
          signature(m[2],field.line):m[2].trim();
      }
      if(next()?.text!=='end')error('ALAN_MISSING_END',line);
      take();
      program.externs.push(ext);
    }else if((match=/^(fn|verb)\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+(.+))?$/.exec(text))){
      defs=true;
      const params=match[3]?match[3].split(/\s+/):[];
      const body=block();
      if(next()?.text!=='end')error('ALAN_MISSING_END',line);
      take();
      program.functions.push({kind:match[1],name:match[2],params,body});
    }else error('ALAN_UNKNOWN_TOPLEVEL',line,text);
  }
  validate(program);
  return program;
}
