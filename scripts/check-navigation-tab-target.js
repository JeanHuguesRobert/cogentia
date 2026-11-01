#!/usr/bin/env node
import assert from 'node:assert/strict';
import { selectTargetTab, ensureExpectedUrl } from '../browser-extension/tab-target.js';
const tabs=[{id:11,url:'https://example.org/one',active:true,lastFocusedWindow:true},{id:12,url:'https://example.org/two',active:false,lastFocusedWindow:true}];
assert.equal(selectTargetTab(tabs).id,11);
assert.equal(selectTargetTab(tabs,{tabId:12}).id,12);
assert.equal(ensureExpectedUrl(selectTargetTab(tabs,{tabId:12}),{expectedUrl:'https://example.org/two'}).id,12);
assert.throws(()=>selectTargetTab(tabs,{tabId:13}),/does not exist/);
assert.throws(()=>selectTargetTab(tabs,{tabId:'12'}),/integer/);
assert.throws(()=>selectTargetTab([]),/explicit tabId/);
assert.throws(()=>ensureExpectedUrl(tabs[1],{expectedUrl:'https://example.org/old'}),/navigated/);
assert.throws(()=>ensureExpectedUrl({url:'chrome://extensions'}),/not a web page/);
console.log('navigation tab targeting: ok');
