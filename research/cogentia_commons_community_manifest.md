---
title: "Cogentia Commons — COMMUNITY.md Sub-Specification"
description: "File format, amendment semantics, and validation contract for the per-community governance manifest"
layout: default
nav_order: 6
version: "draft-0.2"
last_modified_at: 2026-05-13
author: "Jean Hugues Noël Robert, baron Mariani"
affiliation: "Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica"
license: "CC BY-SA 4.0 (text), MIT (validation tooling)"
status: "working-paper"
canonical_url: https://github.com/JeanHuguesRobert/cogentia/blob/main/research/cogentia_commons_community_manifest.md
last_stamped_at: 2026-05-26
---

# Cogentia Commons — COMMUNITY.md Sub-Specification

*Sub-specification of [`cogentia_commons_mvp_spec.md`](cogentia_commons_mvp_spec.md) §4 and §4.5. The parent spec describes what a community is and what its manifest must declare; this document specifies the concrete file format, the amendment semantics, and the validation contract enforced by `cogentia.js`.*

---

## 0. Preamble

A `COMMUNITY.md` file is the governance manifest of a single Cogentia Commons community. It is the only file the platform requires a community to maintain in git; every other piece of community state (members, contributions, supports, continuations) is projection state in the per-community Supabase, derivable from the COP Event log.

The manifest answers three questions, in this order: *who is in*, *which audit plugins do we trust*, *what happens when a member acts badly*. v1 specifies a minimal answer to each. The file's job is to make the answers public, signable, diffable, and amendable under disciplined rules.

The amendment discipline matters because a community whose manifest can be silently rewritten has no manifest at all — its members can't know what they accepted on joining. The discipline is *lex prospicit, non respicit*: a new manifest binds on actions taken after its commit; retroactive amendments are the exception, named as such, and rare.

---

## 1. File Location and Ownership

- **Path.** `<home_repo>/COMMUNITY.md` at the root of the community's home GitHub repository.
- **Owner.** Initially the community's founder (the user who emits the first `cogentia.manifest.updated` Event). Ownership can be transferred via a `cogentia.manifest.owner.transferred` Event signed by the current owner. Multi-owner stewardship is a v1.1 concern.
- **License.** CC BY-SA 4.0 is the default for the prose; communities may pick another permissive license but MUST declare it in the manifest.
- **First commit establishes priority** (per `second_method.md`). The community's existence dates from its first manifest commit, not from any prior announcement.

---

## 2. File Structure

A valid `COMMUNITY.md` is a markdown file with three regions:

1. **YAML front-matter** — machine-readable identity and version metadata.
2. **Numbered sections** — each section header is required (validator enforces); each section MAY contain prose, fenced code blocks (YAML), or both.
3. **Signature block** — the final block records the committer, the commit SHA, and the license.

The validator parses front-matter and fenced YAML blocks; the prose is free-form except for the Acceptable Use Statement (§6.4), which is normatively binding text.

---

## 3. Required Front-Matter Schema

```yaml
---
cogentia_manifest_version: "1.0"        # this sub-spec version, not the community's version
community_id: "<slug>"                   # immutable; URL-safe, lowercase, hyphenated
name: "<human-readable name>"            # amendable
home_repo: "<github URL>"                # immutable
contact: "<email or URL>"                # amendable
license: "CC BY-SA 4.0"                  # amendable
created_at: "2026-05-12"                 # immutable; first-commit date in ISO-8601
manifest_commit: "<sha>"                 # SET BY VALIDATOR at validation time, not by author
---
```

**Field-level immutability** is enforced by the validator under `--check-amend` (§7). The author MUST NOT change `community_id`, `home_repo`, or `created_at` after the first valid commit. Changing them invalidates all prior member consent (see §8.1).

---

## 4. Required Sections (Normative)

Every conformant `COMMUNITY.md` MUST contain sections 1–6 below, in order, with the exact header text. A section MAY be empty of prose but MUST contain its required YAML block.

### Section template

