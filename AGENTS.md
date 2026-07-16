---
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/AGENTS.md
last_stamped_at: 2026-07-15T00:00:00.000Z
author: unknown
date: unknown
provenance:
  origin_type: unknown
  origin_repository: unknown
  origin_ref: unknown
  origin_date: unknown
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
update_policy: UP-DEFAULT-REVIEWED
---
# AGENTS.md — Cogentia methodology shortcut

This file gives operational instructions to AI agents and human assistants working in the `JeanHuguesRobert/cogentia` repository.

It is not the full doctrine. It is the compact working rule to apply before acting in the corpus.

## Core instruction

Traceability is a corpus-wide requirement. Before creating or stabilizing any tracked document,
preserve its author (or `unknown`), origin repository/ref (or `unknown`), derivation inputs, and
review status in frontmatter. Never infer missing provenance; record the gap explicitly.

Tracked documents should declare an `update_policy` from the [Corpus Update Policy Registry](docs/update-policy-registry.md).
Updates must preserve provenance and leave an inspectable trace of what changed, why, and what was checked.

For infrastructure claims, consult [Operium](https://github.com/JeanHuguesRobert/operium): Cogentia
defines mandate and traceability invariants; Operium provides service-health, deployment, and
recovery evidence. Never infer operational availability from hidden configuration or a valid mandate alone.

When working with Jean Hugues Robert, apply the Cogentia methodology:

- use **conversation for exploration**;
- choose the **smallest sufficient container**;
- require a **checkpoint before stabilization**;
- use an **opening register** for long conversations with several continuations;
- use a **GitHub Issue** for memory in tension;
- create or update a **source document** only after checkpoint;
- derive public products from a source document or explicit draft;
- commit only with explicit, scoped authorization;
- when direct commit is authorized, prefer a small reversible commit on `main` over an unnecessary branch or PR.

## Read order and controlled redundancy

Before modifying any repository in the corpus:

1. read the nearest repository-local `AGENTS.md`;
2. read this `cogentia/AGENTS.md` as the shared operational baseline;
3. apply the local file wherever it is more specific or more restrictive;
4. follow the linked source doctrine when interpretation is needed.

A local `AGENTS.md` may narrow this baseline. It must not silently widen permissions, erase authorization gates, or contradict the source corpus.

The pointer to `AGENTS.md` should be repeated at high-attention entry points such as repository READMEs, agent navigation guides, coding prompts, and operational runbooks. Repeat the **pointer and read order**, not uncontrolled copies of the complete doctrine.

Compact rule:

```text
Repeat the signpost.
Keep one governed source of doctrine.
Let local mandates specialize without silently overriding.
```

## Operational formula

```text
Conversation for motion.
Issue for memory in tension.
Opening register for long continuations.
Checkpoint for routing.
Commit for stabilized memory.
Source document for corpus anchoring.
```

## Working discipline

Do not transform too quickly:

```text
intuition
  -> task

opening
  -> roadmap

hypothesis
  -> doctrine

conversation
  -> source document

issue
  -> commitment
```

Instead, route the work:

```text
conversation
  -> opening register or issue
  -> checkpoint
  -> source document
  -> derived product
  -> feedback
  -> return to corpus
```

## Long conversations

When a conversation produces several unfinished but fertile continuations, do not create one issue per opening too early.

Prefer:

```text
long conversation
  -> one opening register
  -> comments for continuations
  -> dedicated issues only when branches become autonomous
  -> source documents only after checkpoint
```

An opening is not yet a task. It is an orienting trace with controlled half-life.

## Authorization rule

Agents may prepare, draft, summarize, route, and propose.

Agents must not commit, push, publish, send, sign, spend, or otherwise stabilize an action unless Jean Hugues Robert has given explicit, scoped authorization for that operation.

When authorization is ambiguous, prepare the batch and ask before acting.

### Agentic commit transparency

When an AI agent contributes to a commit, the commit or its attached trace must disclose that fact.

The disclosure must not merely say that "AI was used". It must state:

- which agent or tool acted;
- who the human principal was;
- what explicit mandate authorized the action;
- what files or scope were affected;
- what checks were run;
- whether a human reviewed the result;
- where the fuller trace can be inspected, when applicable.

Minimal commit trailer:

```text
Agent-Assisted: yes
Agent: <agent/tool name>
Principal: Jean Hugues Robert
Mandate: <short mandate or issue/continuation reference>
Human-Reviewed: yes|no
Trace: <issue|continuation|packet|file|hash|conversation checkpoint>
```

For larger, sensitive, multi-file, or multi-repository work, attach or reference a structured manifest using [`prompts/agentic-commit-manifest.template.yaml`](prompts/agentic-commit-manifest.template.yaml).

A commit produced wholly or partly by an AI agent without such disclosure is incomplete as a corpus trace, even if the code, text, or data change is technically correct.

Compact rule:

```text
No agentic commit without mandate trace.
No mandate trace without principal, scope, review status, and recovery path.
```

## Blocked-tool rule

When an agent is blocked by a tool, connector, permission, policy check, API limit, repository access problem, or failed GitHub operation, it must not imply that the operation succeeded.

The agent should report:

- what it attempted;
- what failed;
- whether the failure appears technical, permission-related, policy-related, or uncertain;
- what remains possible without the blocked operation;
- whether Jean Hugues Robert may want to intervene manually.

When manual intervention could unblock the work, the agent should explicitly ask whether Jean Hugues Robert wants to intervene manually, or whether the agent should continue with a reduced, non-stabilizing alternative.

## Direct-main rule

For Cogentia and related solo-corpus work, explicit scoped authorization may permit a direct commit to `main`.

Do not create a branch or PR by default. Branches and PRs are exceptional isolation tools, not the normal proof of seriousness.

A direct commit to `main` is acceptable only when the change is:

```text
small
+ scoped
+ reversible
+ inspectable by diff
+ consistent with the repository role
+ reported after completion
```

Use a branch, PR, staged patch, issue, checkpoint or human validation when the work is high-risk, multi-repository, doctrinally sensitive, legal, private, destructive, structurally invasive or institutionally committing.

## Key references

- [`research/ideas_to_explore_as_issues.md`](research/ideas_to_explore_as_issues.md) — issue-level memory, smallest sufficient container, checkpoints, and opening registers.
- [`research/pipeline.md`](research/pipeline.md) — general Cogentia pipeline from cognitive packets to source documents and derived products.
- [`docs/agent_context_server.md`](docs/agent_context_server.md) — navigation guide for agents using Cogentia as a context server.
- [`COGENTIA.md`](COGENTIA.md) — high-level framework in five distinctive moves.
- [`research/agent_configuration_layer.md`](research/agent_configuration_layer.md) — AGENTS.md, `.agents/`, and governed operational projections of the corpus.
- [`research/optimistic_mainline_governance.md`](research/optimistic_mainline_governance.md) — direct agent work on `main` under trace, reversibility and scoped authorization.
- [`research/agentic_commit_transparency.md`](research/agentic_commit_transparency.md) — mandate, provenance, human review, and reversibility for AI-assisted corpus commits.

## Minimal prompt to use with an agent

```text
Respect my Cogentia methodology: read the nearest repository-local AGENTS.md and the shared cogentia/AGENTS.md before acting; smallest sufficient container; checkpoint before stabilization; opening register for long conversations; distinction between exploration, issue, source document, derived product, and commit. Do not stabilize anything without explicit scoped authorization. When direct commit is authorized, work on the default branch with small reversible commits, readable diffs, validation when available, agentic commit transparency when an AI agent contributes, and a completion report. If a tool, connector, permission, policy check, API limit, repository access problem, or GitHub operation blocks the work, report the blockage honestly and ask whether manual intervention is desired when it could unblock the work. Do not create branches or PRs by default; use them only when risk, collaboration, repository rules or explicit instruction require isolation.
```
