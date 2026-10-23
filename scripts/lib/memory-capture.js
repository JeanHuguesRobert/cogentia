import { ingestAgentAcquiredContext } from "./agent-acquired-context-ingest.js";
import { registerModule } from "./v3-modules.js";

// #281: the provider identifies this implementation, never the source agent.
// Source identity comes exclusively from the submitted KYS/AMI document.
registerModule({
  id: "memory.capture.kys-ami",
  kind: "capability_provider",
  provider: "kys-ami",
  provides: { capabilities: ["memory.capture"] },
  governance: {
    requires: [{ locker: "private", mode: "read" }],
    trace_minimum: "none",
  },
  run: ({ text } = {}) => {
    if (typeof text !== "string") {
      const err = new Error("memory.capture requires a text string");
      err.error_class = "invalid_input";
      throw err;
    }
    // Return the existing contract intact, including rejected raw captures,
    // extensions, unknowns and contradictions. No retention or promotion.
    return ingestAgentAcquiredContext(text);
  },
});