```markdown
# Community Manifest — <community name>

## 1. Membership

[prose: who is welcome, how the community sees itself]

```yaml
policy: open                    # one of: open | invite | federated-trust
admission_artifact: null        # optional URI of a separate onboarding document
```

## 2. Audit Plugin Allow-List

[prose: which methodological commitments the community holds the plugins to]

```yaml
plugins:
  - id: cogentia.plugins.kernel_extractor
    version: "0.1.0"
  - id: cogentia.plugins.falsifiability_conversion
    version: "0.1.0"
  - id: cogentia.plugins.citation_validator
    version: "0.1.0"
  - id: cogentia.plugins.consistency_scanner
    version: "0.1.0"
  - id: cogentia.plugins.objection_summariser
    version: "0.1.0"
  - id: cogentia.plugins.revision_proposer
    version: "0.1.0"
```

## 3. Support Threshold

[prose: what Support means in this community; reaffirm "recognition, not validity"]

```yaml
proposed_to_accepted_threshold: 0    # 0 = no threshold; N = require N Supports
support_decay_days: null             # null = Supports never expire (v1 default)
```

## 4. Federation

[prose: which communities this one cites and whose objections it accepts as first-class]

```yaml
federation:
  - community_uri: "cogentia://marenostrum"
    trust: cite                       # one of: cite | bidirectional
  - community_uri: "cogentia://FractaVolta"
    trust: cite
```

## 5. Editor Independence Overrides (Optional)

[prose: only present if the community wants to STRENGTHEN, never weaken, the §4.4 default]

```yaml
independence_strengthening:
  exclude_co_authors_of_open_revisions: false   # default false
  exclude_supporters_of_target: false           # default false
```

## 6. Accountability Policy

[prose: the community's posture on permissive default + post-hoc accountability]

### 6.1 Sanction Issuers

```yaml
cooldown_issuers:                     # who may issue rung-3 cooldowns
  - role:author                       # always permitted on own Document
  - role:moderator                    # community-named
ban_issuers:                          # who may issue rung-4 temporary bans
  - role:moderator
moderators:                           # named github handles; required if a "moderator" role appears above
  - jeanhuguesrobert
```

### 6.2 Per-Rung Maximum Durations

```yaml
cooldown_max_days: 30                 # v1 ceiling = 30; may be lower
ban_max_days: 90                      # v1 ceiling = 90; may be lower
```

### 6.3 Appeals Protocol

```yaml
appeals_reviewer: "role:moderator"   # may also be a specific handle or "role:federated"
time_to_respond_days: 7
escalation:
  federated_community: null           # optional URI of a community that hears unresolved appeals
```

### 6.4 Initial Publication Approvers (community-elected gate, parent §8.3)

When the community wants moderator authorization on the first Publication of every new Document (parent §8.3), name the eligible approvers here. If omitted, defaults to `ban_issuers`. To skip the gate entirely (degenerate single-Author case), set explicitly to `null`.

```yaml
initial_publication_approvers:
  - role:moderator                    # any handle in §6.1 `moderators`
  # or: specific github handles
  # - jeanhuguesrobert
  # or: null  # disables the gate; initial Publications proceed without moderator review
```

The gate applies only to `artifact_type: initial`. All other artifact types (`improved`, `premise_note`, `conclusion_note`, `refutation`, `synthesis`) proceed without this gate, regardless of moderator availability. This keeps §1.1's permissive default for everyday activity while gating the moment a Document enters the community's permanent catalogue.

Rejection of an initial Publication carries the same recursive accountability as any other moderator action: the rejection is signed and immutable, and the Document Author may appeal via §6.3.

### 6.5 Acceptable Use Statement

[prose — the actual social contract members accept on joining. Should cover at minimum:
 - the §1.1 design principle (permissive action, accountable record)
 - what behaviour will trigger which rung of sanction
 - that sanctions are time-bounded and appealable
 - that the manifest itself is open to objection and revision]

### 6.6 Change Narrative Policy (parent §5.8)

Every state-changing Event in Commons can carry a `narrative` block (short + long descriptions + chat-conversation URLs — parent §5.8). The community manifest declares whether the platform prompts for it, encourages it, or requires it on specific Event classes.

```yaml
narrative_policy:
  default: optional | encouraged | required-for-publications
  # `optional` (v1 default): UI shows the fields, all may be left empty
  # `encouraged`: UI shows the fields with a non-blocking nudge (e.g. visual emphasis)
  # `required-for-publications`: the `narrative` block is MANDATORY on
  #     cogentia.publication.* and cogentia.kernel.accepted Events; other
  #     Events stay optional
  prompt_chat_urls: true            # whether the UI surfaces the chat-URL field
                                    # by default; communities that don't want to
                                    # encourage paste-bridge UX can set false
  validator_warn_on_missing: false  # if true, the validator warns (not errors)
                                    # when an Event likely should have carried
                                    # a narrative but didn't
