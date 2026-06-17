# Cogentia Trace — Visibility Policy

Every imported item must receive an explicit visibility classification before it can move toward public use or semantic indexing.

## Visibility values

- `raw_private`: original source or direct extraction; never public by default.
- `private`: usable locally, not public.
- `restricted`: shareable only with a defined limited audience.
- `public_candidate`: may become public after review.
- `public`: explicitly approved for public publication.
- `do_not_publish`: must not be published.

## Sensitivity values

Suggested values:

- `low`
- `personal`
- `third_party`
- `legal`
- `familial`
- `health`
- `grief`
- `political`
- `financial`

## Rule

Classification is not a purely technical operation. When the classifier cannot decide safely, the CLI must suspend processing and emit a continuation.

## Safety maxim

Everything may be preserved; not everything should be indexed; not everything indexed should be vectorized; not everything vectorized should be published.
<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Research Index — Cogentia](../../research/index.md)
<!-- END_AUTO: backlinks -->
