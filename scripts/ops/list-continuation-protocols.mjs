#!/usr/bin/env node
/** Optional protocol discovery — no connection, model request or task emission. */
import {createContinuationProtocolCatalog} from '../lib/continuation-protocol-catalog.mjs';
const arguments_=process.argv.slice(2);
const catalog=createContinuationProtocolCatalog();
const id=arguments_.length===1&&arguments_[0].startsWith('--id=')?
  arguments_[0].slice(5):null;
if(arguments_.length>1||(arguments_.length===1&&!id)){
  console.error('Usage: node scripts/ops/list-continuation-protocols.mjs [--id=PROTOCOL_ID]');
  process.exitCode=2;
}else if(id){
  const entry=catalog.get(id);
  if(!entry){
    console.log(JSON.stringify({known:false,protocol_id:id,
      status:'unrecognized_protocol',interpretation_required:true,
      execution_authorized:false},null,2));
  }else console.log(JSON.stringify(entry,null,2));
}else{
  console.log(JSON.stringify({profile:'cogentia.continuation-protocol-catalog/v1',
    optional:true,closed_world:false,execution_authorized:false,
    protocols:catalog.list()},null,2));
}
