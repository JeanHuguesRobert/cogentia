import test from "node:test";
import assert from "node:assert/strict";
import {readOnlySandboxArgs} from "./read-only-sandbox.js";
test("sandbox excludes host root, home, network and writable repos",()=>{
 const args=readOnlySandboxArgs();
 assert.equal(args.includes("--unshare-net"),true);
 assert.equal(args.includes("--ro-bind"),true);
 assert.equal(args.includes("/home/ubuntu"),false);
 assert.equal(args.includes("--bind"),false);
 assert.equal(args.includes("--dev-bind"),false);
 assert.throws(()=>readOnlySandboxArgs(["/tmp/fake","/tmp/fake"]),/untrusted_sandbox_mounts/);
});
