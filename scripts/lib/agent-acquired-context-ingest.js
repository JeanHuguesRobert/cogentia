import {
  loadAgentAcquiredContextSchema,
  sha256Prefixed,
  validateAgentAcquiredContext,
} from "./agent-acquired-context.js";
import { parseReplyDocument } from "./agent-acquired-context-prompt.js";
import { ingestAgentAcquiredContextWith } from "./agent-acquired-context-ingest-pure.js";

export function ingestAgentAcquiredContext(text) {
  return ingestAgentAcquiredContextWith(text, {
    schema: loadAgentAcquiredContextSchema(),
    sha256Prefixed,
    parseReplyDocument,
    validateAgentAcquiredContext,
  });
}