```

The narrative_policy is a **forward-only amendable field** per §8.2 — strengthening the policy (e.g. `optional → encouraged → required-for-publications`) binds on actions after the amendment; relaxing it likewise binds forward only. Prior Events keep their original narrative (or its absence).

**Why this is here.** Rule 1 of `second_method.md` — "publish the process, not only the result" — is operational at the per-action granularity through change narratives. A community that takes Rule 1 seriously will tighten its `narrative_policy` over time. v1's `optional` default keeps the principle visible without burdening early adopters; v0.2.0+ communities that have crossed §11.3's irreversibility threshold may opt up.

By participating in this community, you accept that your contributions and any
sanctions taken against you are recorded permanently in the COP Event log; that
you may withdraw at any time but the record remains; that the community is
permissive by default and that the cost of abuse is borne by reputation,
sanctions, and reversal — not by entry filtering.
```

---

## 5. Optional Sections

A `COMMUNITY.md` MAY include further sections after the required six. These do not bind the platform's behaviour but become part of the community's recorded culture. Common patterns:

- `## 7. Affiliations` — institutional partners.
- `## 8. Citation` — preferred citation format for the community itself.
- `## 9. History` — narrative of the community's founding.

The validator ignores optional sections beyond ensuring they don't reuse the names of required sections.

---

## 6. Signature Block

The file ends with a signature block on a single line, immediately after the last section:

```markdown
*Signed: <github_handle>. Commit: pending. License: CC BY-SA 4.0.*
```

The `Commit: pending` token is replaced by the validator (at commit time) or by the platform (on ingestion) with the actual commit SHA. This is the same mechanism the `manifest_commit` front-matter field uses; the signature block is the human-readable surface of it.

---

## 7. The `cogentia.js manifest` Validator

The `cogentia.js` CLI (already named doctrinally in `second_method.md`) gains a `manifest` subcommand. The new surface is additive; existing commands (`scan`, `check`, `graph`, `add`) are unaffected.

### 7.1 Subcommand contract

```
node scripts/cogentia.js manifest --validate <path-or-url>
node scripts/cogentia.js manifest --diff <commit-a> <commit-b>
node scripts/cogentia.js manifest --check-amend <previous-path> <proposed-path>
```

### 7.2 `--validate <path-or-url>`

Parses the file, validates:

- front-matter present and conformant to §3 schema;
- required sections 1–6 present, in order, with exact header text;
- each required YAML block present, parseable, and conformant to its inline schema (§4);
- §6.2 durations within v1 ceilings (≤ 30 days cooldown, ≤ 90 days ban);
- if any role tag appears in §6.1 sanction issuers, the corresponding membership list (e.g. `moderators`) is non-empty;
- §6.4 `initial_publication_approvers` resolves: all named handles exist in §6.1 `moderators` or are concrete github handles; or the field is explicitly `null` (gate disabled);
- §6.6 `narrative_policy.default` is one of `optional | encouraged | required-for-publications`; `prompt_chat_urls` and `validator_warn_on_missing` are booleans;
- signature block present.

Returns:

- `0` on full conformance, with a one-line summary to stdout (`OK <community_id> @ <manifest_commit>`).
- `1` on schema violation. Stderr lists structured errors:

  ```
  ERR  E001  missing required section: "6. Accountability Policy"
  ERR  E014  cooldown_max_days = 45 exceeds v1 ceiling of 30
  ERR  E022  role "moderator" referenced but moderators list is empty
  ```

