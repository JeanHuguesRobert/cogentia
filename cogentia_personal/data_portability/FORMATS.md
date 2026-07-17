---
document_role: source
document_kind: data-portability
visibility: public
lifecycle_state: active
classification_source: cogentia.js
classification_version: '1'
classification_rule: data-portability
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
title: Cogentia Personal Data Portability — Formats
---

# Cogentia Personal Data Portability — Formats

## Status

Draft format policy.

This document defines recommended formats for the generic Cogentia Personal data portability layer.

## Purpose

The format policy must support:

- long-term readability;
- human navigation;
- AI-agent processing;
- version control;
- provenance tracking;
- disaster recovery;
- publication of safe derivatives;
- private legal or patrimonial continuity.

## General principle

Prefer open, documented, widely used formats.

Prefer text formats when the content is textual.

Avoid turning Git into a heavy binary archive.

Keep raw sources when useful, but generate durable textual maps over them.

## Encoding

Recommended default:

```text
UTF-8
```

Line endings:

```text
LF
```

Avoid platform-specific encodings unless preserving the original source requires it.

## Textual corpus formats

### Markdown

Recommended for:

- normalized traces;
- documentation;
- indexes;
- notes;
- processing reports;
- human-readable exports;
- public or private corpus navigation.

Extension:

```text
.md
```

Markdown may use YAML frontmatter for structured metadata.

### YAML

Recommended for:

- frontmatter;
- schemas;
- configuration;
- manifests when human readability matters.

Extensions:

```text
.yaml
.yml
```

Prefer `.yaml` for new files.

### JSON

Recommended for:

- raw provider exports;
- structured data;
- machine-generated manifests;
- intermediate processing results.

Extension:

```text
.json
```

JSON should be pretty-printed when stored in Git, unless preserving the raw source exactly is more important.

### JSON Lines

Recommended for large streams of structured records.

Extension:

```text
.jsonl
```

Useful when each record can be processed independently.

### CSV

Recommended for tabular exports.

Extension:

```text
.csv
```

When possible, record delimiter, quoting convention, encoding, and date formats.

### HTML

Acceptable for provider exports and preserved web-like documents.

Extension:

```text
.html
```

When HTML is used as a source, a Markdown normalized trace should be generated when possible.

### XML

Acceptable for structured legacy exports.

Extension:

```text
.xml
```

A normalized Markdown or JSON representation may be generated for navigation.

## Document formats

### PDF

Acceptable for documents, legal records, scans, and provider exports.

Extension:

```text
.pdf
```

Small or medium PDF files may be stored in Git or Git LFS depending on size and workflow relevance.

For long-term preservation, prefer PDF/A when producing new stable documents.

### DOCX and office formats

Acceptable as received sources.

Not recommended as the only long-term corpus format.

When possible, generate Markdown or PDF/A derivatives.

## Image formats

### JPEG

Recommended for ordinary photographic images.

Extensions:

```text
.jpg
.jpeg
```

Usually stored outside Git by default, unless small and workflow-relevant.

### PNG

Recommended for screenshots, diagrams, images with text, or lossless visual material.

Extension:

```text
.png
```

Can become large; use Git LFS or external storage when appropriate.

### TIFF

Recommended for high-quality archival scans when storage cost is acceptable.

Extensions:

```text
.tif
.tiff
```

Usually external storage, not regular Git.

### WebP and AVIF

Acceptable for web delivery or derived images.

Not recommended as the only archival source unless the original was already in that format.

## Audio formats

### FLAC

Recommended for archival audio when lossless preservation matters.

Extension:

```text
.flac
```

Usually external storage.

### MP3 / AAC

Acceptable for delivery copies or provider exports.

Usually external storage, with references in Git.

## Video formats

### MP4

Recommended delivery and compatibility format.

Extensions:

```text
.mp4
.m4v
```

Usually external storage.

Git LFS may be used only for selected medium-size video files that are useful inside the repository workflow.

### MOV and other camera formats

Acceptable as raw sources.

Usually external storage with media references and checksums.

## Archive formats

### ZIP

Common provider export format.

Extension:

```text
.zip
```

Massive provider ZIP files should not be stored in Git by default.

If provider-regenerable, record that status explicitly.

### TAR + Zstandard

Recommended for technical archival packages when producing new archives.

Extensions:

```text
.tar.zst
.zst
```

Useful for large stable corpus snapshots.

### TAR + Gzip

Widely compatible, but usually less efficient than Zstandard.

Extensions:

```text
.tar.gz
.tgz
```

## Integrity formats

### SHA-256 checksums

Default checksum algorithm:

```text
sha256
```

Recommended filename:

```text
SHA256SUMS.txt
```

Checksums are recommended for:

- raw archives;
- legal or patrimonial evidence;
- media files;
- cold storage;
- release packages;
- restoration tests.

## Git storage policy

### Regular Git

Recommended for:

- Markdown;
- YAML;
- JSON when reasonable in size;
- CSV when reasonable in size;
- HTML when useful;
- schemas;
- scripts;
- documentation;
- manifests;
- indexes.

### Git LFS

Controlled option for:

- medium-size PDFs;
- selected images;
- selected scans;
- selected media useful in the repository workflow.

Git LFS must not become the default archival layer.

Git LFS does not replace independent backups.

### External storage

Recommended for:

- videos;
- high-resolution image collections;
- large audio files;
- raw camera files;
- massive provider exports;
- cold archives;
- disaster recovery copies.

External storage should be referenced from Git with manifests, checksums, and backup locations when possible.

## Provider-regenerable exports

A massive provider export may be marked as provider-regenerable if it can reasonably be requested again.

This status must be explicit and should include risks:

- account loss;
- provider policy change;
- export format change;
- delayed retrieval;
- incomplete future export;
- provider unavailability.

Provider-regenerable status is pragmatic, not sovereign.

## Approximate size guidance

These thresholds are indicative, not strict rules.

| Size | Suggested policy |
|---:|---|
| < 5 MB | Regular Git usually acceptable |
| 5–50 MB | Case-by-case; Git or Git LFS depending on type |
| 50–100 MB | Avoid regular Git; prefer Git LFS or external reference |
| 100 MB–2 GB | Git LFS or external storage |
| > 2 GB | External storage by default |

## Derivatives

A raw file may have several derivatives:

- normalized Markdown;
- redacted Markdown;
- extracted text;
- thumbnail;
- lower-resolution access copy;
- PDF/A preservation copy;
- media reference;
- checksum entry.

Derivatives must remain linked to their source.

## Final rule

Store text in Git.

Store metadata in Git.

Store manifests in Git.

Store indexes in Git.

Reference large files unless there is a clear reason to store them directly.

Preserve the distinction between source, trace, map, derivative, and interpretation.
