---
title: "Corsica Cogentia Digital Twin — Epistemic Ingestion & Ephemeral Source Policy"
subtitle: "Canonical epistemic model, source policy gate, ephemeral raw artifact lifecycle and provenance"
author: "Agent JHN / Antigravity"
date: "2026-09-18"
document_role: "operational"
document_kind: "guide"
visibility: "public"
lifecycle_state: "active"
classification_source: "cogentia.js"
classification_version: "1"
classification_rule: "guide"
classification_confidence: "medium"
---

# Corsica Cogentia Digital Twin — Epistemic Ingestion & Ephemeral Source Policy

## Purpose

The Corsica Cogentia Digital Twin models territorial knowledge (events, actors, claims, institutions, and geographic dynamics) without confusing **the knowledge itself** with **the raw documents from which it was derived**.

This architecture enforces two non-negotiable principles:
1. **Epistemic separation**: A raw artifact is not an observation; an observation is not a claim; a claim is not a fact.
2. **Data minimization & ephemeral retention**: The Twin retains structured semantic observations, claims, and durable cryptographic provenance, while raw copyrighted or sensitive source artifacts (e.g. newspaper photos, paywalled web pages, user uploads) are explicitly purged by default.

## Canonical Epistemic Hierarchy

```text
RAW SOURCE ARTIFACT
    ↓ (quarantine -> fingerprint -> extract)
OBSERVATION
    ↓ (semantic normalization)
CLAIM
    ↓ (corroboration / contradiction)
PROVISIONAL OR ESTABLISHED FACT
    ↓
DERIVED INTERPRETATION / FORECAST
```

- **Raw Source Artifact (`RawArtifact`)**: Ephemeral input buffer (photo, scanned document, HTML excerpt). Fingerprinted with SHA-256 upon arrival.
- **Source Observation (`SourceObservation`)**: Attributable record of what was observed, when, by whom or what source locator, and under what access state. Retains the SHA-256 fingerprint and purge receipt.
- **Claim (`Claim`)**: Structured assertion `(subject, predicate, object)` scoped by time and geography, citing source observations in `sourceRefs`.
- **Corroboration Link (`CorroborationLink`)**: Preserves corroborating or contradictory relationships between distinct claims without merging their separate source identities.
- **Provisional / Established Fact**: High-confidence claim backed by independent corroborations.

## Source Policy Gate

Before ingestion, every source path derives or matches an explicit policy record:

```javascript
import { createSourcePolicy, evaluateSourcePolicy } from "./scripts/lib/digital-twin/index.js";

const policy = createSourcePolicy({
  access: "restricted",          // public | authenticated | contributed | restricted | unknown
  automation: "allowed",         // allowed | uncertain | opposed | not_applicable
  retention: "derived_only",     // metadata | derived_only | temporary_fulltext | permitted_fulltext | unknown
  personalData: "ordinary",      // none | ordinary | sensitive | unknown
  legalRisk: "low",              // low | review | hold
  retentionClass: "ephemeral",   // ephemeral | bounded | legal_hold | external_owner | persistent_by_right
  evidenceOwner: "contributor",  // contributor | platform | third_party
});

const evalResult = evaluateSourcePolicy(policy);
// evalResult: { allowed, canRetainRaw, mustPurgeRaw, canDeriveKnowledge, warnings }
```

### Conservative Failure on Unknowns
- `unknown` never silently becomes `allowed`.
- If `legalRisk === 'hold'`, all ingestion is blocked.
- If `access === 'unknown'` or `retention === 'derived_only'`, raw payloads are purged immediately after extraction.

## Ephemeral Raw Asset Lifecycle & Auditable Purge

Raw assets in the `ephemeral` or `external_owner` classes follow an auditable lifecycle:

```text
acquire
  -> quarantine
  -> compute SHA-256
  -> semantic extraction
  -> purge()
  -> produce PurgeReceipt
  -> link receipt to SourceObservation
```

When `purge()` is called:
1. In-memory buffers are zeroed and de-referenced.
2. A freeze-locked `PurgeReceipt` is emitted containing the SHA-256 hash, byte size, timestamp, reason, and actor.
3. Durable provenance survives raw-artifact deletion.

### Contributor-Held Originals
For user-submitted photos (e.g. Olé Olé contributions):
```javascript
evidenceOwner: "contributor"
rawEvidenceRetainedByTwin: false
```
The Twin preserves only the observation, extracted claims, and cryptographic receipt. The contributor retains the original file if future re-verification is required.

## Vertical Slices

1. **Browser Article Ingestion (`ingestBrowserArticle`)**:
   Consumes output from the Navigation Assistant's Corse-Matin adapter (`#190`), normalizes article metadata, derives claims, purges the raw excerpt, and returns durable provenance.
2. **Contributed Photo Ingestion (`ingestContributedPhoto`)**:
   Accepts user-submitted images, computes SHA-256, extracts claims, purges the twin's copy, and establishes contributor-held original semantics.
3. **Multi-Source Corroboration (`linkCorroboration`)**:
   Connects two independent observations referring to the same event, promoting claim status to `corroborated` without conflating source identities.
4. **Contradiction Preservation**:
   Conflicting claims are recorded as `contradicted` or `disputed`. Contradictions are treated as first-class data, not ingestion errors.

## Host Decoupling

Agent JHN is the initial host and consumer of the Corsica Cogentia Digital Twin, but the twin's models are host-independent and reusable across other agents and community platforms.