- `3` on I/O error.

### 7.3 `--diff <commit-a> <commit-b>`

Resolves both commits in the home repo, parses each manifest, and reports a field-by-field diff in a stable text format:

```
~ name                  "Foo Community"  →  "Foo Commons"
- federation[2]         cogentia://baz
+ federation[3]         cogentia://qux  (trust: cite)
~ ban_max_days          60  →  45
```

Used by Reviewers and the community itself to inspect proposed amendments.

### 7.4 `--check-amend <previous-path> <proposed-path>`

The most important subcommand. Validates that the proposed manifest is a legal amendment of the previous one, per the amendment semantics (§8).

Returns:

- `0` if the amendment is legal (purely forward-binding; immutable fields unchanged).
- `1` if any schema violation in either file (delegates to `--validate`).
- `2` if the amendment violates the discipline:
  - immutable field changed → `ERR  A001  immutable field "community_id" changed from "x" to "y"`
  - retroactive change without explicit declaration → `ERR  A011  Acceptable Use Statement changed without "retroactive: true" marker on the amendment commit`
  - amendment ceiling raised in a way that affects in-flight sanctions → `ERR  A015  ban_max_days raised; in-flight bans are not bound by the new ceiling but the amendment must declare this`

### 7.5 Tests

The validator MUST ship with a fixtures directory of conformant and intentionally-broken manifests, one fixture per error code. Per the `cogentia.js doctrinal status` memory, the CLI's surface is part of a published methodological commitment; new subcommands need test coverage from day one.

---

## 8. Amendment Semantics

### 8.1 Field categories

Every field in a `COMMUNITY.md` belongs to one of three categories:

| Category | Examples | Amendment rule |
|---|---|---|
| **Immutable** | `community_id`, `home_repo`, `created_at` | MUST NOT change after the first valid commit. Changing them is a *new community*, not an amendment, and the validator rejects the change. |
| **Forward-only amendable** | `acceptable_use`, `cooldown_max_days`, `ban_max_days`, `cooldown_issuers`, `ban_issuers` | MAY change. New value binds on actions *after* the amendment commit. Actions and sanctions in flight at amendment time are governed by the value that was in effect at issuance. |
| **Freely amendable** | `name`, `contact`, `plugins`, `federation`, `support_threshold` | MAY change. New value applies from the amendment commit forward. In-flight Continuations using the previous value continue to completion; new round-opens use the new value. |

### 8.2 Non-retroactivity by default — *lex prospicit, non respicit*

The standard amendment rule is: the new manifest binds on what happens after it. This is the v1 default and the validator enforces it for forward-only-amendable fields.

Concrete consequences:

- An amendment that lowers `ban_max_days` from 60 to 30 does not shorten an existing 60-day ban.
- An amendment that adds a clause to the Acceptable Use Statement does not retroactively make previously-recorded contributions sanctionable under the new clause.
- An amendment that removes a plugin from the allow-list does not invalidate AgentReview rows produced under the previous allow-list, nor does it close in-flight Continuations whose `agent` is the removed plugin.

### 8.3 The retroactive exception

A retroactive amendment IS possible but MUST be explicit, justified, and rare. Mechanics:

1. The commit's message includes the line `retroactive: true` AND a free-text justification of at least one paragraph.
2. The proposed manifest declares the retroactive scope:

   ```yaml
   retroactive_amendment:
     applies_to_actions_after: "2026-01-01"   # ISO-8601; floor on which actions are affected
     fields: [acceptable_use]                  # which fields are retroactively applied
     justification_artifact: "<URI>"           # a separate Artifact carrying the full reasoning
   ```

3. The validator under `--check-amend` requires the above; absent any of it, the amendment is rejected as a §8.2 violation.
4. The community MUST publish a `cogentia.manifest.retroactive.amended` Event linking to the justification Artifact. This Event is distinct from the normal `cogentia.manifest.updated` and is surfaced separately in the community's feed.

