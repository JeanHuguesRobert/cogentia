---
document_role: source
document_kind: research-paper
visibility: public
lifecycle_state: active
classification_source: cogentia.js
classification_version: '1'
classification_rule: research-paper
classification_confidence: medium
author: unknown
date: "2026-06-11"
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
title: Cogentia Personal Data Portability
---

# Cogentia Personal Data Portability

## Purpose

This note defines the generic, reusable layer of a personal data portability system within Cogentia Personal.

It must be clearly distinguished from any private instance containing real personal data.

## Core distinction

There are two different levels:

1. the private personal register;
2. the generic reusable tooling.

The private register contains real personal, legal, patrimonial, family, operational, or transmissible data. It may have evidentiary, legal, patrimonial, or succession value. It is not the place where the generic public tooling should primarily live.

The generic reusable layer belongs to Cogentia Personal and may be developed in this repository or in a dedicated public repository derived from it.

## Generic layer

The generic layer may include:

- schemas;
- templates;
- conversion tools;
- importers;
- normalizers;
- validation scripts;
- redaction helpers;
- manifest builders;
- checksum tools;
- documentation;
- fictitious or anonymized examples.

It must not include real private personal data.

## Private instance

A private instance may use the generic layer to preserve, normalize, index, and navigate personal data exports.

It may contain:

- raw provider export manifests;
- textual extractions;
- Markdown traces;
- private indexes;
- legal or patrimonial continuity notes;
- media references;
- local backup references;
- personal decisions and governance rules.

Real private data must remain outside the public generic layer.

## Design principle

Cogentia Personal should convert legal data portability into a sovereign personal trace corpus.

The raw export remains the source.

The Markdown layer is a navigable human-and-agent map.

The Git history provides versioned continuity.

Manifests and checksums provide provenance and integrity.

The person remains sovereign over visibility, interpretation, correction, deletion, and transmission.

## Relation to large files

The generic tooling should support large-file references rather than assuming that every file is stored in Git.

A portable system should support several storage strategies:

- regular Git for text, Markdown, metadata, manifests, and indexes;
- Git LFS for selected medium-size files useful inside the repository workflow;
- external storage for large media files and massive archives;
- cold or offline storage for disaster recovery;
- provider-regenerable status when a raw export can be requested again;
- checksums and manifests to keep traceability across storage layers.

## Publication rule

Only generic code, schemas, templates, documentation, and fictitious or anonymized examples should be public.

Private data, private registers, third-party data, and legally sensitive traces must not be included in the generic layer.


## Reversibility as an adoption strategy (research addition, 2026-10-23)

**Hypothesis — not established market fact:** lowering the cost and uncertainty of *leaving* an AI memory system can lower the perceived risk of *entering* it. Personalization adds switching costs as personal context, corrections, relationships, decisions and provenance accumulate. Cogentia's positive promise is therefore: **trust through credible exit, not retention through captivity**. Market salience and adoption effects must be measured, not assumed.

### Exit / provider-swap reality test

Assess portability at distinct levels, never conflate them:
1. Exportability: access and download of the authorized corpus, corrections, references and evidence.
2. Intelligibility: open documented formats and source/derivative distinction.
3. Re-importability: round-trip through an independent implementation without silent loss.
4. Cognitive continuity: decisions, revocations, provenance, relevant disagreements and relationships survive.
5. Operational substitutability: a cold human or agent on another provider can resolve applicable controls and resume work.
6. Verified reversibility: independently test accessible outputs, report gaps, and demonstrate behavior after original Cogentia services are unavailable.

For each test, record time/effort, missing information, incomplete links, export coverage, privacy leaks, fidelity of reconstructed decisions, and actions still dependent on the original service. **Export is not equivalence; a successful import is not evidence that a vendor's internal memory changed.** A provider memory claim is evidence of a claim, not necessarily of a faithful internal dump.

### Open format: reuse before invention

Evaluate [MacPaw Portable Memory](https://github.com/MacPaw/portable-memory) (open MIT reference SDK; July 2026 proposal, evolving specification) as an interchange **projection**, not as a replacement for Git/Mneme or the sovereign Corpus. It uses inspectable JSONL records, manifest/checksums, optional signatures, extensions for unknown fields, and deletion tombstones. Compare with existing KYS/AMI and consider a narrow import/export adapter only after round-trip tests. Preserve raw source snapshots as separately governed records and do not flatten original epistemic distinctions.

Also compare the [Stanford Digital Economy Lab report on Unified Human Context Protocol](https://digitaleconomy.stanford.edu/publication/the-future-of-personal-ai-portable-and-persistent-personal-memory-through-a-unified-human-context-protocol/) (March 2026) and [Anthropic's user-facing memory import/export](https://support.claude.com/fr/articles/12123587-importer-et-exporter-votre-memoire-depuis-claude) (September 2026). Existing user data-export rights or cloud switching rules do not automatically imply the right to reconstruct a provider's hidden learned representation or full functional continuity.

### Erasure / Git tension

Git provides durable, replicated history, which conflicts with naive promises of total deletion. Distinguish:
- revocation/supersession in the public historical ledger;
- suppression from active retrieval and derivative indexes;
- removal of sensitive plaintext from private source stores and replicas (if actually achievable);
- retention obligations, backups and third-party clones outside operational control.

Never claim a tombstone proves global destruction of Git objects, remote clones or backups. A test can establish non-retrievability **within a declared, inspected boundary**, not universal erasure. Avoid committing sensitive source payloads to public immutable Git history in the first place. Use separate private/encrypted storage and authorized opaque pointers where necessary.

### Program integration / minimum locality

Operational implementation belongs to [MEMSYNC umbrella #278](https://github.com/JeanHuguesRobert/cogentia/issues/278), referencing the prior completed [KYS/AMI #215](https://github.com/JeanHuguesRobert/cogentia/issues/215) without reopening its mandate. Compare against the established Anti-Capture rule and existing corpus-navigation/provider-swap tests before adding abstractions. Use synthetic fixtures; no personal data in public test artifacts. Stop and close bounded work when exit tests pass, leaving recurring future drift to the governed Sleep Cycle.

**Research questions:** Do users place value on verifiable exit? Does a visible export-and-resume demonstration measurably improve adoption? What exit assurances are economically sustainable and independently auditable? Compare before/after controlled pilots, avoiding claims of causality without evidence.
