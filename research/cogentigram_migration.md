---
title: Cogentigram — open first-class dimensional migration
author: Jean Hugues Noël Robert, baron Mariani
affiliation: Institut Mariani / C.O.R.S.I.C.A.
date: '2026-11-22'
last_modified_at: '2026-11-22'
status: working-paper — implementation
document_role: source
document_kind: engineering-plan
visibility: public
lifecycle_state: active
license: CC BY-SA 4.0
language: en
update_policy: UP-DEFAULT-REVIEWED
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentigram_migration.md
provenance:
  origin_type: conversation
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: https://github.com/JeanHuguesRobert/cogentia/issues/200
  origin_date: '2026-11-22'
  derived_from:
    - research/kys_probe_construct_registry.md
    - research/kys_measurement_contract.md
    - research/kys_reality_capture_baseline_audit.md
review:
  status: unreviewed
  reviewed_by: []
---

# Cogentigram dimensional migration — work contract

**Principal's explicit mandate, 22 November 2026**: evolve the active Cogentigram beyond 73 with seven peer indicators, and propagate into the Corpus and Cogentia Personal/KYS; record and resume work in existing Cognitive Packets. Do not place the seven in a lower-status extension. The first executable milestone is **80 equal-rank dimensions**, open to further growth.

## Canonical model

- [Dimension registry](cogentigram_dimensions.json): stable IDs, definitions, evidence and measurement kinds, open count.
- [JHN active structural profile](cogentigram_jhn_public_open.json): equal-level indicator objects for all dimensions, including seven qualitative contextual observations without invented scores.
- Earlier raw observations from March and August 2026 are immutable historical events, not a fixed active ontology. Scores originally styled “percentiles” are retyped as uncalibrated agent estimates.
- Stable `id` defines dimension identity, while `rank` is only a legacy-compatible display ordinal. A model may contain dimensions unseen in earlier versions.

## Cognitive Packet work graph

- [#200](https://github.com/JeanHuguesRobert/cogentia/issues/200) owns the migration and completion evidence.
- [#203](https://github.com/JeanHuguesRobert/cogentia/issues/203) owns registry/ontology/equal standing.
- [#202](https://github.com/JeanHuguesRobert/cogentia/issues/202) provided initial measurement contract (historically closed); this migration extends it.
- [#206](https://github.com/JeanHuguesRobert/cogentia/issues/206) owns capture schema, parser, immutable raw input, persistence and exports.
- [#204](https://github.com/JeanHuguesRobert/cogentia/issues/204) owns new one-shot prompt; do not retroactively rewrite the old prompt as if it were new.
- [#205](https://github.com/JeanHuguesRobert/cogentia/issues/205) owns tests (73 archive, 80, 81 and 120 current dimensions, unknown/qualitative cases).
- [#207](https://github.com/JeanHuguesRobert/cogentia/issues/207) owns Cogentia Personal/KYS UI dynamic categories, context evidence and visual validity.
- [#208](https://github.com/JeanHuguesRobert/cogentia/issues/208) owns person-controlled grants/disclosure and release decisions.

## Implementation boundaries and evidence

1. Source/contract/registry first; no fixed “historical 73” subsystem in active structure.
2. Legacy Netlify parser currently truncates to 73 and requires old version; make current import dynamic and non-lossy, keep historical import explicit.
3. Results UI currently hardcodes categories, the string “73 indicators” and pseudo-percentile population median. Migrate dynamic category discovery, qualitative measures and evidence.
4. Presentation mappings presently refer to historical ordinal ranks and assume calibrated values; either rebind to stable IDs with explicit derivation provenance or disable statistically unsupported projections for new captures. Do not claim Big Five/MBTI validation from the same measurement.
5. Agent JHN brief presently selects by numeric score only; relevance must allow important contextual unscored dimensions to reach the twin.
6. Validate source and test suite, check final GitHub SHA, and **separately** verify any deployed production version. A commit is not deployment.

## Deployment reality — 22 November 2026

The current production KYS Personal interface at `https://services.acorsica.org/` serves a **browser-first Snapshot and Cogentigram exploration**. The active `/indicators` capture path does not require a Supabase connection; browser-only export and user-initiated local persistence can work without a server. By contrast, `/submit` and `/results/:id` are legacy advanced paths that require tables `analyses` and `indicator_scores` and a backend that is **not configured** on the public KYS host: `/api/*` returns HTTP 404. The two accessible active Supabase projects (JHN and Kudocracy) do not have those tables. **Do not apply `20261122000000_open_cogentigram_dimensions.sql` to either project by conjecture.** That migration is for a verified legacy-backed target only, not a requirement for the browser-first KYS release.

The browser-facing v2 prompt must be generated from the *entire canonical dimension registry*, not just the seven recent discoveries: include all 80 stable IDs and definitions, accept explicit `unknown` records without fabricating values, and allow truly emergent dimensions of equal standing. A v2 response with only seven dimensions is valid but **incomplete** and should be displayed as 7/80 coverage, not silently promoted to an 80-dimension profile. Browser-side saving must be opt-in, with a clear erase/export route, and original input must not be normalized away.

Live deployment of the static app is separate from GitHub and requires the authorized publish mechanism for `/srv/www/kys-services/current`, a root-owned symlink to an immutable release. See #206 and #207 for outstanding or completed release checkpoints.

## Acceptance

- At least 80 first-class active entries and no fixed maximum; all IDs unique.
- REP-001 can simultaneously capture reported calculus-notation difficulty and demonstrated formal programming competence.
- Legacy archive 73 and current 80/81/120 captures can be parsed without truncation.
- Qualitative dimensions without scores can be stored, displayed, annotated, exported and selected by Agent John.
- Corpus definitions, prompts, personal UI, and specialized uses agree with the same registry.
- All outcomes and unfinished work linked to #200 and its child packets, with tested/untested and deployed/not-deployed states distinct.
