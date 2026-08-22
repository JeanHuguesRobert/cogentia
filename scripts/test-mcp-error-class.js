import assert from "node:assert/strict";
import { classifyToolError } from "./lib/cogentia-mcp-envelope.js";

assert.equal(classifyToolError({ error_class: "tier_forbidden", message: "nope" }), "tier_forbidden");
assert.equal(
  classifyToolError({ name: "TimeoutError", message: "The operation was aborted due to timeout" }),
  "daemon_timeout"
);
assert.equal(
  classifyToolError(new Error("Cogentia daemon unavailable at http://127.0.0.1:8790: The operation was aborted due to timeout")),
  "daemon_timeout"
);
assert.equal(
  classifyToolError(new Error("Cogentia daemon unavailable at http://127.0.0.1:8790: fetch failed")),
  "daemon_unavailable"
);
assert.equal(
  classifyToolError({ message: "connect ECONNREFUSED 127.0.0.1:8790" }),
  "daemon_unavailable"
);

console.log(JSON.stringify({ ok: true, test: "mcp_error_class_timeout_vs_down" }));
