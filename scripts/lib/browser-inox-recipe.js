/** Opt-in experimental adapter, Cogentia #291 / Inox #41.
 * Explicit operator-selected module directory; never load source from a page or request.
 * No production dependency or default registry change. */
import {readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createDefaultFormRecipes} from './browser-form-recipes.js';
export async function createInoxComparisonRegistry(directory){
 if(typeof directory!=='string'||!directory)throw Error('inox_recipe_directory_required');
 const root=resolve(directory);
 const module=name=>import(pathToFileURL(join(root,name)).href);
 const [{VM},{loadDefinitions},{installZeroBrowser}]=await Promise.all([
  module('toy-runner.js'),module('definition-image.js'),module('zero-browser.js')]);
 const image=JSON.parse(await readFile(join(root,'browser-fields-image.json'),'utf8'));
 return createDefaultFormRecipes({fieldSelector(fields,type){
  const vm=installZeroBrowser(new VM({maxSteps:100000}),fields);
  loadDefinitions(vm,image);
  const stack=vm.evaluate(JSON.stringify(type)+' first-field');
  if(stack.length!==1||!Number.isInteger(stack[0])||stack[0]<-1||stack[0]>=fields.length||vm.CSP!==0)
   throw Error('form_recipe_inox_invalid_result');
  return stack[0];
 }});
}
