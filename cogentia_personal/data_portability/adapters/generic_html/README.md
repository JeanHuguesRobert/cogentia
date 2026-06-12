# Generic HTML Adapter

## Purpose

The generic HTML adapter extracts readable text and basic metadata from HTML files without assuming a specific provider.

It is useful for provider exports that include HTML pages, message archives, profile pages, or activity logs.

## Status

Draft.

Confidence level:

```text
experimental
```

## Inputs

The adapter may receive:

- path to an `.html` or `.htm` file;
- provider label, if known;
- source export identifier;
- output directory;
- extraction policy.

## Expected outputs

The adapter should produce:

- title, when available;
- visible text extraction;
- link references;
- image references;
- candidate timestamps;
- candidate headings;
- Markdown trace when extraction is sufficiently reliable;
- processing report.

## Extraction policy

The adapter should prefer visible human-readable text.

It should ignore, unless explicitly requested:

- scripts;
- styles;
- tracking pixels;
- layout-only markup;
- hidden elements;
- duplicate navigation blocks.

## Conservative behavior

HTML is often presentation-oriented.

The adapter must not infer legal or factual meaning from layout alone.

When structure is ambiguous, the adapter should generate a text extraction and uncertainty report rather than a strongly typed trace.

## Relation to provider adapters

Provider-specific adapters may use selectors or provider-specific HTML structures.

The generic HTML adapter should avoid hard-coded provider selectors.

## Minimal report fields

A processing report should include:

- file path;
- file size;
- detected title;
- headings count;
- links count;
- images count;
- extracted text length;
- skipped elements;
- warnings;
- uncertainty notes.
