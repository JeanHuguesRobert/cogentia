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
node scripts/guide-eval.js run --label current
node scripts/guide-eval.js run --label candidate --url http://127.0.0.1:8791
```

The default question set is:

```text
docs/evals/guide-questions.json
```

Runs are written under:

```text
.cogentia/evals/guide/
```

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
