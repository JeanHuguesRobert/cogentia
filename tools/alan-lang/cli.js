#!/usr/bin/env node
// Alan reference runner, no external capability execution.
// Cogentia #36 — GPT-6 under Jean Hugues Noël Robert's direction, 2026-11-23.
import {readFileSync} from 'node:fs';
import {start,resume} from './run-reference.js';
import {parseAlan} from './grammar.js';
import {AlanError} from './validate.js';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
try{
  const [action,programFile,a,b]=process.argv.slice(2);
  if(!['start','resume'].includes(action)||!programFile)throw Error(
    'Usage: cli.js start PROGRAM.json ARGS.json | resume PROGRAM.json SUSPENSION.json STEP_RESULT.json');
  const program=programFile.endsWith('.alan')?
    parseAlan(readFileSync(programFile,'utf8')):read(programFile);
  const result=action==='start'?start(program,{args:read(a)}):
    resume(program,read(a),read(b));
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(result.type==='alan.failure')process.exitCode=1;
}catch(error){
  process.stderr.write(JSON.stringify({
    type:'alan.failure',version:'0.2',
    error:{code:error instanceof AlanError?error.code:'ALAN_CLI_ERROR',message:error.message}
  })+'\n');
  process.exitCode=1;
}
