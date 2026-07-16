---
title: Corpus Consistency Scanner — superseded prototype
author: unknown
date: '2026-07-12'
document_role: source
document_kind: documentation
visibility: public
lifecycle_state: working
update_policy: UP-DEFAULT-REVIEWED
provenance:
  origin_type: repository
  origin_repository: JeanHuguesRobert/cogentia
  origin_ref: '18e7637'
  origin_date: '2026-07-12'
  derived_from: []
review:
  status: unreviewed
  reviewed_by: []
---

# Corpus Consistency Scanner — superseded prototype

> **Historical design record.** The standalone scanner described here is not the maintained corpus
> implementation. Its executable prototype and local SQLite state were retired in July 2026 because
> they bypassed the governed repository registry, visibility rules and continuation protocol.
> Use [`scripts/cogentia.js`](../../scripts/cogentia.js), especially `agent start`, `docs gaps`,
> `corpus plan`, `corpus verify`, and `index update`.

**Location:** `cogentia/research/corpus-consistency/`
**Purpose:** Historical design exploration for incremental consistency checking
**Status:** Superseded by the governed `cogentia.js` corpus and index layers
**Relation to cogentia.json:** Lives in same directory as user's corpus registry

---

## What This Was

The proposed Corpus Consistency Scanner was an **adaptive Monte Carlo algorithm** intended to:
- Scans markdown files for inconsistencies across 6 "angles"
- Uses pattern detection to converge on all issues with minimal samples
- Supports interruption and resumption via continuation packets
- Batches judgment requests for human or AI agents
- Persists all state in SQLite for incremental improvement

**Key property:** `consistency_score = f(compute_budget)` — the more you run it, the better the corpus consistency.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SQLite Database                          │
│  .corpus-consistency.db (next to cogentia.json)            │
├─────────────────────────────────────────────────────────────┤
│  documents │ samples │ issues │ patterns │ batches │ agents │
└─────────────────────────────────────────────────────────────┘
         ↓                                            ↑
    ┌────┴─────┐                              ┌──────┴──────┐
    │  Scanner │                              │ Agent (H/AI)│
    │  Engine  │                              │   Judgment   │
    └──────────┘                              └─────────────┘
```

**Why here, not in workspace root?**
- Corpus infrastructure belongs with corpus metadata
- For other users: place in their user repository where `cogentia.json` lives
- Per `.cogentia/COGENTIA_REGISTRY` memory: registry location defines corpus tools location

---

## Files

| File | Purpose |
|------|---------|
| `scanner.js` | Main scanner engine (ESM, Node.js) |
| `scanner-design.md` | Full schema, algorithm, and pattern dictionary design |
| `global-index.md` | Corpus-wide document inventory with consistency tracking |
| `.corpus-consistency.db` | SQLite database (created on first run) |

---

## Historical Usage

The commands below document the retired prototype and are not runnable from the current tree.

```bash
cd cogentia/research/corpus-consistency

# Initialize database and index workspace
node scanner.js --init

# Run scan (creates continuation packet when issues found)
node scanner.js --scan

# Resume from continuation packet
node scanner.js --resume continuation-42.json

# Generate report
node scanner.js --report
```

---

## Consistency Angles

The scanner checks 6 angles per document:

| Angle | What It Checks | Example Issues |
|-------|----------------|----------------|
| **A** | File existence | Referenced file doesn't exist |
| **B** | Frontmatter completeness | Missing `last_stamped_at` on source docs |
| **C** | Cross-reference validity | Broken `related_documents` paths |
| **D** | Bidirectional references | A→B but not B→A |
| **E** | Content consistency | Status claims vs reality |
| **F** | Index presence | Missing from index.md/README.md |

---

## Phases of Operation

```
Bootstrap (random sampling)
    ↓ 3+ patterns detected
Targeted (attractor-guided)
    ↓ findings rate < 5%
Validation (re-check previous findings)
    ↓ all issues resolved
Complete
```

**Convergence detected when:**
- New findings rate drops below threshold (default: 5%)
- All high-weight attractors exhausted
- Document coverage high + recent findings low

---

## Pattern Dictionary

Patterns discovered during scanning are stored in the `pattern_dictionary` table:

```sql
-- Example patterns:
missing-last-stamped-at:        Source documents without last_stamped_at
unidirectional-cop-xref:       One-way COP references
broken-related-documents-path:  Invalid paths in related_documents
missing-frontmatter:            No YAML frontmatter in research/docs
```

**Pattern lifecycle:**
```
draft → validated → active → (forked | merged) → retired
```

**Pattern operations:**
- **Refine:** Update condition based on feedback
- **Fork:** Split pattern when it needs to specialize
- **Merge:** Combine duplicate patterns

---

## Judgment Batching

When ambiguous issues are found, the scanner creates judgment batches:

```javascript
{
  batch_id: 123,
  agent_type: "ai_claude",  // or "human"
  items: [
    {
      context: { document: "...", issue: "..." },
      question: "Is this a valid P1 issue?",
      options: ["valid", "invalid", "defer"]
    }
  ]
}
```

**Batch size tuning:**
```
if acceptance_rate > 80%:  batch_size++  (up to 10)
if acceptance_rate < 50%:  batch_size--  (down to 3)
```

**Agent types:**
| Type | Timeout | Default Size | Capabilities |
|------|---------|--------------|--------------|
| `human` | 1 hour | 5 | All |
| `ai_claude` | 5 min | 10 | patterns, content, xref |
| `ai_gpt4` | 5 min | 10 | patterns, content |

---

## Continuation Packets

The scanner uses IoC (Inversion of Control) via continuation packets:

```yaml
packet_type: corpus_consistency_continuation
run_id: 42
state:
  phase: targeted
  samples_this_run: 23
  issues_found: 12
judgment_batch:
  batch_id: 123
  items: [...]
next_action:
  type: process_judgments
  command: "node scanner.js --resume continuation-42.json"
```

**Benefits:**
- Interrupt anytime, resume later
- Hand off to agent (human or AI) for judgment
- State persists in database
- Multiple sessions can work on same corpus

---

## Database Schema

Key tables:
- **documents** — File registry with check status
- **samples** — Which documents were sampled when
- **issues** — All inconsistencies found
- **pattern_dictionary** — Master pattern registry
- **attractors** — Active patterns with weights
- **judgment_batches** — Batched judgment requests
- **judgment_batch_items** — Individual items in batches
- **agent_registry** — Agent capabilities and performance
- **runs** — Session tracking

See `scanner-design.md` for full schema.

---

## Integration with cogentia.json

Per memory `registry_location.md`:
> `.cogentia.json` lives in `JeanHuguesRobert/` (profile-repo)

**Design principle:**
- Corpus registry (`.cogentia.json`) → Corpus tools (corpus-consistency/)
- For other users: place in their profile repo where `cogentia.json` lives
- Workspace scanner uses `COGENTIA_REGISTRY` env var or cwd detection

**Future multi-user support:**
```javascript
// Auto-detect registry location
const registryDir = process.env.COGENTIA_REGISTRY
  || findCogentiaJson(process.cwd())
  || '~/.claude/projects/C--tweesic/JeanHuguesRobert';
```

---

## Dependencies

```json
{
  "better-sqlite3": "^9.0.0",
  "glob": "^10.0.0"
}
```

Install:
```bash
cd cogentia/research/corpus-consistency
npm install better-sqlite3 glob
```

---

## License

MIT
**Author:** Jean Hugues Noël Robert
**Institution:** Institut Mariani / C.O.R.S.I.C.A.

---

#PERTITELLU | CORTI CAPITALE
