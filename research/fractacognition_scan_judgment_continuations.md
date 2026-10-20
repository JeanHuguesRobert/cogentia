---
title: "FractaCognition — judgement continuations over scanned documentary evidence"
date: "2026-10-20"
status: "experimental-dogfood"
document_role: "research-note"
language: "en"
related_documents:
  - research/fractacognition_principles.md
  - research/cognitive_packets.md
  - research/cognitive_packet_closure_and_packet_native_semantics.md
  - research/trace_treatment_packet.md
---

# FractaCognition — bounded judgment over scans

## Purpose

Reuse existing Cognitive Packets and COP infrastructure for a recurrent cognition pattern: **a mechanical operation reaches an epistemic boundary and transfers its continuation to a capable handler**, potentially a multimodal AI or a human specialist. An answer is not an effect and a handler's claim is not proof that the answer was actually produced.

The general pattern is:

```text
verified scan/ref + source digest
  → deterministic preparation (regions / candidate OCR / provenance)
  → existing Cogentia continuation emit [JUDGMENT_REQUIRED]
  → discover capable, authorized handler; claim by existing COP PacketClaim semantics
  → inspect pixels + alternatives + contradictions, state what is unknown
  → traceable judgment receipt / or explicit blocker
  → continuation resolve in a persistent registry with evidence
  → review / independent check, then optionally propagate editorial changes
```

No new packet_kind, resolver, dispatcher, workflow primitive, or universal schema is required. `paleographic_judgment` is a *capability demand*, not a blanket authority. It is intentionally one **instance** of a generic FractaCognition operation that may later be used for damaged scans, legal records, maps, engineering diagrams, multilingual documents, etc.

## Minimal admissible closure

A portable handler must be able to materialize:
- immutable source reference and SHA-256, original geometry and bounded zone;
- results of deterministic transforms, their settings, model identity, hashes and uncertainty;
- hypothesis candidates and any rival readings **marked as contextual, not visual observations**;
- requested decision and expected return shape;
- source access rules, authorization boundaries, claim/lease epoch if in use;
- stable receipt locus and next action (including `hold`).

Prefer references with verifiable materialization over copying multi-megabyte evidence into an Issue. GitHub Actions artifacts are **ephemeral**, and an artifact-only continuation is **not** active in a durable external Cogentia registry. A GitHub Issue is a durable *handoff carrier*, not itself proof that `continuation resolve` has executed. Native operational identity must not be forged or silently migrated.

## Return contract

Return facts separated by `observed`, `inferred`, `unknown`, `contradictions`; cite the image's pixel boxes; choose a bounded decision (`partial_reading`, `hold_for_tiff`, `reject_ocr`, `request_review`); include a reason, evidence refs and next action. A model reading, however confident, is a **proposal** until editorial review. Never rewrite a source or publish a private contribution merely because a handler responded.

## FractaCognition self-audit

At the same boundary, ask:
1. Is there an existing processor, handler and packet type to reuse? (Occam / Friends Before Competitors)
2. Are all load-bearing prerequisites explicit? (Talleyrand / Packet Closure)
3. Does the asserted certainty exceed the available evidence? (Prudence / Humility)
4. Did the packet actually reach a handler and return, or only get serialized? (Bounded Assertion)
5. Is the work at the smallest sufficient locality? (Locality)
6. What failure of this attempt should be changed for the **next** attempt? (metacognitive learning and proportionate propagation)

## Reality Test #1755

- Source: [FRAD02A_0002.jpg](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/projects/1755/sources/constitution-1755-manuscrit/images/FRAD02A_0002.jpg), Archives du Pumonti 1 J 7/1.
- GitHub Actions [39441080343](https://github.com/JeanHuguesRobert/barons-Mariani/actions/runs/39441080343) emitted a **native Cogentia continuation** `ctn_a9d3aa3c` and uploaded it in `manuscript-reading-8`; native emission was directly demonstrated.
- [Issue barons-Mariani#121](https://github.com/JeanHuguesRobert/barons-Mariani/issues/121) is the durable, resumable work carrier with a bounded visual Z1 review mandate.
- **Unverified at this checkpoint**: claim by a genuine image-capable handler, actual visual judgment, native resolve in an operational persistent registry, and propagation. These must not be described as completed.
- Test success criteria: a handler-reported Z1 visual reading with coordinates and uncertainties, separate evidence-based review, and a stored receipt; blocked output is valid if source cannot be inspected.

## Known integration limitation

The current GitHub Actions proof-of-integration checks out Cogentia, performs `continuation emit` against a runner-local temporary `.cogentia.json`, and exports the native JSON into a build artifact. That is useful *portable closure*, but does **not** register work on the user's existing Fracta2 host and does not trigger agent execution. Doing so requires reusing an **existing** authenticated ingress (GitHub Issue / COP consumer) and an authorized handler; do not add a new secret-bearing bridge merely to make the demo look end-to-end.
