# Generic JSON Adapter

## Purpose

The generic JSON adapter inspects JSON or JSON Lines files without assuming a specific provider.

It extracts structural information and candidate textual records conservatively.

## Status

Draft.

Confidence level:

```text
experimental
```

## Inputs

The adapter may receive:

- path to a `.json` file;
- path to a `.jsonl` file;
- provider label, if known;
- source export identifier;
- output directory;
- extraction policy.

## Expected outputs

The adapter should produce:

- JSON structure summary;
- candidate record list;
- candidate textual fields;
- candidate timestamps;
- candidate identifiers;
- candidate media references;
- Markdown traces when extraction is sufficiently reliable;
- processing report.

## Detection rules

The adapter should detect:

- root object;
- root array;
- list of records;
- scalar fields;
- nested objects;
- repeated keys;
- timestamp-like fields;
- text-like fields;
- URL-like fields;
- media-like paths.

## Conservative behavior

The adapter must not assume that a field named `text`, `body`, `content`, or `message` is the complete record content.

When structure is ambiguous, the adapter should generate a structural report rather than full traces.

## Relation to provider adapters

Provider-specific adapters may reuse generic JSON discovery but should provide explicit mappings.

## Minimal report fields

A processing report should include:

- file path;
- file size;
- root type;
- record count estimate;
- candidate keys;
- extracted records;
- skipped records;
- warnings;
- uncertainty notes.
