---
title: "Cloudflare Workers AI as a FractaNet inference provider — acquisition and integration"
date: 2026-11-09
last_modified_at: 2026-11-09
status: working-paper
document_role: source
document_kind: architectural-report
visibility: public
language: en
license: CC BY-SA 4.0
update_policy: UP-DEFAULT-REVIEWED
related:
  - ../a2a_free_compute_acquisition_2026-11.md
  - ../a2a_mcp_cop_work_crosswalk_2026-11.md
  - ../../docs/cogentia-magistral-boundary.md
  - ../../docs/embedding-retrieval-history.md
  - ../../instructions/AGENTS.shared.md
---

# Cloudflare Workers AI as a FractaNet inference provider

## Situation — 2026-11-09

The Principal reports an existing Cloudflare account. Do not request new
account creation. No account-linked Cloudflare capability is exposed in this
ChatGPT tool session. Existing searched Cogentia/Inseme/Operium source paths
do not define a live Cloudflare Workers AI inference provider; the current
Fracta2 Cogentia checkout has no Workers AI-specific environment variable in
its inspected repository-local `.env` files. Neither account entitlements,
remaining quota nor usable provider token has been verified. No secret or
provider call was retrieved/performed; no inference or charge is claimed.

## Publicly verified offer

- Workers AI Free includes **10,000 neurons/day**, shared by all models,
  reset at **00:00 UTC**. Neurons represent provider compute, not tokens.
  The free plan refuses consumption above its quota, rather than silently
  upgrading to paid inference. [Pricing, Oct 2026](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- Model catalog advertises 70+ hosted models across LLMs, embeddings,
  reranking, vision, speech, images. Catalog visibility does *not* prove a
  model can be used on Free: some flagship GLM, Kimi and DeepSeek models
  require payment method or prepaid credits; an HTTP 403 may indicate that
  restriction. [Catalog](https://developers.cloudflare.com/workers-ai/models/),
  [paid-model announcement](https://developers.cloudflare.com/changelog/post/2026-07-28-models-require-workers-paid/).
- OpenAI-compatible `/ai/v1/chat/completions` and `/ai/v1/embeddings` support
  most relevant model types. The Responses API supports GPT-OSS models only;
  the API is **not itself MCP or A2A**. [Compatibility](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/).
- Model invocation is possible directly by HTTPS from Fracta2 using a
  least-privilege API token and account ID; no Worker deployment is required
  for the first inference integration. Direct REST uses
  `POST /client/v4/accounts/{account_id}/ai/run/{model_name}` or the
  OpenAI-compatible endpoints.
- Workers AI reports **zero retention of standard inference Customer Content**
  and no training on it. Features such as Batch, Vectorize, KV/R2/Durable
  Objects, logging/caching through AI Gateway or third-party providers can
  retain data under different conditions. This is a provider commitment,
  not independent proof of technical confidentiality. Never automatically
  pass private family, health, banking, secret or third-party content.
  [Data use](https://developers.cloudflare.com/workers-ai/platform/data-usage/).
- [Asynchronous Batch API](https://developers.cloudflare.com/workers-ai/features/batch-api/)
  accepts batches under 10 MB and returns `queued` plus `request_id` for
  later retrieval; only models explicitly supporting Batch qualify. This is
  an excellent *provider leg* for Store & Forward, not a second COP Scheduler
  nor proof that the parent Cognitive Packet has completed.

## Shortlist — actual capability growth

| Canonical COP capacity | Cloudflare candidate | Immediate use | Caveat |
|---|---|---|---|
| `semantic_judgment` | `@cf/zai-org/glm-4.7-flash` | Semantic attachment of Observed Acts to Packet candidates; structured review | Model output is a candidate Judgment, never self-authorized packet mutation; free eligible per July 2026 notice |
| `semantic_judgment.secondary` | `@cf/openai/gpt-oss-20b` | Independent model family / contingent route for a limited review | Same provider account and quota: not truly failure-independent |
| `text.embedding.multilingual` | `@cf/baai/bge-m3` | Multilingual retrieval for French/Corsican/English corpus | Its embedding space is *not* interchangeable with existing OpenAI or local vectors; separate index required |
| `semantic.rerank` | `@cf/baai/bge-reranker-base` | Re-rank proposed packet attachments before spending Judgment tokens | Similarity ranking is evidence for attention, not causality or acceptance |
| `speech.transcribe` | `@cf/openai/whisper-large-v3-turbo` | Transcription of authorized audio as resumable work | Feature-specific recording rights and content classification; model input duration limits |
| `vision.describe` | `@cf/meta/llama-3.2-11b-vision-instruct` | Generate tentative descriptions of non-sensitive images | Interpretation not a verified observation; validate model Free eligibility at account |

Selected documentation:
[GLM-4.7-Flash](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/),
[GPT-OSS-20B](https://developers.cloudflare.com/workers-ai/models/gpt-oss-20b/),
[BGE-M3](https://developers.cloudflare.com/workers-ai/models/bge-m3/),
[BGE reranker](https://developers.cloudflare.com/workers-ai/models/bge-reranker-base/),
[Whisper Turbo](https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/).

## Keep one core, thin provider surface

```
Existing COP Continuation/Packet
    -> locality-first handler selection (read-only projection)
    -> COP capability / mandate / privacy / budget / PacketClaim
    -> Magistral provider resolver (new Cloudflare provider descriptor)
    -> Cloudflare Workers AI REST (synchronous or Batch request_id)
    -> immutable provider response / cost / provenance / receipt
    -> bounded Judgment result candidate
    -> return slot -> validation -> parent resumption
```

Do **not** build an A2A endpoint merely to call Workers AI. A2A/MCP remain
independent exposure surfaces over the same governed semantic capability.
Avoid a new global provider registry. Add Cloudflare to existing Magistral
provider selection, with model-specific capability truth and uncertainty.
The Cogentia `createAiRouterClient()` already speaks `/v1/chat/completions`
and `/v1/embeddings` via the configured Magistral endpoint. Cloudflare's
`/ai/v1` URL is not plug-compatible with Cogentia's expectation of `/health`
for router health, and must not replace the **entire** Cogentia route by an
untested environment variable change. Integrate at Magistral's provider
adapter boundary or build a narrow governed adapter.

### Resource/accounting requirements

- Track `provider=cloudflare_workers_ai`, exact model ID, endpoint,
  input/output tokens, neurons when reported, refusal/429/403, latency,
  provider request ID, privacy class, source generation and local Packet ID.
- Global daily free quota belongs to **the Cloudflare account** and is not
  multiplied by deploying more Workers. Enforce a local accounting ceiling
  and recovery reserve; stop on quota exhaustion rather than treating it
  as a handler failure or automatic right to paid spend.
- A2A handler/Cloudflare source identity != COP execution mandate. No
  automatic Judgments as direct mutations of the Corpus.
- Provider diversity is *model diversity*, not necessarily geographic or
  legal failure-domain independence when all models share Cloudflare quota.
- Beware AI Gateway logging/caching, which can defeat zero-retention goals.
  Gateway dynamic routing is a useful optional provider observation/routing
  facility, not a replacement for COP routing, budgets or mandates.

## Smallest next live increment

1. Read the **existing** Cloudflare account's Workers AI plan, daily usage,
   free model eligibility and token permission without exposing credentials.
   Verify account identity and token scope only in a trusted runtime.
2. Register one bounded, read-only Cloudflare **inference provider** behind
   Magistral with a restricted `semantic_judgment` model and existing COP
   capability gates. Keep all existing routes working unchanged.
3. Let a naturally pending *public* `packet relate` Judgment consume one
   authorized inference, return a structured candidate, log its actual usage
   and leave the parent waiting for admissible assimilation. No synthetic
   benchmark; apply Fix Bugs First to any real shortfall.
4. For stable recurring low-value batches, later enable Cloudflare's Batch
   interface under the existing Store & Forward scheduling/repair path,
   preserving durable correlation `request_id <-> continuationRef`.

**Status:** public offer and existing code interfaces inspected, integration
plan documented. No Cloudflare account access, credential creation, token
issuance, deployment, provider execution or inference request occurred.
