# Cogentia Trace

**Cogentia Trace** is a local-first layer for transforming personal platform exports into normalized, classifiable and continuable traces.

It starts with a minimal scope: importing an official ChatGPT/OpenAI export locally, producing normalized events, preserving provenance, and suspending execution whenever a decision requires human judgment.

## Core principle

Cogentia Trace is not a linear import pipeline.

When the tool encounters a decision that requires judgment — visibility, sensitivity, publication, anonymization, vectorization, or packet creation — it must interrupt processing and emit a structured continuation.

The caller can then answer explicitly, and the tool can resume from the recorded state.

This follows the inversion-of-control pattern already explored in `cogentia.js`.

## Initial scope

The MVP covers:

- local ChatGPT/OpenAI export import;
- normalized `events.jsonl` output;
- local provenance manifests;
- local SQLite indexing later;
- continuation files when judgment is required;
- documentation, schemas and fictive examples in GitHub.

Out of scope for the MVP:

- Supabase;
- RAG;
- Gmail import;
- Facebook import;
- embeddings;
- real personal data in GitHub;
- large binary files.

## Repository safety rule

This public repository must contain only:

- code;
- documentation;
- schemas;
- fictive examples;
- public methodological notes.

It must not contain:

- real platform exports;
- real email archives;
- real ChatGPT conversations;
- Facebook exports;
- private attachments;
- personal embeddings;
- private SQLite databases.

## Directory layout

```text
trace/
  README.md
  docs/
    architecture.md
    visibility_policy.md
    inversion_of_control.md
    continuations.md
    mvp_scope.md
  schemas/
    event.schema.json
    manifest.schema.json
    continuation.schema.json
    packet.schema.json
  examples/
    sample_event.jsonl
    sample_manifest.json
    sample_continuation.json
    sample_packet.yaml
```

## Safety maxim

Everything may be preserved; not everything should be indexed; not everything indexed should be vectorized; not everything vectorized should be published.
