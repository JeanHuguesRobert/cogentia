---
title: "Conversation Closure Prompt Contract"
subtitle: "Closing a structured document-production conversation with summary, open pistes, artifacts, and optional share link"
author: "Jean Hugues Noël Robert"
status: "prompt-contract — working"
version: "0.1"
license: "CC BY-SA 4.0"
language: "en"
canonical_path: "cogentia/prompts/conversation_closure.md"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/prompts/conversation_closure.md
related_prompts:
  - "cogentia/prompts/document_conversation_frame.md"
  - "cogentia/prompts/cognitive_packet.md"
  - "cogentia/prompts/reviewer.md"
  - "cogentia/prompts/redactor.md"
related_research:
  - "cogentia/research/pipeline.md"
  - "cogentia/research/derived_products.md"
  - "cogentia/research/cognitive_packets.md"
  - "barons-Mariani/research/second_method.md"
agent_neutral: true
human_validation_required: true
last_stamped_at: 2026-06-17
---

# Conversation Closure Prompt Contract

## Object

This prompt contract defines the closure role for structured document-production conversations. It converts a working conversation into a concise, resumable, non-transcript closure summary while preserving the distinction between corpus material, atelier material, and candidate material.

## Associated documents

- [Document Conversation Frame](document_conversation_frame.md) — frames the conversation at the beginning.
- [Redactor](redactor.md) — drafts and consolidates source documents or derived products.
- [Reviewer](reviewer.md) — produces constructive external critique.
- [Cognitive Packet](cognitive_packet.md) — produces resumable continuation packets when needed.

## Update method

Update this contract through the structured document-production frame. Any change affecting closure/revisability, share-link handling, or corpus/atelier distinction should be reviewed before stabilization.

## Purpose

Use this prompt at the end of a serious working conversation, especially a conversation that produced or revised documents, prompts, reviews, derived products, or repository changes.

Its purpose is to produce a clean closure:
- important steps;
- decisions;
- files produced or published;
- open pistes;
- risks;
- next actions;
- optional conversation share link supplied by the user;
- possible continuation packet.

The closure is not a full transcript. It is a filtered, structured, resumable account.

---

## Prompt

```markdown
You are closing a structured document-production conversation.

Produce a closure summary that allows the human author or another agent to resume the work without reading the entire conversation, while preserving the distinction between atelier material and corpus material.

Do not expose private chain-of-thought.
Do not include irrelevant conversational noise.
Do not pretend to know or generate a conversation share link. The user must create and paste that link manually if they want it included.

## 1. Opening line

Start exactly with:

`R[n] — Contexte fiable depuis R[m] — Checkpoint actif : clôture de conversation.`

Choose `n` and `m` according to the current conversation convention if known. If unknown, use:

`R1 — Contexte fiable depuis R1 — Checkpoint actif : clôture de conversation.`

## 2. Executive summary

Summarize in 5 to 10 lines:
- what the conversation was about;
- what was produced;
- what was decided;
- what remains open;
- whether the work is ready for continuation, publication, review, or derivation.

## 3. Important steps

List the important phases of the conversation in chronological order.

For each phase, include:
- goal;
- key decisions;
- files or artifacts produced;
- important corrections;
- rejected or deferred options.

Do not list every conversational turn. Preserve signal over exhaustiveness.

## 4. Documents and artifacts

Create a table with:

| Artifact | Type | Location | Status | Notes |
|---|---|---|---|---|

Include:
- local downloadable files;
- GitHub files;
- prompts;
- reviews;
- source documents;
- derived products;
- share link if supplied by the user.

For GitHub artifacts, include repository, path, and commit SHA when known.

For local files, include the download link if available.

## 5. Decisions made

List decisions that should be preserved.

Classify them as:
- doctrinal;
- editorial;
- methodological;
- technical;
- publication;
- deferred.

## 6. Open pistes

List the pistes à explorer restées ouvertes.

Classify them as:
- next action;
- later;
- requires human validation;
- requires external review;
- requires sourcing;
- optional.

## 7. Risks and vigilance

List remaining risks:
- conceptual risks;
- factual risks;
- legal or institutional risks;
- editorial risks;
- source/derived product confusion risks;
- archival or signal/noise risks.

## 8. Corpus integration

Distinguish clearly:

### Corpus material

Items that have been published, stabilized, or are ready to enter a repository.

### Atelier material

Items that should remain conversation-only unless later filtered.

### Candidate material

Items that may enter the corpus after one more test, review, or human validation.

## 9. Conversation share link

If the user provided a conversation share link, include it under:

`Conversation share link: <link>`

If the user did not provide one, write:

`Conversation share link: not provided. The agent cannot generate or infer it. The user may create it manually through the ChatGPT sharing interface and paste it later if desired.`

Do not invent a share link.

## 10. Continuation packet option

If useful, produce a short continuation block:

```text
COGNITIVE PACKET — CONTINUATION — BY COPY

Object:
State:
Decisions:
Constraints:
Open pistes:
Next action:
Resumption risks:
```

Do not overproduce a full packet unless requested. A compact continuation is usually enough.

## 11. Final recommendation

End with one recommended next action.

Do not offer many alternatives unless the conversation genuinely remains undecided.

## 12. Delivery requirements

If the user requests a file:
- produce one Markdown file;
- use a stable filename;
- do not add version numbers to filenames unless explicitly requested;
- provide the direct download link in the final response.

If the closure is only in chat, keep it structured and complete.
```

---

## Minimal usage

```markdown
Apply `cogentia/prompts/conversation_closure.md`.

Conversation share link, if available:
`<paste link here>`

Produce:
- closure summary;
- important steps;
- documents/artifacts table;
- decisions;
- open pistes;
- risks;
- corpus integration status;
- optional continuation block.

If producing a file, use filename:
`conversation_closure.md`
```

---

## Notes

This prompt should be used at the end of a structured conversation.

It is complementary to:
- `document_conversation_frame.md`, used at the beginning;
- `cognitive_packet.md`, used when a resumable packet is needed;
- `reviewer.md`, used for critique;
- `redactor.md`, used for drafting and consolidation.
