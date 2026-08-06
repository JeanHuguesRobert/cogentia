---
packet_id: CPKT-2026-006
packet_kind: cognitive-packet/v0.1
packet_version: 1
created: "2026-08-06"
title: "Continuation — Fix Bugs First dashboard, native-tool orchestration, and Agent JHN memory"
home_of_record: "the human author (Jean Hugues Noel Robert)"
subscribing_homes:
  - "JeanHuguesRobert/cogentia (corpus taxonomy, issue import/export, Views Store, agent-facing projections)"
  - "JeanHuguesRobert/operium (Fix Bugs First doctrine, gates, La Nasa / Operium Console)"
  - "JeanHuguesRobert/inseme (COP Mission/Mandate/Act semantics and Agent JHN runtime)"
carrier: "the human author; resume from a trusted workstation or Termux node"
status: "design and scoped first increment agreed; implementation not started"
visibility: public
language: en
target_audience: "coding agents and trusted operators"
document_function: "resumable implementation handoff"
document_role: operational
document_kind: cognitive-packet-handoff
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
related_documents:
  - "https://github.com/JeanHuguesRobert/operium/blob/main/docs/fix-bugs-first.md"
  - "https://github.com/JeanHuguesRobert/operium/blob/main/docs/operium-console.md"
  - "https://github.com/JeanHuguesRobert/cogentia/blob/main/docs/views-store.md"
  - "https://github.com/JeanHuguesRobert/inseme/blob/main/packages/cop-core/COP_STORE_AND_PERSISTENCE.md"
  - "https://github.com/JeanHuguesRobert/inseme/blob/main/apps/platform/mcp/cop/AGENTS.md"
---

# CPKT-2026-006 — Fix Bugs First dashboard handoff

**You are a cognitive processor receiving a continuation packet.** Resume from
the published repositories and the sources named below, not from a previous
chat transcript. This packet records a design decision and a bounded first
increment; it does **not** authorize deployment, GitHub-wide mutations,
database migrations, or autonomous work assignment.

## One-line status

Build a first, read-oriented **Fix Bugs First work dashboard** from the
existing Cogentia issue views and the Operium backlog. It must orchestrate
native tools rather than replace them. The initial human action is normally
"open in GitHub"; direct edits are a later, explicitly secured acceleration.

## Verified starting point

| Repository | Baseline observed 2026-08-06 | Relevant role |
|---|---|---|
| `cogentia` | `3b278d43435345284749fac880d66ae27debc898` before this handoff commit | corpus registry, issue export, Views Store publisher |
| `operium` | `e6ded038386443ef5f400ffa275f3aed22941aca` | Fix Bugs First register, gates, La Nasa and Console |
| `inseme` | `dd51b706e33f82c4111e5ea736dbb41c30fddcbb` | COP runtime; Mission/Mandate/Act semantics |

No pending work was found in these three local checkouts at the time of this
packet. Verify again after syncing; this fact is not a continuing guarantee.

## Established decisions

### 1. Fix Bugs First is a strategy of attention, not an absolute prohibition

Its purpose is to prevent dispersion, hidden technical debt, premature
complexity, and indefinitely postponed confrontation with a real MVP. Research
and promotion remain legitimate work when made visible, bounded, and connected
to a concrete return.

The dashboard distinguishes independently:

```text
kind          bug | feature | incident | debt | task | ...
work_type     maintenance | implementation | research | promotion
urgency       now | soon | planned | deferred
importance    essential | high | normal | low
```

`severity` remains a fact about a bug or incident; it must not be silently
collapsed into urgency or importance. Operium's existing high/critical bug gate
remains authoritative for its declared subsystem scope.

### 2. A dashboard is a derived view, never a second authority

```text
Native system of record
  -> normalized reference and evidence
  -> Cogentia / COP projection
  -> human, agent, and public views
```

The first source is GitHub Issues because they are already tracked, discussable,
version-linked, and exported by Cogentia. This is a pragmatic first adapter,
not a decision that GitHub is the universal work system.

### 3. Fractal orchestration, not tool replacement

GitHub/Git, Operium, CRM-class systems, Inseme/COP, and territorial tools keep
their own authority in their competent domain. A generic traceable work
reference must preserve at least:

```text
external_system, external_ref, authority, principal/subject,
kind, work_type, urgency, importance, status_summary,
mission/mandate refs when applicable, evidence refs, visibility, provenance.
```

The default dashboard action delegates to the native tool, for example opening
the GitHub Issue. Any inline action is only an acceleration of a frequent,
bounded native API operation; it must not create a rival state.

