import test from 'node:test';import assert from 'node:assert/strict';
import {safeFormFocusCode} from './browser-safe-form-focus.js';
import {createHostedBrowserCapabilities} from './hosted-browser-capabilities.js';
test('generic field targeting is bounded, never submits or reads values',()=>{
 assert.throws(()=>safeFormFocusCode(-1));assert.throws(()=>safeFormFocusCode(80));
 const code=safeFormFocusCode(2);
 assert.match(code,/querySelectorAll/);assert.match(code,/document.activeElement/);
 assert.doesNotMatch(code,/\.value|\.submit\(|\.click\(/);
 assert.match(code,/password/);
});
test('generic form fill is a distinct gated recoverable capability',()=>{
 const cap=createHostedBrowserCapabilities().find(x=>x.name==='browser.form.fill');
 assert.equal(cap.risk,'internal_recoverable');
 assert.deepEqual(cap.inputSchema.required,['tab_id','field_index','expected_url','text']);
 assert.equal(cap.inputSchema.properties.text.maxLength,2048);
 assert.ok(!cap.inputSchema.properties.code);
});
