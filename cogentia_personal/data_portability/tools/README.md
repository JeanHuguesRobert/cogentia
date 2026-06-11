# Cogentia Personal Data Portability — Tools

## Purpose

This directory describes and will host generic tools for converting personal data exports into a sovereign, navigable, versioned trace corpus.

These tools belong to Cogentia Personal. They must remain reusable and must not contain real private personal data.

## Tool categories

The generic tooling may include:

- export registration helpers;
- manifest generators;
- checksum generators;
- text extractors;
- Markdown normalizers;
- media reference builders;
- index builders;
- redaction helpers;
- validation scripts;
- report generators.

## Boundary

The tools are generic.

A private register is an instance that may use these tools.

The tools must not assume a specific private register, family archive, legal case, or personal corpus.

## Minimal pipeline

```text
provider export
  -> register export
  -> inspect file tree
  -> generate source manifest
  -> compute checksums when possible
  -> extract text
  -> generate Markdown traces
  -> generate media references
  -> build indexes
  -> validate frontmatter
  -> produce processing report
```

## Storage assumptions

The tools should not assume that all files are stored in Git.

They must support:

- regular Git for text, Markdown, metadata, manifests, and indexes;
- Git LFS for selected medium-size files;
- external storage for large media files;
- provider-regenerable exports;
- cold or offline archives;
- checksums and manifests across all storage layers.

## Safety rules

Tools must preserve raw-source integrity.

Tools must never silently overwrite source traces.

Tools must mark interpretation as interpretation.

Tools must avoid using real private data in examples, tests, or documentation.

Tools should produce logs or reports describing what they did, what they skipped, and what remains uncertain.

## First tool to specify

The first priority is not code but a normalizer specification:

- `normalize_export_spec.md`

This specification defines the behavior expected from future implementations in Inox, JavaScript, or other runtimes.
