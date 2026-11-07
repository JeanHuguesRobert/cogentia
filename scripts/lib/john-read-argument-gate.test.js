import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeJohnReadArguments} from './john-read-argument-gate.js';
test('bounded read selector enables hosted browser tab and iframe inspection',()=>{
 assert.deepEqual(normalizeJohnReadArguments('browser.hosted.inspect',{action:'tabs',include_url:false}),{action:'tabs',include_url:false});
 assert.deepEqual(normalizeJohnReadArguments('browser.hosted.inspect',{action:'structure',tab_id:42}),{action:'structure',tab_id:42});
 assert.deepEqual(normalizeJohnReadArguments('browser.navigation.instances',{}),{});
});
test('no arbitrary fields, capability escalation or missing actions reach COP',()=>{
 for(const [cap,arg] of [['browser.form.fill',{action:'tabs'}],['browser.hosted.inspect',{}],
  ['browser.hosted.inspect',{action:'frames'}],['browser.hosted.inspect',{action:'tabs',password:'secret'}],
  ['browser.navigation.instances',{action:'tabs'}],['browser.hosted.inspect',{action:'structure',tab_id:0}],
  ['browser.hosted.inspect',{action:'tabs',max_chars:3}]])assert.throws(()=>normalizeJohnReadArguments(cap,arg));
});
