---
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica
license: CC BY-SA 4.0
title: Update Interaction Registry
date: '2026-05-27'
status: draft — auto-filled (frontmatter cleanup)
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/interaction_packets/prompts/update_registry.md
last_stamped_at: 2026-06-01T00:00:00.000Z
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
# Update Interaction Registry

Given one or more validated YAML interaction packets, update the appropriate Markdown registry.

Rules:
- keep rows chronological unless otherwise requested;
- use concise public labels;
- do not expose private email addresses in public rows unless disclosure level allows it;
- preserve the distinction between `No response detected` and `No response`;
- preserve existing rows unless a correction is explicitly required;
- if a correction is made, prefer a visible correction note over silent rewriting when the registry is public.

Default Markdown columns:

| ID | Date | Subject | Counterparty | Follow-up | Days elapsed | Status | Disclosure |
|---|---:|---|---|---:|---:|---|---|
