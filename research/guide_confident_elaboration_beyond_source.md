---
title: "Guide fidelity gap: confident elaboration beyond a thin cited source"
subtitle: "Both legacy and Agent John V2 synthesis add unmarked operational detail not present in a cited policy source"
author: "Jean Hugues Noël Robert, baron Mariani, with Claude (Anthropic)"
date: "2026-09-25"
status: active
document_role: source
document_kind: stigmergic-correction
visibility: public
lifecycle_state: active
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "explicit-metadata"
classification_confidence: "medium"
derived_from:
  - instructions/AGENTS.public-readonly.md
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: main
  origin_date: "2026-09-25"
review:
  status: unreviewed
  reviewed_by: []
related_research:
  - instructions/AGENTS.public-readonly.md
  - research/ai_first_fidelity_single_author_phase.md
  - research/measured_risk.md
---

# Guide fidelity gap: confident elaboration beyond a thin cited source

## Erroneous form

Found 2026-09-25 while comparing the public Guide's answers (both legacy and
Agent John V2 reasoning-loop synthesis) against a Claude-generated answer to
the same 11-question legacy-vs-V2 benchmark set (operium#45).

For `fr_commune_pilot` ("Comment une commune corse peut-elle demarrer un
pilote FractaVolta sobre et verifiable ?"), both lanes produced a detailed,
confident multi-step operational protocol — audit préalable, six months of
pre-purchase measurement, a specific decision gate, a public monthly
dashboard — attached to a citation of
`cogentia:research/campaign/fiches_maires/fiche_02_fractavolta_energie_villageoise.md`.

Reading that source directly: it is a one-page campaign policy memo
("Candidat aux Sénatoriales") stating a constat (280M€/an surcoût, >18 mois
de délai de raccordement), a high-level solution diagram (toitures → stockage
seconde vie → bâtiments publics → recharge véhicules), and three legislative
measures. **It contains no six-step protocol, no six-month measurement
requirement, no audit checklist.** The synthesized answer's operational
specificity was invented and attached to the citation as though it were
documented there.

A second source was spot-checked for comparison
(`FractaVolta:research/inference_packet_network.md#L268-L305`, cited by
`en_energy_packets`) and found faithfully paraphrased — the EPN/IPN table,
the "photons → inferences" formula, and the exergy-packet definition all
matched the source closely. The failure is **not universal across every
citation** in this run.

## Canonical form

`instructions/AGENTS.public-readonly.md` §5 already states the rule this
violates, verbatim:

> If evidence is insufficient: **name the gap** — do not fill with confident
> fiction.

and the base Guide system prompt (`cogentia-mcp-http.js::guideSystemPrompt`)
already instructs:

> Distinguish documented facts, clearly marked inferences, and unknowns
> inline when that distinction matters.

Neither lane marked its added operational steps as inference. The
observed pattern correlates with a specific mismatch, not a uniform defect:

```text
thin/high-level cited source (a policy pitch, not an operational doc)
  + a question that asks for more operational specificity than that source contains
  → the synthesis fills the gap with plausible, unmarked, confidently-stated detail
```

When the cited source is itself detailed and technical (as in the
`inference_packet_network.md` case), the synthesis stays faithful because
there is less gap to fill.

## Scope

Applies to any Guide/Agent John surface (legacy path and the V2 reasoning
loop equally — this is a synthesis-prompt/verification gap, not something
introduced by the V2 hop-strategy work in operium#45) whenever a cited
source is a short high-level document (campaign fiches, policy memos,
one-page briefs) and the question requests operational granularity the
source does not provide.

## Reason

The system prompt states the "mark inferences" rule but provides no
mechanism that checks compliance before the answer ships. The reasoning
loop already defines an `adversarial_verification` hop strategy
(`scripts/lib/agent-jhn-reasoning-loop-v2.js`) intended for exactly this
kind of reality-check pass, but ordinary questions resolve to
`mayoral_inquiry` (the default) or `doctrinal_synthesis`, never
`adversarial_verification`, so no automated check currently verifies that
each stated operational claim is actually present in its attached
source_id before the answer is returned.

## Prevention rule (not yet implemented — recorded for follow-up)

1. When corpus.search resolves a cited source whose content is materially
   shorter or higher-level than the operational detail the drafted answer
   states, route through (or add) a verification pass — comparable in
   spirit to `adversarial_verification` — that checks each concrete,
   falsifiable operational claim against the literal cited excerpt before
   the answer is returned, and either drops the unsupported detail or
   marks it explicitly as inference (e.g. "a plausible next step, not
   documented in the source: ...").
2. Do not treat "a citation is attached" as proof the whole sentence is
   grounded — citation presence and citation sufficiency are different
   properties, and only the latter satisfies the constitution's "name the
   gap" rule.
3. Any Guide-quality qualitative review (as in operium#45) should include
   at least one direct source read-back per answer, not just a check that
   a `source_id` was returned — a present citation was not itself evidence
   of fidelity in this case.

## Date

2026-09-25.
