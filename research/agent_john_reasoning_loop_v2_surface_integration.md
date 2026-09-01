---
title: "Agent John V2 Reasoning Loop Surface Integration"
date: "2026-08-31"
status: "working"
document_role: "source"
document_kind: "architectural-report"
visibility: "public"
lifecycle_state: "active"
language: "en"
update_policy: "UP-DEFAULT-REVIEWED"
related:
  - "../scripts/lib/agent-jhn-reasoning-loop-v2.js"
  - "../scripts/lib/john-run.js"
  - "../scripts/cogentia-mcp-http.js"
---

# Agent John V2 Reasoning Loop Surface Integration

Agent John is the canonical Cogentia Personal Digital Twin runtime. Guide and WhatsApp are derived surface projections, not independent cognitive identities.

`COGENTIA_REASONING_LOOP_V2=true` enables a reversible adapter around each surface turn. The adapter first dispatches the ordered required-event preflight. Guide then executes three governed read-only capabilities: `corpus.orient`, `corpus.search` against the real configured retrieval backend, and constrained surface synthesis. A V2 adapter failure reruns the unchanged legacy turn and marks the response with a fallback warning.

This is still an integration bridge: planner, web evidence, and provider synthesis retain their legacy implementations. The bridge preserves the current behavior while moving orientation and corpus retrieval into explicit Agent John-owned governed capabilities.