The retroactive exception is for genuine cases — discovering that a previously-defined sanction was being misapplied due to a manifest typo, a security incident requiring a backdated rule, a court-ordered correction. It is not a routine amendment path. A community that uses it more than once or twice per year is signalling that its normal amendment process is broken; that signal is itself part of the public record.

### 8.4 Effective-time semantics

Every sanction Event records the `manifest_commit_at_issuance` field. The platform looks up sanctions by this field, not by the current manifest, when deciding whether they remain valid. This is what makes "in-flight is governed by the previous value" work at the data layer rather than as a policy promise.

---

## 9. Worked Example — `barons-Mariani/COMMUNITY.md`

A complete, conformant manifest for the home community of `second_method.md`.

```markdown
---
cogentia_manifest_version: "1.0"
community_id: "barons-mariani"
name: "Barons Mariani Research Community"
home_repo: "github.com/JeanHuguesRobert/barons-Mariani"
contact: "jhr@baronsmariani.org"
license: "CC BY-SA 4.0"
created_at: "2026-05-12"
manifest_commit: "pending"
---

# Community Manifest — Barons Mariani Research Community

## 1. Membership

This community hosts the documents of the six-repo corpus (barons-Mariani,
marenostrum, cogentia, FractaVolta, inseme, Inox) and welcomes objections and revisions from
any verified GitHub identity. Membership is open; participation is signed.

```yaml
policy: open
admission_artifact: null
```

## 2. Audit Plugin Allow-List

The plugins listed below are the v1 baseline named in
`cogentia_commons_mvp_spec.md` §6.3. Adding plugins requires a manifest
amendment with a `--diff` review.

```yaml
plugins:
  - id: cogentia.plugins.kernel_extractor
    version: "0.1.0"
  - id: cogentia.plugins.falsifiability_conversion
    version: "0.1.0"
  - id: cogentia.plugins.citation_validator
    version: "0.1.0"
  - id: cogentia.plugins.consistency_scanner
    version: "0.1.0"
  - id: cogentia.plugins.objection_summariser
    version: "0.1.0"
  - id: cogentia.plugins.revision_proposer
    version: "0.1.0"
```

## 3. Support Threshold

Support in this community signals recognition, not validity. No threshold gates
the proposed → accepted transition; an Objection is accepted when it survives
the audit-plugin contract, not when it accumulates Supports.

```yaml
proposed_to_accepted_threshold: 0
support_decay_days: null
```

## 4. Federation

```yaml
federation:
  - community_uri: "cogentia://marenostrum"
    trust: bidirectional
  - community_uri: "cogentia://cogentia"
    trust: bidirectional
  - community_uri: "cogentia://FractaVolta"
    trust: bidirectional
```

## 5. Editor Independence Overrides

(none — the §4.4 default applies)

```yaml
independence_strengthening:
  exclude_co_authors_of_open_revisions: false
  exclude_supporters_of_target: false
```

## 6. Accountability Policy

This community runs the §1.1 permissive default. Cooldowns are issued by the
Author of the affected Document; community-wide bans require the moderator
listed below. Both are time-bounded and appealable.

### 6.1 Sanction Issuers

```yaml
cooldown_issuers:
  - role:author
  - role:moderator
ban_issuers:
  - role:moderator
moderators:
  - jeanhuguesrobert
```

### 6.2 Per-Rung Maximum Durations

```yaml
cooldown_max_days: 30
ban_max_days: 90
```

### 6.3 Appeals Protocol

```yaml
appeals_reviewer: "role:moderator"
time_to_respond_days: 7
escalation:
  federated_community: "cogentia://cogentia"
```

### 6.4 Initial Publication Approvers

```yaml
initial_publication_approvers:
  - role:moderator
```

### 6.5 Acceptable Use Statement

By participating in this community you accept that:

- your contributions and any sanctions taken against you are recorded
  permanently in the COP Event log;
- the community is permissive by default — the cost of abusive behaviour is
  borne by reputation, sanctions, and reversal, not by entry filtering;
- sanctions are time-bounded (≤ 30-day cooldown, ≤ 90-day ban) and appealable;
- this manifest is itself open to objection and revision through the same
  protocol that operates on any other Document.

You may withdraw at any time; your prior contributions remain in the record.

### 6.6 Change Narrative Policy

```yaml
narrative_policy:
  default: encouraged
  prompt_chat_urls: true
  validator_warn_on_missing: false
