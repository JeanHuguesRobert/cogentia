---
title: "MEMSYNC Personal: anonymous memory mirror and blind-spot exploration"
author: unknown
affiliation: "Institut Mariani / C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
date: '2026-10-23'
license: CC BY-SA 4.0
language: en
status: working-paper
document_role: operational
document_kind: implementation-contract
visibility: public
lifecycle_state: working
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/memsync-personal.md
update_policy: UP-DEFAULT-REVIEWED
generated_by: Codex
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: https://github.com/JeanHuguesRobert/cogentia/issues/284
  origin_date: '2026-10-23'
  derived_from:
    - research/kys_mvp_entry.md
    - research/kys_profile_privacy_and_public_specialized_profiles.md
    - research/cogentia_personal_data_portability.md
review:
  status: unreviewed
  reviewed_by: []
---

# MEMSYNC Personal

This is the implementation and local verification checkpoint for
[Cogentia #284](https://github.com/JeanHuguesRobert/cogentia/issues/284).
It changes the existing Personal app; it does not introduce a capture schema,
database, external provider call, or deployment.

## Entry and boundaries

The anonymous home and navigation expose **« Que savent mes IA de moi ? »**.
`/snapshot` chooses a provider and prepares the existing JSON portrait prompt;
`/mirror` accepts both JSON portraits and generic YAML AMI responses. The JSON
wizard links to the generic mirror for YAML, full export and erasure. No account
or email is required on these routes. They do not fetch the source conversation.

The home also offers an independent optional blind-spot card. Its primary copy
action copies exactly **« Quelle vérité utile m'échappe ? »**, without additions.
The original longer variant and a subsequent falsification question are separate,
optional actions. The card does not ingest or retain answers. Its synthetic
example illustrates a testable hypothesis and never establishes inferred
ignorance. Neither answer category is promoted to a Cogentigram or source memory.

## Two typed inputs; no reversible semantic conversion claimed

| Input | Display projection | Preserved authority boundary |
|---|---|---|
| `kys-snapshot-0.1` JSON | `kys_snapshot_portrait` mirror plus existing wizard summary | Claimed portrait; a `known` bucket does not establish explicit user origin or provider-memory origin. |
| `cogentia.agent-acquired-context.v0` YAML/JSON | Existing validated `normalized_snapshot` mirror | Origins, unknowns, contradictions, uncertainty and capture references remain agent declarations. |

Sources are [the KYS adapter](../scripts/lib/kys-snapshot-mirror.js),
[AMI ingestion](../apps/personal/src/lib/learned-context-ingest.js),
[AMI protocol](../prompts/agent-acquired-context.md) and
[AMI schema](../schemas/agent-acquired-context.v0.schema.json).

A lossless semantic conversion is unavailable: KYS lacks AMI's required capture,
origin, sensitivity and per-item temporal metadata. AMI categories may also exceed
KYS's fixed buckets. Neither missing metadata nor protocol conformance is invented.
The browser log retains the exact pasted document in `turn.response.text` and its
display mirror separately in `turn.mirror`; the existing `turn.snapshot` remains
the KYS wizard projection. This is an optional extension of the existing turn
record, not another capture pipeline. Raw unknown fields remain recoverable from
the original text, including fields omitted by the display projection.

Annotations live in `turn.reviews`, without overwriting original claim text.
The generic mirror can start another observation, compare typed mirrors across
agents and preserve declared contradictions. Source identity takes precedence
over a provider selector default. Text-based matching remains heuristic; a
missing match does not establish a semantic disagreement, forgetting or truth.
Majority agreement never establishes truth.

## Retention, export and purge

Existing browser continuity remains the default, disclosed before paste. No
production retention policy changes. Full export downloads a versioned
`cogentia-personal-local-export` JSON wrapper containing `turnLog` and
`preferences`: prompts, exact replies, display projections and separate reviews.
The existing narrower portrait and introspection exports keep their own scope.
No export is sent automatically. No export-import UI or provider migration is
claimed: original replies can be pasted back into the existing mirror.

Disabling local persistence removes the saved log and legacy draft, stops later
content writes, and keeps only `{ disableLocalPersistence: true }` in the
preference key. Current work survives internal route changes in page memory;
reload closes that ephemeral session. Re-enabling persistence can save current
work again. Erasure clears the page state and these three owned keys:

- `kys_turn_log_v1`
- `kys_snapshot_draft_v1`
- `kys_enrolment_prefs_v1`

An empty post-purge render does not recreate content keys. Pending mirror reads
cannot restore erased content. Unrelated storage is preserved. Purge does not
erase downloaded exports, provider memory, remote accounts, other tabs or backups.
A separate open tab can still hold an earlier copy in memory; close other tabs
before relying on browser-wide erasure. No global-destruction claim is made.

This limited local export does not establish
[PrivAI Migration-Tested](https://github.com/acorsica/privai/blob/main/conformance/migration_tested_v0.1.md)
conformance. See [PrivAI KYS contracts](https://github.com/acorsica/privai/tree/main/contracts)
and [the portability source](../research/cogentia_personal_data_portability.md).

## Verification and return contract

Local commands (from the Cogentia root):

```powershell
node scripts/check-personal-memsync.js --render
node scripts/check-agent-acquired-context-mirror.js
node scripts/check-agent-acquired-context-alignment.js
node scripts/check-agent-context-comparison.js
node scripts/check-progressive-enrolment.js
node scripts/check-cogentia-introspection.js
node scripts/check-kys-turns.js
pnpm --filter @cogentia/personal build
node scripts/cogentia.js frontmatter verify docs/memsync-personal.md --strict-role
git diff --check
```

| Criterion | Local result / remaining limit |
|---|---|
| Anonymous useful entry | PASS at route-render and parser level; actual cold-user browser journey remains BLOCKED. |
| Typed JSON/YAML inputs | PASS; separate layers, exact raw retention, no claimed conversion. |
| Separate corrections | PASS; rejected synthetic claim and original survive export. |
| No raw external disclosure | PASS for tested local ingestion/export path; no real user input used. Full browser network observation remains BLOCKED. |
| Continuity/export/purge | PASS for storage model, opt-out, owned-key purge and raw round-trip; browser click/download verification remains BLOCKED. |
| Two-agent comparison | PASS with synthetic KYS and AMI fixtures, identities and explicit contradiction checks. |
| Accessibility/mobile | Labels, wrapping navigation and keyboard focus added; visual/mobile/assistive-technology verification remains BLOCKED. |
| Blind-spot copy | PASS exact constant and rendered independent card; real clipboard click remains BLOCKED. |
| Supported hosting | Production build PASS; Netlify SPA fallback exists in `public/_redirects`. No deployment or public endpoint verification performed. |

The build has the pre-existing bundle-size warning above 500 kB. The in-app
browser failed twice before page access with
`codex/sandbox-state-meta: missing field sandboxPolicy`. Server-rendered routes
are supplemental evidence, not browser or mobile acceptance. Do not close #284
on that basis.

Next: restore browser-tool access; verify anonymous navigation, exact clipboard
payload, two synthetic observations, local download and purge after reload,
keyboard use and a narrow mobile viewport. Record actual PASS/FAIL/BLOCKED before
closing. Deployment/public endpoint checks require their own authority. Commit,
push and Issue publication remain separate gated effects. The implementation was subsequently committed and pushed to main in
[0460293](https://github.com/JeanHuguesRobert/cogentia/commit/0460293e876e8ae63ee834466582315d166e975e)
(16 files); code delivery is verified, but visual/browser/mobile clipboard and
anonymous real-user acceptance remain unverified. The GitHub Pages deployment
check at that commit reported success, but it does not by itself prove that the
Cogentia Personal app is hosted or working at its intended public URL. No
production live-user acceptance is claimed.
