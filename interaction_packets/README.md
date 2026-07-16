---
title: Interaction Packets
author: unknown
date: '2026-05-29'
document_role: source
document_kind: documentation
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: 3d60637
  origin_date: '2026-05-29'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# Interaction Packets

Interaction Packets is a minimal Cogentia-compatible traceability pipeline for public, associative, institutional and personal interactions.

The system treats an interaction as a structured cognitive packet.

Initial packet type:
- email correspondence.

Future packet types may include:
- meetings;
- calls;
- public posts;
- commitments;
- decisions;
- mandates;
- replies;
- absences of reply.

## Objective

The objective is not surveillance.

The objective is:
- transparency;
- continuity;
- institutional memory;
- traceability of interactions;
- reduction of informational asymmetries;
- sustainable public accountability.

## Core principle

Transparency by default.
Exceptions must be explicit.

## Version 0 stack

- Gmail
- GitHub
- AI agent
- Markdown
- YAML

## Version 0 philosophy

No backend.
No database.
No premature automation.

Copy/paste first.
Agent-assisted extraction second.
Automation later, only after protocol stabilization.

## Documents

*This list is maintained by `cogentia readme` (opt-in `readme_index` block).*

<!-- BEGIN_AUTO: readme_index -->
- [Extract Interaction Packet](prompts/extract_interaction_packet.md)
- [Follow-up Generation](prompts/followup_generation.md)
- [Interaction Packets — architecture](architecture.md)
- [Interaction Packets — public-use package](PACKAGE.md)
- [Interaction Packets — readable overview](overview.md)
- [Jean Hugues Robert — Tableau de bord Interaction Packets](dashboard.md)
- [Mail Trace Pipeline](mail_trace_pipeline.md)
- [Mail Trace Register](mail_trace.md)
- [Update Interaction Registry](prompts/update_registry.md)
<!-- END_AUTO: readme_index -->
