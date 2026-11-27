/** Opt-in experimental adapter, Cogentia #291 / Inox #41.
 * Explicit operator-selected module directory; never load source from a page or request.
 * No production dependency or default registry change. */
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createFormPlanner} from './browser-form-recipes.js';
export async function createInoxComparisonPlanner(directory){
 if(typeof directory!=='string'||!directory)throw Error('inox_recipe_directory_required');
 const root=resolve(directory);
 const module=name=>import(pathToFileURL(join(root,name)).href);
 const [{VM},{loadDefinitions},{installZeroBrowser}]=await Promise.all([
  module('toy-runner.js'),module('definition-image.js'),module('zero-browser.js')]);
 const image=JSON.parse(await readFile(join(root,'browser-select-field-image.json'),'utf8'));
 return createFormPlanner({fieldSelector(fields,type,selection,operation){
  const vm=installZeroBrowser(new VM({maxSteps:100000}),fields);
  loadDefinitions(vm,image);
  const stack=vm.evaluate([type,selection,operation].map(value=>JSON.stringify(value)).join(' ')+' plan-text-edit');
  const intent=stack[0],members=intent?.fields;
  const read=name=>members?.find(c=>c.name===name&&c.type==='literal')?.value;
  const index=read('index');
  if(stack.length!==1||vm.peek().type!=='object'||intent?.klass!=='text-edit'||
     members?.length!==2||read('operation')!==operation||!Number.isInteger(index)||
     index<(selection==='unique'?-2:-1)||index>=fields.length||vm.CSP!==0||vm.frames.size!==0)
   throw Error('form_recipe_inox_invalid_result');
  return index;
 }});
}
