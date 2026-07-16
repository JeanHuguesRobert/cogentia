---
title: FractaVolta Guide Eval
author: unknown
date: '2026-07-02'
document_role: source
document_kind: documentation
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 44915c4
  origin_date: '2026-07-02'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# FractaVolta Guide Eval

`scripts/guide-eval.js` captures comparable Guide answers so model changes can
be judged instead of guessed.

For day-to-day agent work, use the thin power CLI:

```bash
node scripts/guide-cli.js ask --q "Explain FractaVolta simply." --format markdown
node scripts/guide-cli.js advise --q "What should happen next on the Guide architecture?"
node scripts/guide-cli.js prewarm --q "What should happen next on the Guide architecture?" --dry-run
node scripts/guide-cli.js prewarm --questions docs/evals/guide-questions.json --dry-run
node scripts/guide-cli.js handoff --q "Comment une commune corse peut-elle commencer ?" --locale fr
node scripts/guide-cli.js handoff --q "Explain FractaVolta simply." --format json
node scripts/guide-cli.js handoff --q "Explain FractaVolta simply." --format packet
```

The CLI calls the same `/guide/chat` contract as the website and can target a
local or remote Guide with `--url`.

`advise` is the "the Guide tells more than it does" mode. It asks the Guide to
infer intent, propose a short plan, judge risks, state boundaries, cite public
evidence, and suggest a packet or handoff, while explicitly forbidding mutation,
publication, deployment, unbounded quota spend, private-data exposure,
impersonation, or final authority decisions.

`prewarm` is the retrieval-maintenance mode. It calls the Guide once, extracts
the planned public corpus queries from `context.guide_retrieval.queries`, emits
`embeddings search` continuations for those exact query strings, and can run
`scripts/semantic-search-worker.js` to fulfill them. Use `--dry-run` to inspect
the planned queries and commands without emitting continuations or spending any
provider quota. On deployed nodes, run it with the daemon's active
`COGENTIA_DATA_DIR`; for `fracta`, that is `/var/lib/cogentia`.

Handoff formats:

- `markdown`: human-copyable prompt for ChatGPT, Claude, Grok, or another
  visitor-selected agent.
- `json`: structured `guide_handoff` payload with question, Guide answer,
  sources, excerpts, authority notes, diagnostics, and return instruction.
- `packet`: experimental `cognitive_packet` envelope preparing future COP /
  continuation-compatible routing. It includes intent, authority, permissions,
  evidence, payload, reply route, and trace metadata.

The current handoff is intentionally not a continuation yet. It is an informal
or structured cognitive packet. A continuation is the stronger resumable
workflow form that can be added later when an external agent/tool result must be
validated and resumed by Cogentia.

The intended comparison has three lanes:

1. `current`: the deployed Guide profile.
2. `candidate`: the same Guide pipeline with a candidate Magistral/OpenAI
   profile.
3. `Codex Review`: a human/agent diagnosis over the two captured answers.

The review should decide whether quality changed because of model power,
retrieval, planner behavior, prompt shape, corpus coverage, language quality, or
visitor-facing expectations.

## Run

```bash
node scripts/guide-eval.js run --label current --progress
node scripts/guide-eval.js run --label candidate --url http://127.0.0.1:8791 --progress
```

The default question set is:

```text
docs/evals/guide-questions.json
```

Runs are written under:

```text
.cogentia/evals/guide/
```

The run file is created before the first question and rewritten after every
answer. During a long or interrupted run, inspect `complete`,
`completed_count`, and `results` in the newest JSON file to see how far the
evaluation got. `--progress` prints the current question id to stderr while the
JSON output stays machine-readable.

## Report

```bash
node scripts/guide-eval.js report --runs .cogentia/evals/guide/current.json,.cogentia/evals/guide/candidate.json
```

The report includes one `Codex Review` template per question:

```text
Best answer: current | candidate | neither | mixed
Did model power help: yes | no | partly
Main limitation: retrieval | planner | synthesis | prompt | corpus coverage | language | UI expectation
Recommended tuning action:
```

At first, fill the review manually. Once the rubric is stable, an optional
evaluator model can be added, but the first objective is to make the model
choice legible and auditable.

Each answer section also lists Guide retrieval diagnostics: planner source,
planned queries, semantic/cache/fallback flags, web-search state, sources, and
excerpt samples. Use those fields to decide whether a weak answer is caused by
model power or by retrieval/planner/corpus coverage.
