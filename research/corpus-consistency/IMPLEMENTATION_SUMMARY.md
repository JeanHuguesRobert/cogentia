---
title: Corpus Consistency Scanner — Historical Implementation Summary
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

# Corpus Consistency Scanner — Historical Implementation Summary

> **Superseded prototype (July 2026).** This document records an experimental standalone scanner.
> The executable was retired because the maintained implementation belongs in
> [`scripts/cogentia.js`](../../scripts/cogentia.js), which applies the authoritative registry,
> visibility policy, ignore semantics, generated-view rules and continuation protocol.

**Date:** 2026-07-09
**Status:** ✅ Operational

## Overview

The Corpus Consistency Scanner is an IoC-based (Inversion of Control) document consistency checker that uses:
- **SQLite** (Node.js built-in `node:sqlite`) for persistence
- **Set-based sampling** for cross-document consistency checking
- **Pattern/anti-pattern dictionary** for detecting semantic issues
- **Continuation packets** for externalizing judgment requests

## What Was Implemented

### 1. Pattern/Anti-Pattern Dictionary Schema ✅

```sql
CREATE TABLE pattern_dictionary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  canonical_name TEXT NOT NULL,
  category TEXT NOT NULL,
  pattern_type TEXT DEFAULT 'anti-pattern',
  condition_template TEXT,
  condition_sql TEXT,
  example_match TEXT,
  example_nonmatch TEXT,
  description TEXT,
  rationale TEXT,
  fix_recommendation TEXT,
  severity_default TEXT DEFAULT 'P2',
  status TEXT DEFAULT 'draft',
  -- ... lifecycle and relationship fields
);
```

### 2. Set-Based Document Sampling ✅

Four sampling strategies for cross-document consistency checking:

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `same_repo` | Documents from same repository | Intra-repo consistency |
| `same_directory` | Documents from same directory | Local context checks |
| `related_by_topic` | Documents with similar frontmatter topics | Topical coherence |
| `random_cross_repo` | Random documents from different repos | Global corpus consistency |

### 3. Continuation Packet Generation ✅

When potential inconsistencies are detected, the scanner issues continuation packets for external judgment:

```javascript
{
  packet_type: 'judgment_request',
  question: 'Status inconsistency detected',
  context: {
    pattern: 'status-consistency-anti-pattern',
    documents: [...],
    description: 'This set contains both published and draft documents'
  },
  options: [
    { value: 'consistent', label: 'This is expected' },
    { value: 'inconsistent', label: 'Inconsistent' },
    { value: 'defer', label: 'Defer judgment' }
  ],
  recommended_judgment: 'defer',
  severity: 'P2'
}
```

### 4. Implemented Anti-Patterns

Currently detects:

1. **Status Consistency Anti-Pattern**
   - Detects: Published and draft documents in same set
   - Pattern: `status-consistency-anti-pattern`

2. **Temporal Consistency Anti-Pattern**
   - Detects: Documents with dates in the future
   - Pattern: `temporal-consistency-anti-pattern`

3. **Dependency Satisfaction Anti-Pattern**
   - Detects: Documents referencing related docs not in current set
   - Pattern: `related-doc-missing`

## Usage

```bash
# Index workspace (first time or after changes)
cd C:/tweesic
node cogentia/research/corpus-consistency/scanner.js --init

# Run scan (default 10 samples)
node cogentia/research/corpus-consistency/scanner.js --scan

# Run larger scan
node cogentia/research/corpus-consistency/scanner.js --scan --sample-size 30

# View pending continuations
node cogentia/research/corpus-consistency/scanner.js --continuations

# Submit judgment for a continuation
node cogentia/research/corpus-consistency/scanner.js --judge <packet-id> <judgment> [reasoning]
# Example: node scanner.js --judge 1 valid "This is expected"

# Interactive judgment processing
node cogentia/research/corpus-consistency/scanner.js --process-judgments

# Resume from specific run
node cogentia/research/corpus-consistency/scanner.js --resume --run-id <id>
```

## Judgment Processing

The scanner supports full judgment processing workflow:

1. **List pending continuations** — `--continuations` shows all pending judgment requests
2. **Submit judgments** — `--judge <id> <judgment>` processes individual packets
3. **Interactive mode** — `--process-judgments` for guided processing
4. **Apply results** — Judgments automatically update issue status

Judgment options:
- `valid` — Confirmed issue, mark as needing fix
- `invalid` — False positive, disregard
- `inconsistent` — Real inconsistency detected
- `defer` — Leave for later judgment

## Current Results

- **Documents indexed:** 1,174 markdown files
- **Sets checked:** 10+ sets of 3 documents each
- **Issues found:** 0 deterministic issues
- **Continuations issued:** 0 (corpus is consistent)

## Next Steps

To enhance semantic consistency detection:

1. **Add more anti-patterns** to the pattern_dictionary:
   - Doctrinal alignment patterns
   - Concept consistency across documents
   - Cross-reference bidirectionality
   - Index file presence verification

2. **Implement judgment processing**:
   - CLI to accept/decline continuations
   - Batch processing of multiple continuations
   - Agent integration (human/AI)

3. **Add attractor-based sampling**:
   - Once patterns are validated, use them to guide sampling
   - Adaptive sampling based on issue density
   - Convergence detection

## Architecture Notes

### IoC Principle

The scanner does NOT make semantic judgments itself. It:
1. Collects evidence (document properties, relationships)
2. Detects potential issues via patterns
3. Issues continuation packets when judgment is needed
4. Waits for external input (human or AI)
5. Resumes with judgment results

This allows the same scanner to work with:
- Human judgment (via CLI)
- AI agents (via API)
- Automated workflows (via scripts)

### File Location

The scanner lives in `cogentia/research/corpus-consistency/` alongside the user's corpus registry (`cogentia.json`), following the principle that corpus infrastructure belongs with corpus metadata.

For other users, this should be placed in their profile repository where their `cogentia.json` is located.

## Database Schema

Key tables:
- `documents` — All markdown files with metadata
- `document_sets` — Sampled document groups
- `document_set_members` — Set membership
- `issues` — Detected consistency issues
- `pattern_dictionary` — Pattern/anti-pattern registry
- `continuation_packets` — Pending judgment requests
- `runs` — Scan run history

Database: `.corpus-consistency.sqlite` (SQLite with Node.js built-in driver)
