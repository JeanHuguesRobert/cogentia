#!/usr/bin/env node
import assert from "node:assert/strict";
import { bootstrapOpenIssues } from "./lib/calculette-open-issues-bootstrap.js";
const observedAt="2026-10-10T00:00:00Z";
const issue=(number,state="open",extra={})=>({number,state,title:"Work "+number,body:"Related #12",created_at:"2026-10-01T00:00:00Z",updated_at:"2026-10-09T00:00:00Z",html_url:"https://github.com/JeanHuguesRobert/cogentia/issues/"+number,...extra});
const seed=bootstrapOpenIssues([issue(10),issue(11,"closed"),issue(12),issue(13,"open",{pull_request:{}})],{repository:"JeanHuguesRobert/cogentia",observedAt});
assert.equal(seed.work_queue.length,2);
assert.ok(seed.work_queue.every(x=>x.readiness==="unknown"&&x.authorization==="not_inferred"));
assert.ok(seed.no_action_without_mandate);
assert.equal(seed.link_candidates.length,1);
assert.equal(seed.relations.length,0);
assert.equal(seed.work_queue[0].id,"github:JeanHuguesRobert/cogentia:issue:10");
console.log("ok - open issues bootstrap: current queue, unknown readiness, no authorization");
