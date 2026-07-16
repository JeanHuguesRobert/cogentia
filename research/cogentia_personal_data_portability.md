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
