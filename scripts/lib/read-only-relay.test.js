import test from "node:test";
import assert from "node:assert/strict";
import {authorizeRelayRequest} from "./read-only-relay.js";
const request={kind:"read_document",repository:"JeanHuguesRobert/inseme",path:"AGENTS.md"};
const mandate={schema:"cogentia.read-only-relay-mandate/v1",verified_by_trusted_adapter:true,expires_at:"2099-01-01T00:00:00Z",max_calls:5,max_bytes:4096};
test("relay refuses unverified mandate",()=>assert.equal(authorizeRelayRequest({request}).code,"MANDATE_NOT_VERIFIED"));
test("relay never grants executable authority even with alleged mandate",()=>{
 const r=authorizeRelayRequest({request,mandate,now:100});
 assert.equal(r.allowed,false);
 assert.equal(r.code,"ADVISORY_ONLY_TRUSTED_RELAY_NOT_CONNECTED");
});
test("relay rejects mutations and repository escape",()=>{
 assert.equal(authorizeRelayRequest({request:{...request,kind:"git_commit"},mandate,now:100}).code,"OPERATION_NOT_ALLOWED");
 assert.equal(authorizeRelayRequest({request:{...request,repository:"other/private"},mandate,now:100}).code,"REPOSITORY_NOT_ALLOWED");
 assert.equal(authorizeRelayRequest({request:{...request,path:"../secret"},mandate,now:100}).code,"PATH_NOT_ALLOWED");
});
test("relay enforces declared budgets and expiry in advisory evaluation",()=>{
 assert.equal(authorizeRelayRequest({request,mandate,usage:{calls:5,bytes:0},now:100}).code,"BUDGET_EXHAUSTED");
 assert.equal(authorizeRelayRequest({request,mandate,now:Date.parse("2100-01-01T00:00:00Z")}).code,"MANDATE_EXPIRED");
});
