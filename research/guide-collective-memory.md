---
title: "Collective memory for the public Guide"
author: "Codex, following a Jean-Hugues Robert design discussion"
document_role: research-note
source_kind: conversational-design
update_policy: human-or-agent-review
status: parked
---

# Collective memory for the public Guide

This is a parked research topic. The public Guide could maintain one deliberately
shared Codex conversation to observe recurring visitor questions and improve
orientation. It must not change the current Guide behavior until the safeguards
below are designed and explicitly enabled.

Questions to resolve:

- How are visitor questions anonymized and filtered before entering shared context?
- How is disclosure of previous visitors' exchanges prevented?
- What mandate governs collective memory and retention?
- How are periodic summaries produced, reviewed, stored, and incorporated after
  `/compact`?
- Does a summary remain private operational knowledge or become a candidate corpus
  document requiring human or agent validation?

Constraints:

- bounded retention and restartable synthesis;
- no raw personal data in the shared conversation or published corpus;
- one active request per Codex conversation, with FIFO queuing;
- no publication of unreviewed visitor-derived content.

Suggested first experiment: an offline, replayable summarizer over sanitized Guide
request traces, producing a dry-run report with explicit provenance before any live
memory is enabled.