### 4. Mission already belongs to COP semantics

Do **not** create an independent `backlog/missions.yaml` in Operium.
COP treats Mission, Task, and Step as event/artifact schemas with derived
Views. The JHN runtime distinguishes the chain:

```text
Principal -> Mandate -> LogicalAgent -> CapabilityInvocation -> Act -> Trace -> Imputation
```

A Mission is more general than a GitHub Issue. It becomes necessary when work
crosses repositories or tools, carries a mandate/budget, includes private or
territorial activity, or is an exploration with a required return to the
principal ("return to Ithaca"). It is not required for the first dashboard.

### 5. Views Store and La Nasa have complementary roles

```text
Cogentia Views Store
  public generated views and JSON API: issues, continuations, indexes, state

Operium Console / La Nasa
  operational human control surface: fleet today, Work/FBF panel next

Supabase / COP
  private operational memory, append-only traces, and fast Agent JHN projections
```

Cogentia already provides `issues sync` and `issues export`; the Views Store
publishes `current-issues-list.md` and `current-issues.md`. The current Operium
Console is an existing React fleet/node UI; it does not yet display Issues.

### 6. GitHub taxonomy must be centrally governed but adapter-specific

Cogentia is the intended home for the shared taxonomy and the tracked-repository
inventory. Operium retains its Fix Bugs First doctrine and gates.

GitHub Issue Fields are organization-scoped. Repositories across different
GitHub owners may need different adapters: organization Issue Fields where
available, normalized labels otherwise. The dashboard consumes the normalized
meaning and records the source mechanism.

Potential future Cogentia commands (design only):

```text
cogentia issues taxonomy plan
cogentia issues taxonomy apply --owner <GitHub-owner>
cogentia issues taxonomy verify
```

They must be explicit mutators, never silently change labels or fields.

## First implementation increment — deliberately small

1. Create a versioned Cogentia taxonomy specification and a read-only normalized
   work-view generator.
2. Consume Cogentia's existing issue export plus the public Operium backlog
   fields needed for gates.
3. Publish `fix-bugs-first-dashboard.md` and
   `fix-bugs-first-dashboard.json` to the Views Store, with freshness,
   provenance, visibility, and source links.
4. Add a `Work / Fix Bugs First` entry from La Nasa/Operium Console to this
   view. The default action opens the native GitHub Issue.
5. Add focused fixture tests for normalization, gates, and redaction.

Do not begin with: GitHub-wide label application, browser-held GitHub tokens,
Supabase migrations, direct Issue editing, CRM integration, or COP Mission
automation. Those need their own issue and authorization after the read view is
useful.

## Safe resume

On Termux, after this packet is pushed and while connectivity is still
available:

```bash
cd ~/srv/cogentia/repos/cogentia
bash scripts/ops/termux-resume-fix-bugs-first-dashboard.sh
```

If connectivity has already disappeared, use the existing checked-out commits:

```bash
bash scripts/ops/termux-resume-fix-bugs-first-dashboard.sh --offline
```

The script refuses to update a dirty checkout and writes only a local,
non-secret continuity receipt under `~/.cogentia/var/state/`.

## First commands after a successful handoff

```bash
cd ~/srv/cogentia/repos/cogentia
sed -n '1,260p' research/CPKT-2026-006_fix_bugs_first_dashboard_handoff.md
node scripts/cogentia.js issues export --help

cd ~/srv/cogentia/repos/operium
node bin/operium.js backlog list --kind bug --status openish --human
node bin/operium.js backlog gate --subsystem console --human
```

Before writing in any repository, read its `AGENTS.md`, inspect its current
worktree, identify or create one bounded issue, and re-check the applicable
Fix Bugs First gate.

## Continuity acceptance test

A successful Termux run proves only this bounded continuity claim:

1. Cogentia and Operium resolve to clean, known Git commits (or are reported
   as safely untouched in `--offline` mode).
2. The CPKT is available in the Cogentia checkout.
3. The Cogentia CLI and Operium backlog reader start locally.
4. The produced receipt identifies the exact commits used by the next agent.

It does not prove GitHub, Views Store, Supabase, or Fracta reachability.

## Report stub for the next session

```text
Packet: CPKT-2026-006
Connectivity at handoff: online / offline
Cogentia commit:
Operium commit:
Receipt path:
Issue/ref selected for the first increment:
Native source(s) consulted:
Files changed:
Checks run:
Known risks:
Human validation needed:
```