```

This community values Rule 1 (publish the process). The UI nudges actors to
attach a short description, a long description, and any conversational-agent
URLs that informed their action — but does not require them. Publications and
kernel acceptances are stronger candidates for narrative completion; future
amendment may tighten to `required-for-publications`.

---

*Signed: jeanhuguesrobert. Commit: pending. License: CC BY-SA 4.0.*
```

---

## 10. Open Questions

1. **Multi-owner stewardship.** v1 has a single owner (the founder). A community whose founder becomes inactive has no path to amend the manifest. v1.1 should specify an n-of-m signing scheme for amendments.
2. **Manifest schema versioning.** This document is `cogentia_manifest_version: 1.0`. Communities pinned to an older schema after a breaking change need a migration story; out of scope for v1.
3. **Cross-community policy conflicts.** When community A federates with community B `bidirectional` and their Acceptable Use Statements contradict, whose rule binds on a contribution that crosses the federation link? v1 says: the home community of the target document. The federation receiver's policy applies to derived works only.
4. **Validator distribution.** Should the `manifest --validate` subcommand live in the `cogentia.js` script directly, or in a separate `@cogentia/validator` package that the script imports? The script currently insists on zero dependencies per the doctrine; YAML parsing adds one. Resolution deferred to the implementation pass.
5. **Acceptable Use Statement as a separate Artifact.** Embedding the prose inside §6.4 makes diffs noisy. An alternative is to extract the AUS into a sibling `ACCEPTABLE_USE.md` file referenced by URI from the manifest. This is more in line with the Cogentia "literate form + formal form" duality. Worth deciding before v1 ships.

---

## 11. Relationship to Existing Artifacts

- [`cogentia_commons_mvp_spec.md`](cogentia_commons_mvp_spec.md) — parent spec. This sub-spec implements §4.1, §4.4 overrides, §4.5 accountability declarations, and the §5.7.4 manifest Event types.
- [`second_method.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/research/second_method.md) — anchors `cogentia.js` as canonical tooling; the new `manifest` subcommand inherits the same surface-stability commitment.
- [`mimetic_desynchronization.md`](https://github.com/JeanHuguesRobert/barons-Mariani/blob/main/mimetic_desynchronization.md) — non-retroactivity by default is itself a form of *interpretive buffering* (§7 of that paper): it prevents a manifest amendment from suddenly recasting members' past actions in a new moral frame.
- [`inseme/packages/cop-core/Architecture.md`](https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/Architecture.md) — the manifest itself is a `cogentia/manifest` Artifact (§2.6) in the community manifest Topic (§5.7.3 of the parent spec).

---

## 12. License

This sub-specification: **CC BY-SA 4.0**.
The `cogentia.js manifest` subcommand and its fixtures: **MIT**.

---

*Premier commit : 2026-05-12 — Corte. Sub-spec draft v0.1.*
*Institut Mariani — C.O.R.S.I.C.A., 1 cours Paoli, F-20250 Corte, Corsica*


<!-- BEGIN_AUTO: backlinks -->
### Backlinks

*These documents link to this file:*
- [Cogentia Commons — Session Continuation Snapshot](cogentia_commons_continuation.md)
- [Cogentia Commons — `kernel_extractor` Plugin Sub-Specification](cogentia_commons_kernel_extractor.md)
- [Cogentia Commons — MVP Specification](cogentia_commons_mvp_spec.md)
- [Cogentia Commons — Structural Plugin Sub-Specifications](cogentia_commons_structural_plugins.md)
- [Cogentia Commons — Workflows](cogentia_commons_workflows.md)
- [Corpus Status — cogentia](corpus-status.md)
- [Research Index — Cogentia](index.md)

<!-- END_AUTO: backlinks -->
