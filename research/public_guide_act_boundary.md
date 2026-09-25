---
title: "Public Guide act boundary"
subtitle: "Answer, reality probe, and draft preparation stay distinct from submission"
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: "2026-09-25"
status: working-paper
document_role: source
document_kind: working-note
visibility: public
lifecycle_state: active
language: en
license: "CC BY-SA 4.0"
update_policy: UP-DEFAULT-REVIEWED
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: "https://github.com/JeanHuguesRobert/cogentia/issues/210"
  origin_date: "2026-09-25"
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
related:
  - "https://github.com/JeanHuguesRobert/cogentia/issues/210"
---

# Public Guide act boundary

The public Guide is an answer surface, a reality probe, and an act preparer.
It is not a silent intake and it is not corpus authority.

```text
Conversation != Submission
PreparedAct != ExecutedAct
Contribution != Knowledge
```

`profile.act_templates[]` and `POST /guide/prepare-act` are one mechanism.
Suicide Corse (`submit-testimony`, `report-correction`) and FractaVolta
(`technical-report`, `pilot-contact`) both use it. Preparation returns a draft
with `executed: false`. It does not send mail, write a packet, call the agent
gateway, search the web, retrieve the corpus, or persist the transcript.

Suicide Corse chat is manifest-bounded by `projects/suicide-corse/corpus.yml`.
If that manifest cannot be read, retrieval fails closed to `projects/suicide-corse/`.
Web lookup stays off unless the visitor explicitly asks for current or external
verification. `surface=agent-john` does not bypass that profile.

The human copies the draft into their own mail client. A Guide conversation is
not testimony, evidence, or a submission. Marie-Louise's documentary twin stays
distinct: the Guide does not invent her voice.

Deployment, CORS, and live restart are outside this increment. The public page
at `suicide-corse/guide.html` calls `https://cogentia.fractavolta.com` and will
not reach it from the browser until that origin is allowed.
