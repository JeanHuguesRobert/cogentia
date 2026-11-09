---
title: "Acquiring A2A-compatible FractaHandlers and free-tier compute, November 2026"
date: 2026-11-09
last_modified_at: 2026-11-09
status: working-paper
document_role: source
document_kind: research-note
visibility: public
language: en
license: CC BY-SA 4.0
update_policy: UP-DEFAULT-REVIEWED
related:
  - a2a_mcp_cop_work_crosswalk_2026-11.md
  - cop_tasks_steps_mcp_tasks_crosswalk_2026-11.md
  - ../docs/cogentia-mcp.md
---

# Acquiring A2A-compatible compute with negligible incremental cost

## The three resources are not identical

1. **A2A protocol capability**: freely licensed SDK and an adapter exposing
   the existing COP Core; hosting it on an existing FractaNode does not create
   additional machine or inference capacity.
2. **Execution and transport capacity**: a separate node or serverless service
   that can accept A2A requests, maintain correlations and return results.
3. **Cognitive inference capacity**: a paid or free-limited model provider,
   independent of whether the adapter speaks A2A or MCP.

Do not confuse free signup, temporary credits, and renewable always-free
quotas. An SDK-compatible endpoint does not automatically have a reasoning
model, live availability or a COP mandate.

## Verified public offers, 2026-11-09

| Resource | Public free offer | Use in Fractanet | Limitation / caveat |
|---|---|---|---|
| Existing OCI Fracta/Fracta2 | Already available in user's infrastructure; OCI Always Free Ampere allocation in current public Oracle docs is **2 OCPU / 12 GiB total**, not a guarantee of additional resources on this tenancy | Fastest persistent A2A endpoint, Node SDK, local COP identity/return | Existing CPU/RAM contention; no extra independent failure domain until deployed elsewhere |
| Cloudflare Workers Free | 100,000 requests/day, 10 ms CPU/request, 128 MiB memory, 5 cron triggers/account | Very lightweight geographically distributed A2A edge entry/routing | Not heavy agent execution or long uninterrupted reasoning; validate A2A SDK runtime/bundle compatibility |
| Cloudflare Durable Objects Free | SQLite-backed Durable Objects, 100,000 requests/day, 13,000 GB-s/day, 5 GiB SQL storage free | Optional per-packet/locality state, no global registry | Free limits fail at exhaustion; does not replace COP's event/claim authority |
| Cloudflare Workers AI | 10,000 neurons/day free, selected models only | Third-party inference behind a FractaHandler with separate identity/budget | Free quotas and model eligibility can change; notable frontier models require paid tier |
| Google Cloud Run requests-based | 2 million requests/month, 180,000 vCPU-seconds and 360,000 GiB-seconds free at reference US price, subject to region and charges | Independently hosted A2A endpoint, scale-to-zero | Billing account required; egress, build, storage and non-free usage can cost money |
| Gemini Developer API | Selected Flash variants have free input/output, with project-specific rate limits | External inference via local A2A adapter | Free-tier content used to improve Google's products; avoid private/sensitive Corpus or engagements |
| GroqCloud | Free plan rate limits (e.g., provider page lists gpt-oss-120b 30 RPM, 1k RPD, 8k TPM, 200k TPD as reference) | External inference / fast bounded Judgment | Actual account limits may differ; not an A2A runtime by itself |
| Render Free Web | 750 instance hours/workspace/month | Small independent Node/Python A2A server | Spins down after 15 minutes idle, ~1 minute cold start, local files ephemeral, free Postgres expires in 30 days |
| Google Cloud new-account trial | $300 credit, 90 days | Temporary independent A2A staging/deployment | **Not** permanent free allocation; billing-account, eligibility and non-free costs after trial |
| AWS AgentCore | Consumption-priced with introductory up-to-$200 AWS new-customer credits | Managed A2A agent runtime candidate | Credits temporary; not established perpetually free A2A compute |
| Hugging Face Spaces | 'CPU Basic' shows zero hourly price, but current docs say creating a compute (Docker/Gradio) Space requires paid subscription | Potential public demonstration only | Not a reliable zero-signup-cost new server; ephemeral disk; check account eligibility |

## Primary references

- A2A official JS SDK (v1.0, clients+servers, SQLite/PostgreSQL stores):
  https://github.com/a2aproject/a2a-js
- Oracle Always Free: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- Cloudflare Workers free limits: https://developers.cloudflare.com/workers/platform/limits/
- Durable Objects free pricing: https://developers.cloudflare.com/durable-objects/platform/pricing/
- Workers AI free inference: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Cloudflare free model restrictions: https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/
- Cloud Run: https://cloud.google.com/run/pricing
- Google trial: https://cloud.google.com/signup-faqs
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Groq limits: https://console.groq.com/docs/rate-limits
- Render Free: https://render.com/docs/free
- Hugging Face Spaces: https://huggingface.co/docs/hub/spaces-overview
- AWS AgentCore: https://aws.amazon.com/bedrock/agentcore/pricing/

## Proposed acquisition order

**A. Local-first, no new account:** implement a *thin A2A facade* on existing
Cogentia semantic capability code using the official JS SDK. Expose only a
read-only, bounded initial provider such as `packet.inspect`/`continuation
placement`; use the existing COP identities. No anonymous mutation; verify
AgentCard, Task/Message, response correlation and readiness on a private
surface before any public binding. **This is not yet deployed.**

**B. Add independent free remote execution:** choose Cloudflare Workers +
Durable Objects for event-driven lightweight routing, or Cloud Run for a
full Node/Python runtime with longer compute. A distributed failure domain
requires a separately operated provider and independent state/recovery;
placing a second endpoint on fracta2 alone is not resilience.

**C. Add low-cost cognition:** provider-neutral Magistral binding to Gemini
or Groq free plan, or Cloudflare Workers AI, with privacy classification,
capability matching, explicit inference quotas and refusal on exhausted
budget. No free-tier model automatically earns access to the private corpus.

## Acceptance without synthetic 'research experiments'

Dogfood a real *already pending* COP Continuation requiring an admissible
read-only capability: check provider declaration -> actual local capacity ->
COP claim/mandate when dispatch is introduced -> receipt -> return to parent.
Observe claim conflicts, restart and failure during ordinary use (FBF), not
fabricated workflows. A free endpoint must be treated as unreliable unless
its durability/recovery path is independently verified.

**Current state:** research and acquisition options documented; no provider
account created, no new cloud capacity provisioned, no A2A service started,
no credentials accessed, and no live execution claim made.
