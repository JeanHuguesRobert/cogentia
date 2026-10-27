---
title: "Living Book Factory — Build artifacts and frozen releases"
date: "2026-10-27"
status: "active operational contract"
document_role: "operational"
document_kind: "build-and-release-policy"
language: "en"
license: "CC BY-SA 4.0"
---

# Build artifacts versus frozen editions

**Sources are versioned; working builds expire; frozen editions are releases.**

This is the conventional software delivery model applied without introducing a second storage infrastructure.

## Working builds

- Source of truth: Markdown manuscript, institutional/editorial metadata, assets that are sources, renderers and build configuration in Git.
- Build outputs: `projections/preview.html`, `preview.pdf`, `preview.epub`, `site/book.html`, `book.pdf`, `book.epub`; the current renderer also writes `projections/preview.yml` with hashes, generation time and `frozen: false`.
- Binary working outputs (`projections/preview.pdf`, `preview.epub`, `site/book.pdf`, `book.epub`) MUST NOT enter Git history. The project scaffold provides a local `.gitignore`; a repository containing preexisting projects must apply equivalent scoped patterns at the repository root. Already tracked output files require a **one-time `git rm --cached`**, which preserves the local file.
- A public site may serve current working binaries as deployment products. This does not turn them into frozen editions.
- CI build artifacts may use bounded retention; expiry is a normal lifecycle event. Do not interpret CI upload success as proof of build success: inspect the typed compute receipt and validate the artifacts.
- Never discard original documentary PDFs that belong to the Corpus: this policy addresses precisely the Factory's standard *generated output paths*, not all `*.pdf`.

## Frozen editions

A freeze is a separately authorized editorial act, not a side effect of `render` or an ordinary source push.

1. Resolve a precise immutable source commit and renderer/tool version; inspect the actual edition to freeze.
2. Produce final edition assets (PDF/EPUB/HTML as applicable); validate them; record SHA-256, byte size, provenance and publication state in a small textual freeze manifest.
3. Create a namespaced release tag for the book, e.g. `living-book/capable/2026-11-01-v1`, and a GitHub Release with the binary edition assets. A tag is not enough to retain built assets.
4. Verify attached assets against manifest hashes. Mark and distinguish prerelease from final edition; only record `frozen: true` after accepted freeze. Avoid silently replacing published/frozen assets: publish errata or an explicitly new edition.
5. No routine working build and no `git push` may automatically create a final release. Creating a public release is an external publication boundary requiring the applicable explicit authority.

Versioned sources, tags, small manifests and release asset SHA-256 records enable a later migration off GitHub without new storage now.

## Operational rollout / legacy

- For tracked binaries previously committed: stop tracking the known working output paths with `git rm --cached` (no deletion from working tree). This intentionally creates staged deletions and should be committed with the ignore-rule change.
- Existing historical blobs remain in Git. Do not rewrite Git history solely to reclaim speculative space; assess actual measured repository size first.
- A tracked `projections/preview.yml` remains text metadata and may continue to be versioned under current practice; its frequent timestamp-only changes can be revisited with evidence.
- Textual site projections are a separate decision, since the existing site may depend on them being versioned. Do not expand the binary policy into a general deletion or deployment migration.
- Retention and release uploads can reuse the current GitHub Actions infrastructure; add only an explicit, tested release workflow if an edition is about to be frozen.
