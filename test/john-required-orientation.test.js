import test from "node:test";
import assert from "node:assert/strict";
import { runJohnRequest } from "../scripts/lib/john-run.js";

const request = {
  version: "john.request.v1",
  request_id: "required-orientation-regression",
  principal: { id: "principal:test" },
  mandate: { id: "mandate:test", version: "1" },
  budget: { id: "budget:test" },
  execution_budget: {
    max_steps: 2,
    max_tool_calls: 0,
    max_subagents: 0,
    max_elapsed_ms: 5000,
    max_external_effects: 0,
  },
  exposure: "read_only",
  capability: "john.converse",
  input: { prompt: "Explain the Cognitive Packet mandate" },
  handler: { id: "governed.step_reasoner", kind: "governed_reasoner", allowed_capabilities: [] },
};

test("COP required orientation fails closed when handler is missing", async () => {
  const events = await runJohnRequest(request);
  assert.equal(events.at(-1).type, "john.run.failed");
  assert.equal(events.at(-1).data.data.code, "required_event_handler_missing");
});

test("COP required orientation handler is invoked before reasoning, then Ithaca returns", async () => {
  let called = 0;
  const events = await runJohnRequest(request, {
    requiredEventHandlers: {
      "orientation.required": async () => {
        called++;
        return { ok: true, schema: "cogentia.orientation.v1", source: "corpus.orient" };
      },
    },
  });
  assert.equal(called, 1);
  assert.equal(events.at(-1).type, "john.run.completed");
  assert.equal(events.find(e => e.type === "john.accounting.settled").data.ithaca_returned, true);
});

test("COP required orientation does not silently discharge a failed lookup", async () => {
  const events = await runJohnRequest(request, {
    requiredEventHandlers: { "orientation.required": async () => ({ ok: false }) },
  });
  assert.equal(events.at(-1).type, "john.run.failed");
  assert.equal(events.at(-1).data.data.code, "required_event_failed");
});
