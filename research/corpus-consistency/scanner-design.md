# Corpus Consistency Scanner — SQLite-Based Convergent Algorithm (Historical Design)

> **Status: superseded design exploration.** This proposal informed later consistency work but is
> not the current operational architecture. See [`scripts/cogentia.js`](../../scripts/cogentia.js)
> and [`docs/cogentia-index-layer.md`](../../docs/cogentia-index-layer.md) for the governed corpus
> and searchable-index implementation.

**Created:** 2026-07-09
**Purpose:** Incremental consistency checking with interrupt/resume capability
**Database:** `corpus-consistency.db`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SQLite Database                          │
├─────────────────────────────────────────────────────────────┤
│  documents │ samples │ issues │ attractors │ judgments │ runs │
└─────────────────────────────────────────────────────────────┘
         ↓                                            ↑
         │                                            │
    ┌────┴─────┐                              ┌──────┴──────┐
    │  Scanner │                              │    Reporter │
    │  Engine  │                              │   (Human)   │
    └──────────┘                              └─────────────┘
```

**Key property:** `consistency_score = f(compute_budget)` — more runs = better consistency

---

## Database Schema

```sql
-- Documents: Registry of all markdown files
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL UNIQUE,           -- Relative path from repo root
  repo TEXT NOT NULL,                   -- barons-Mariani, marenostrum, etc.
  full_path TEXT NOT NULL,              -- C:\tweesic\barons-Mariani\README.md
  lines INTEGER,                        -- Line count
  created_date TEXT,                    -- File creation timestamp
  modified_date TEXT,                   -- File modification timestamp
  size_bytes INTEGER,
  has_frontmatter BOOLEAN DEFAULT 0,
  document_role TEXT,                   -- From YAML if exists
  lifecycle_state TEXT,                 -- From YAML if exists
  last_stamped_at TEXT,                 -- From YAML if exists
  indexed_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  -- Consistency tracking
  checked_angle_a BOOLEAN DEFAULT 0,    -- File existence
  checked_angle_b BOOLEAN DEFAULT 0,    -- Frontmatter
  checked_angle_c BOOLEAN DEFAULT 0,    -- Cross-references
  checked_angle_d BOOLEAN DEFAULT 0,    -- Bidirectional
  checked_angle_e BOOLEAN DEFAULT 0,    -- Content
  checked_angle_f BOOLEAN DEFAULT 0,    -- Index
  
  consistency_score REAL DEFAULT 0.0,   -- 0.0 to 1.0
  last_checked_at TEXT,
  check_count INTEGER DEFAULT 0
);

CREATE INDEX idx_documents_repo ON documents(repo);
CREATE INDEX idx_documents_checked ON documents(checked_angle_a, checked_angle_b);
CREATE INDEX idx_documents_score ON documents(consistency_score);

-- Samples: Tracking which documents were sampled when
CREATE TABLE samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  phase TEXT NOT NULL,                   -- bootstrap | targeted | validation
  sampling_method TEXT NOT NULL,         -- random | attractor_guided | validation
  attractor_id INTEGER,                  -- NULL if random
  selected_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES runs(id),
  FOREIGN KEY (document_id) REFERENCES documents(id),
  FOREIGN KEY (attractor_id) REFERENCES attractors(id)
);

CREATE INDEX idx_samples_run ON samples(run_id);
CREATE INDEX idx_samples_document ON samples(document_id);

-- Issues: All inconsistencies found
CREATE TABLE issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  issue_type TEXT NOT NULL,              -- angle_a | angle_b | angle_c | angle_d | angle_e | angle_f
  severity TEXT NOT NULL,                -- P0 | P1 | P2 | P3
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,                        -- Line number or section
  pattern_signature TEXT,                -- For attractor matching
  
  -- Lifecycle
  status TEXT DEFAULT 'open',           -- open | confirmed | fixed | false_positive | retired
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TEXT,
  fixed_at TEXT,
  
  -- Attractor mapping
  attractor_id INTEGER,
  FOREIGN KEY (document_id) REFERENCES documents(id),
  FOREIGN KEY (attractor_id) REFERENCES attractors(id)
);

CREATE INDEX idx_issues_doc ON issues(document_id);
CREATE INDEX idx_issues_status ON issues(status, severity);
CREATE INDEX idx_issues_attractor ON issues(attractor_id);

-- Attractors: Pattern-based issue clusters (linked to pattern dictionary)
CREATE TABLE attractors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_id INTEGER NOT NULL,           -- FK to pattern_dictionary
  name TEXT NOT NULL,
  description TEXT,
  
  -- Runtime statistics (reset each run)
  weight REAL DEFAULT 0.5,               -- Probability of finding issue
  confidence REAL DEFAULT 0.5,           -- Confidence in this attractor
  samples_tested INTEGER DEFAULT 0,
  issues_found INTEGER DEFAULT 0,
  true_positives INTEGER DEFAULT 0,
  false_positives INTEGER DEFAULT 0,
  
  -- Lifecycle
  status TEXT DEFAULT 'active',           -- active | exhausted | retired | rejected
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (pattern_id) REFERENCES pattern_dictionary(id)
);

CREATE INDEX idx_attractors_status ON attractors(status, weight DESC);
CREATE INDEX idx_attractors_pattern ON attractors(pattern_id);

-- Pattern Dictionary: Master registry of all known patterns
CREATE TABLE pattern_dictionary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Identity
  slug TEXT NOT NULL UNIQUE,             -- machine-readable ID: missing-last-stamped-at
  canonical_name TEXT NOT NULL,           -- human-readable: Missing last_stamped_at field
  category TEXT NOT NULL,                 -- frontmatter | xref | content | path | structural
  
  -- Pattern definition
  condition_template TEXT,                -- Parameterized condition (e.g., "field='{field}' AND !{field}_at")
  condition_sql TEXT,                     -- Concrete SQL WHERE clause
  example_match TEXT,                     -- Example of matching document path
  example_nonmatch TEXT,                  -- Example of non-matching path
  
  -- Documentation
  description TEXT,                      -- What this pattern detects
  rationale TEXT,                        -- Why this is an issue
  fix_recommendation TEXT,                -- How to fix it
  severity_default TEXT DEFAULT 'P2',     -- Default severity for this pattern
  
  -- Lifecycle
  status TEXT DEFAULT 'draft',            -- draft | active | deprecated | retired
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_by_run_id INTEGER,              -- Which run discovered this pattern
  validated_at TEXT,                     -- When pattern was confirmed valid
  retired_at TEXT,                       -- When pattern was deprecated
  
  -- Relationships
  parent_pattern_id INTEGER,              -- If forked from another pattern
  merged_into_id INTEGER,                 -- If merged into another pattern
  fork_reason TEXT,                      -- Why this was forked
  merge_reason TEXT,                      -- Why this was merged
  
  FOREIGN KEY (created_by_run_id) REFERENCES runs(id),
  FOREIGN KEY (parent_pattern_id) REFERENCES pattern_dictionary(id),
  FOREIGN KEY (merged_into_id) REFERENCES pattern_dictionary(id)
);

CREATE INDEX idx_patterns_category ON pattern_dictionary(category, status);
CREATE INDEX idx_patterns_slug ON pattern_dictionary(slug);
CREATE INDEX idx_patterns_parent ON pattern_dictionary(parent_pattern_id);
CREATE INDEX idx_patterns_merged ON pattern_dictionary(merged_into_id);

-- Pattern Parameters: For parameterized patterns
CREATE TABLE pattern_parameters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_id INTEGER NOT NULL,
  param_name TEXT NOT NULL,
  param_type TEXT NOT NULL,               -- field | value | regex | date | number
  default_value TEXT,
  description TEXT,
  is_required BOOLEAN DEFAULT 1,
  
  FOREIGN KEY (pattern_id) REFERENCES pattern_dictionary(id)
);

-- Pattern Refinements: History of pattern evolution
CREATE TABLE pattern_refinements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_id INTEGER NOT NULL,
  run_id INTEGER NOT NULL,
  
  -- What changed
  change_type TEXT NOT NULL,              -- created | forked | merged | refined | validated | retired
  from_state TEXT,                       -- JSON of previous state
  to_state TEXT,                         -- JSON of new state
  condition_sql_before TEXT,
  condition_sql_after TEXT,
  
  -- Why it changed
  reason TEXT,
  judgment_id INTEGER,                   -- If from human judgment
  auto_refined BOOLEAN DEFAULT 0,        -- True if algorithm-detected refinement
  
  at_time TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (pattern_id) REFERENCES pattern_dictionary(id),
  FOREIGN KEY (run_id) REFERENCES runs(id),
  FOREIGN KEY (judgment_id) REFERENCES judgments(id)
);

CREATE INDEX idx_refinements_pattern ON pattern_refinements(pattern_id, at_time DESC);
CREATE INDEX idx_refinements_run ON pattern_refinements(run_id);

-- Pattern Validation: Track validation history
CREATE TABLE pattern_validations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_id INTEGER NOT NULL,
  run_id INTEGER NOT NULL,
  
  -- Validation metrics
  samples_validated INTEGER,
  true_positives INTEGER,
  false_positives INTEGER,
  true_negatives INTEGER,
  false_negatives INTEGER,
  
  -- Calculated metrics
  precision REAL,                        -- TP / (TP + FP)
  recall REAL,                           -- TP / (TP + FN)
  f1_score REAL,                         -- 2 * (precision * recall) / (precision + recall)
  
  validated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (pattern_id) REFERENCES pattern_dictionary(id),
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE INDEX idx_validations_pattern ON pattern_validations(pattern_id, validated_at DESC);

-- Pattern Synonyms: For pattern merging
CREATE TABLE pattern_synonyms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  canonical_pattern_id INTEGER NOT NULL,  -- The surviving pattern after merge
  synonym_pattern_id INTEGER NOT NULL,    -- The pattern that was merged
  merged_at TEXT DEFAULT CURRENT_TIMESTAMP,
  merged_by_run_id INTEGER,
  notes TEXT,
  
  FOREIGN KEY (canonical_pattern_id) REFERENCES pattern_dictionary(id),
  FOREIGN KEY (synonym_pattern_id) REFERENCES pattern_dictionary(id),
  FOREIGN KEY (merged_by_run_id) REFERENCES runs(id)
);

-- Judgment Batches: Group multiple judgments for efficient processing
CREATE TABLE judgment_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  batch_type TEXT NOT NULL,                -- pattern_refinement | issue_validation | merge_decision
  status TEXT DEFAULT 'pending',           -- pending | processing | completed | partial
  
  -- Agent configuration
  agent_type TEXT NOT NULL,                -- human | ai_claude | ai_gpt4 | ai_other
  agent_id TEXT,                          -- Agent identifier (session ID, model ID, etc.)
  agent_capability TEXT,                   -- What this agent can judge (pattern, content, xref, etc.)
  
  -- Batch configuration
  target_size INTEGER DEFAULT 5,          -- Desired batch size
  actual_size INTEGER DEFAULT 0,           -- Actual items in batch
  priority INTEGER DEFAULT 5,              -- 1-10, higher = more urgent
  
  -- Timing
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  dispatched_at TEXT,
  completed_at TEXT,
  timeout_at TEXT,                        -- When this batch times out
  
  -- Results
  total_items INTEGER DEFAULT 0,
  judged_items INTEGER DEFAULT 0,
  accepted_judgments INTEGER DEFAULT 0,
  rejected_judgments INTEGER DEFAULT 0,
  refined_judgments INTEGER DEFAULT 0,
  
  notes TEXT,
  
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

CREATE INDEX idx_batches_status ON judgment_batches(status, priority DESC);
CREATE INDEX idx_batches_agent ON judgment_batches(agent_type, status);
CREATE INDEX idx_batches_run ON judgment_batches(run_id);

-- Judgment Batch Items: Individual items within a batch
CREATE TABLE judgment_batch_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id INTEGER NOT NULL,
  item_type TEXT NOT NULL,                -- issue | pattern_create | pattern_merge | pattern_fork
  item_id INTEGER NOT NULL,               -- ID of the item (issue_id, pattern_id, etc.)
  
  -- Item details (cached for agent context)
  context_json TEXT,                      -- Serialized context for the agent
  question TEXT,
  options_json TEXT,                      -- Available options for this item
  
  -- Recommendation
  recommended_judgment TEXT,
  confidence REAL DEFAULT 0.5,
  
  -- Result
  judgment TEXT,                          -- From agent: valid | invalid | refine | etc.
  reasoning TEXT,                         -- Agent's reasoning
  judgment_made_at TEXT,
  agent_confidence REAL,                  -- Agent's confidence in their judgment
  
  -- Validation
  validated_at TEXT,
  validated_by TEXT,                      -- human | ai
  validation_notes TEXT,
  
  status TEXT DEFAULT 'pending',          -- pending | judged | validated | rejected | deferred
  sort_order INTEGER DEFAULT 0,          -- For ordering within batch
  
  FOREIGN KEY (batch_id) REFERENCES judgment_batches(id)
);

CREATE INDEX idx_batch_items_batch ON judgment_batch_items(batch_id, sort_order);
CREATE INDEX idx_batch_items_status ON judgment_batch_items(status);

-- Agent Registry: Track agent capabilities and performance
CREATE TABLE agent_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL UNIQUE,
  agent_type TEXT NOT NULL,               -- human | ai_claude | ai_gpt4 | ai_other
  agent_name TEXT,
  
  -- Capabilities
  can_judge_patterns BOOLEAN DEFAULT 0,
  can_judge_content BOOLEAN DEFAULT 0,
  can_judge_xref BOOLEAN DEFAULT 0,
  can_judge_frontmatter BOOLEAN DEFAULT 0,
  
  -- Performance tracking
  total_batches INTEGER DEFAULT 0,
  total_items_judged INTEGER DEFAULT 0,
  accepted_judgments INTEGER DEFAULT 0,
  rejected_judgments INTEGER DEFAULT 0,  -- Judgments later rejected/overridden
  avg_confidence REAL DEFAULT 0.5,
  
  -- Preferences
  preferred_batch_size INTEGER DEFAULT 5,
  max_batch_size INTEGER DEFAULT 10,
  specialized_categories TEXT,            -- Comma-separated categories this agent specializes in
  
  -- Availability
  is_available BOOLEAN DEFAULT 1,
  last_active_at TEXT,
  
  registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agents_type ON agent_registry(agent_type, is_available);

---

## Pattern Lifecycle Examples

### Example 1: Pattern Discovery (Automatic)

```
Run #5 finds 8 documents with missing last_stamped_at
→ Pattern dictionary entry created:
  {
    slug: "missing-last-stamped-at"
    canonical_name: "Missing last_stamped_at field"
    category: "frontmatter"
    condition_template: "document_role='{role}' AND !last_stamped_at"
    condition_sql: "document_role IN ('source', 'working-paper') AND last_stamped_at IS NULL"
    description: "Source documents should have last_stamped_at for traceability"
    status: "draft"
    created_by_run_id: 5
  }
→ Attractor created with link to pattern_id
```

### Example 2: Pattern Refinement (Human Judgment)

```
Judgment request: "barons-Mariani/research/agile.md is working draft, doesn't need stamp"
Human judgment: "Refine pattern - exclude working drafts"

→ Pattern refinement entry:
  {
    pattern_id: 1
    run_id: 6
    change_type: "refined"
    from_state: {"condition_sql": "...last_stamped_at IS NULL"}
    to_state: {"condition_sql": "...lifecycle_state != 'draft' AND last_stamped_at IS NULL"}
    reason: "Working drafts don't need stamps"
  }
→ Pattern updated, attractor weight recalculated
```

### Example 3: Pattern Forking

```
Pattern "missing-last-stamped-at" applies to both:
  - Source documents (high priority)
  - Draft documents (low priority)

→ Fork into two patterns:
  pattern_1a: "missing-stamp-source-docs" (P1 severity)
  pattern_1b: "missing-stamp-draft-docs" (P3 severity)

→ Pattern dictionary update:
  pattern_1a.parent_pattern_id = 1
  pattern_1b.parent_pattern_id = 1
  pattern_1.status = "deprecated" (forked, not retired)
  pattern_1a.status = "active"
  pattern_1b.status = "active"
```

### Example 4: Pattern Merging

```
Two similar patterns discovered independently:
  pattern_7: "missing-date-field" (found in barons-Mariani)
  pattern_12: "no-date-in-yaml" (found in marenostrum)

→ Human recognizes they're the same issue
→ Merge operation:
  {
    canonical_pattern_id: 7  # Keep pattern_7 (older)
    synonym_pattern_id: 12    # pattern_12 is now synonym
    merged_by_run_id: 15
    notes: "Same pattern, different naming"
  }
→ pattern_12.status = "retired"
→ All issues linked to pattern_12 migrated to pattern_7
```

---

## Pattern Operations

### Create Pattern (from issue clustering)

```python
def create_pattern_from_issues(issues, db, run_id):
    """
    When 3+ similar issues found, extract common pattern.
    """
    # Cluster issues by similarity
    clusters = cluster_by_similarity(issues)
    
    for cluster in clusters:
        if len(cluster) >= 3:
            # Extract common condition
            condition = extract_common_condition(cluster)
            
            pattern = {
                'slug': generate_slug(condition),
                'canonical_name': generate_name(condition),
                'category': infer_category(cluster),
                'condition_sql': condition,
                'example_match': cluster[0].document.path,
                'description': generate_description(cluster),
                'status': 'draft',
                'created_by_run_id': run_id
            }
            
            pattern_id = insert_pattern(db, pattern)
            link_issues_to_pattern(cluster, pattern_id, db)
            
            return pattern_id
```

### Fork Pattern

```python
def fork_pattern(pattern_id, fork_conditions, db, run_id, reason):
    """
    Split one pattern into multiple specialized patterns.
    """
    original = get_pattern(pattern_id, db)
    
    new_patterns = []
    for condition in fork_conditions:
        new_pattern = {
            'slug': f"{original.slug}-{condition['suffix']}",
            'canonical_name': f"{original.canonical_name}: {condition['name']}",
            'category': original.category,
            'condition_sql': condition['sql'],
            'description': original.description + f" ({condition['name']})",
            'severity_default': condition.get('severity', original.severity_default),
            'parent_pattern_id': pattern_id,
            'status': 'active',
            'created_by_run_id': run_id,
            'fork_reason': reason
        }
        
        new_id = insert_pattern(db, new_pattern)
        new_patterns.append(new_id)
        
        # Record refinement
        record_refinement(
            pattern_id, run_id, 'forked',
            from_state=original.condition_sql,
            to_state=condition['sql'],
            reason=reason,
            db=db
        )
    
    # Deprecate original (don't retire, it has children)
    update_pattern_status(pattern_id, 'deprecated', db)
    
    return new_patterns
```

### Merge Patterns

```python
def merge_patterns(source_id, target_id, db, run_id, reason):
    """
    Merge two patterns that are actually the same issue.
    """
    # Record synonym relationship
    insert_synonym({
        'canonical_pattern_id': target_id,
        'synonym_pattern_id': source_id,
        'merged_by_run_id': run_id,
        'notes': reason
    }, db)
    
    # Retire source pattern
    update_pattern_status(source_id, 'retired', db)
    
    # Migrate issues from source to target
    migrate_issues(source_id, target_id, db)
    
    # Merge conditions (if they differ, keep more specific one)
    source = get_pattern(source_id, db)
    target = get_pattern(target_id, db)
    if source.condition_sql != target.condition_sql:
        # Choose more specific (longer) condition
        if len(source.condition_sql) > len(target.condition_sql):
            update_pattern_condition(target_id, source.condition_sql, db)
    
    return target_id
```

### Refine Pattern

```python
def refine_pattern(pattern_id, refinement, db, run_id, judgment_id=None):
    """
    Update pattern based on feedback.
    
    refinement: {
        'condition_sql': new SQL,
        'severity': new severity,
        'reason': explanation
    }
    """
    pattern = get_pattern(pattern_id, db)
    
    # Record refinement
    record_refinement(
        pattern_id, run_id, 'refined',
        from_state=pattern.condition_sql,
        to_state=refinement['condition_sql'],
        reason=refinement['reason'],
        judgment_id=judgment_id,
        db=db
    )
    
    # Update pattern
    update_pattern(pattern_id, {
        'condition_sql': refinement['condition_sql'],
        'validated_at': CURRENT_TIMESTAMP if judgment_id else None
    }, db)
    
    # Recreate attractor with new condition
    recreate_attractor(pattern_id, db)
    
    return pattern_id
```

---

## Pattern Dictionary Query Examples

```sql
-- Find all active patterns by category
SELECT slug, canonical_name, condition_sql, description
FROM pattern_dictionary
WHERE status = 'active' AND category = 'frontmatter'
ORDER BY slug;

-- Find pattern history (all refinements)
SELECT p.slug, pr.change_type, pr.at_time, pr.reason
FROM pattern_dictionary p
JOIN pattern_refinements pr ON p.id = pr.pattern_id
WHERE p.slug = 'missing-last-stamped-at'
ORDER BY pr.at_time DESC;

-- Find all patterns forked from a parent
SELECT slug, canonical_name, fork_reason, created_at
FROM pattern_dictionary
WHERE parent_pattern_id = 1
ORDER BY created_at;

-- Find patterns needing validation (draft + >5 samples)
SELECT p.slug, p.description, a.samples_tested
FROM pattern_dictionary p
JOIN attractors a ON p.id = a.pattern_id
WHERE p.status = 'draft' AND a.samples_tested >= 5;

-- Find pattern family tree
WITH RECURSIVE family_tree AS (
  SELECT id, slug, parent_pattern_id, 0 as level
  FROM pattern_dictionary
  WHERE id = ?  -- Start with pattern ID
  
  UNION ALL
  
  SELECT p.id, p.slug, p.parent_pattern_id, ft.level + 1
  FROM pattern_dictionary p
  JOIN family_tree ft ON p.parent_pattern_id = ft.id
)
SELECT * FROM family_tree ORDER BY level, slug;
```

-- Judgments: Human decisions on ambiguous issues
CREATE TABLE judgments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  issue_id INTEGER NOT NULL,
  attractor_id INTEGER,
  judgment TEXT NOT NULL,                 -- valid | invalid | refine | defer
  reasoning TEXT,
  made_by TEXT DEFAULT 'human',
  made_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  -- For refinement
  refined_condition_sql TEXT,
  notes TEXT,
  
  FOREIGN KEY (issue_id) REFERENCES issues(id),
  FOREIGN KEY (attractor_id) REFERENCES attractors(id)
);

-- Runs: Session tracking for interrupt/resume
CREATE TABLE runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  phase TEXT DEFAULT 'bootstrap',
  samples_count INTEGER DEFAULT 0,
  issues_found INTEGER DEFAULT 0,
  issues_confirmed INTEGER DEFAULT 0,
  issues_fixed INTEGER DEFAULT 0,
  
  -- Convergence metrics
  new_findings_rate REAL DEFAULT 1.0,    -- Issues found / samples in this run
  convergence_score REAL DEFAULT 0.0,    -- 0.0 to 1.0, estimated completeness
  
  status TEXT DEFAULT 'running',         -- running | interrupted | completed | paused
  
  -- Configuration for this run
  sample_size INTEGER DEFAULT 37,
  target_rate REAL DEFAULT 0.05,         -- Stop when new_findings_rate < 5%
  
  notes TEXT
);

-- Database metadata
CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO meta (key, value) VALUES 
  ('schema_version', '1.0'),
  ('total_documents', '0'),
  ('total_issues', '0'),
  ('consistency_score', '0.0'),
  ('last_run_id', 'null');
```

---

## Algorithm: Adaptive Monte Carlo with Continuations

**Implementation:** Pure Node.js ESM (ES Modules), no Python

```javascript
// scanner.js
import Database from 'better-sqlite3';
import { readdir, stat, readFile } from 'fs/promises';
import { join, relative } from 'path';
import { glob } from 'glob';

/**
 * Corpus Consistency Scanner
 * Incremental consistency checking with interrupt/resume capability
 */

export class ConsistencyScanner {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
  }

  /**
   * Main scan function - can be interrupted and resumed
   * @returns {ContinuationPacket}
   */
  async scan(config = {}) {
    // Phase 1: Initialize or resume
    const run = this.createOrResumeRun(config);

    // Phase 2-7: Main scanning loop
    while (run.samplesCount < run.sampleSize) {
      // Select document based on current phase
      const doc = await this.selectDocument(run);
      
      // Check all angles
      const issues = await this.checkAllAngles(doc);
      
      // Process findings
      for (const issue of issues) {
        await this.processIssue(issue, run);
      }
      
      // Update tracking
      this.updateDocumentChecks(doc);
      run.samplesCount++;
      run.newFindingsRate = run.issuesFound / run.samplesCount;
      
      // Check for convergence/phase transition
      if (this.shouldTransitionPhase(run)) {
        this.transitionPhase(run);
      }
      
      // Check for ambiguous findings needing judgment
      if (this.hasAmbiguousIssues()) {
        run.status = 'paused';
        this.saveRun(run);
        return this.createContinuationPacket(run);
      }
      
      // Check for interrupt (via flag file or signal)
      if (this.isInterrupted()) {
        run.status = 'interrupted';
        this.saveRun(run);
        return this.createContinuationPacket(run);
      }
    }

    // Phase 9: Run complete
    run.status = 'completed';
    run.endedAt = new Date().toISOString();
    run.convergenceScore = this.calculateConvergence();
    this.saveRun(run);
    this.updateGlobalMetrics();

    return this.createReportPacket(run);
  }

  /**
   * Select next document based on phase and attractors
   */
  async selectDocument(run) {
    if (run.phase === 'bootstrap') {
      return await this.selectRandomUnchecked(run);
    } else if (run.phase === 'targeted') {
      return await this.selectByAttractor(run);
    } else if (run.phase === 'validation') {
      return await this.selectForValidation(run);
    }
  }

  /**
   * Select random unchecked document (bootstrap phase)
   */
  async selectRandomUnchecked(run) {
    const stmt = this.db.prepare(`
      SELECT id, path, repo, full_path
      FROM documents
      WHERE (checked_angle_a != 1 OR checked_angle_b != 1 OR 
             checked_angle_c != 1 OR checked_angle_d != 1 OR 
             checked_angle_e != 1 OR checked_angle_f != 1)
      ORDER BY RANDOM()
      LIMIT 1
    `);
    
    const doc = stmt.get();
    if (!doc) {
      // All documents checked, restart for consistency
      return await this.selectRandomUnchecked(run);
    }
    return doc;
  }

  /**
   * Select document based on active attractors (targeted phase)
   */
  async selectByAttractor(run) {
    // Get active attractors with weights
    const attractors = this.db.prepare(`
      SELECT a.id, a.weight, a.pattern_id, p.condition_sql
      FROM attractors a
      JOIN pattern_dictionary p ON a.pattern_id = p.id
      WHERE a.status = 'active'
      ORDER BY a.weight DESC
    `).all();

    if (attractors.length === 0) {
      return await this.selectRandomUnchecked(run);
    }

    // Weighted random selection
    const weights = attractors.map(a => a.weight);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let selected = attractors[0];
    
    for (const attractor of attractors) {
      random -= attractor.weight;
      if (random <= 0) {
        selected = attractor;
        break;
      }
    }

    // Find documents matching attractor's condition
    const conditionSql = selected.condition_sql
      .replace(/document_role/g, 'd.document_role')
      .replace(/last_stamped_at/g, 'd.last_stamped_at')
      .replace(/lifecycle_state/g, 'd.lifecycle_state');

    const docs = this.db.prepare(`
      SELECT d.id, d.path, d.repo, d.full_path
      FROM documents d
      WHERE ${conditionSql}
      AND (d.checked_angle_a != 1 OR d.checked_angle_b != 1 OR 
            d.checked_angle_c != 1 OR d.checked_angle_d != 1 OR 
            d.checked_angle_e != 1 OR d.checked_angle_f != 1)
    `).all();

    if (docs.length > 0) {
      return docs[Math.floor(Math.random() * docs.length)];
    }

    return await this.selectRandomUnchecked(run);
  }

  /**
   * Check all six consistency angles for a document
   */
  async checkAllAngles(doc) {
    const issues = [];
    
    // Angle A: File existence
    if (!await this.checkFileExists(doc)) {
      issues.push({
        documentId: doc.id,
        issueType: 'angle_a',
        severity: 'P0',
        title: 'File does not exist',
        description: `Referenced file not found: ${doc.full_path}`,
        patternSignature: 'file-not-found'
      });
    }

    // Read file content
    const content = await this.readFileContent(doc);
    if (!content) {
      return issues; // Can't check other angles if file unreadable
    }

    // Angle B: Frontmatter
    const frontmatterIssues = this.checkFrontmatter(doc, content);
    issues.push(...frontmatterIssues);

    // Angle C: Cross-references
    const xrefIssues = await this.checkCrossReferences(doc, content);
    issues.push(...xrefIssues);

    // Angle D: Bidirectional
    const bidiIssues = await this.checkBidirectional(doc, content);
    issues.push(...bidiIssues);

    // Angle E: Content
    const contentIssues = this.checkContent(doc, content);
    issues.push(...contentIssues);

    // Angle F: Index
    const indexIssues = await this.checkIndexPresence(doc);
    issues.push(...indexIssues);

    return issues;
  }

  /**
   * Check Angle B: Frontmatter completeness
   */
  checkFrontmatter(doc, content) {
    const issues = [];
    const frontmatter = this.extractFrontmatter(content);
    
    if (!frontmatter) {
      issues.push({
        documentId: doc.id,
        issueType: 'angle_b',
        severity: 'P2',
        title: 'Missing frontmatter',
        description: 'Document has no YAML frontmatter',
        location: 'line 1',
        patternSignature: 'missing-frontmatter'
      });
      return issues;
    }

    // Check for required fields based on document_role
    const requiredFields = {
      'source': ['last_stamped_at', 'canonical_url', 'license'],
      'working-paper': ['date', 'status'],
      'alias': ['redirect_to', 'canonical_document']
    };

    const docRole = frontmatter.document_role || frontmatter.corpus_role;
    if (docRole && requiredFields[docRole]) {
      for (const field of requiredFields[docRole]) {
        if (!frontmatter[field]) {
          issues.push({
            documentId: doc.id,
            issueType: 'angle_b',
            severity: docRole === 'source' ? 'P1' : 'P2',
            title: `Missing required field: ${field}`,
            description: `Document role '${docRole}' requires field '${field}'`,
            location: 'frontmatter',
            patternSignature: `missing-${field}`,
            context: { documentRole: docRole, field }
          });
        }
      }
    }

    return issues;
  }

  /**
   * Process a found issue - match to attractor or create new pattern
   */
  async processIssue(issue, run) {
    // Try to match existing pattern
    const pattern = this.matchPattern(issue);
    
    if (pattern) {
      issue.attractorId = pattern.id;
      this.updateAttractorStats(pattern.id, true);
    } else {
      // Check if this is a repeated pattern (3+ occurrences)
      const similarIssues = this.findSimilarIssues(issue);
      if (similarIssues.length >= 2) {
        // Create new pattern from cluster
        const patternId = await this.createPatternFromCluster([issue, ...similarIssues], run.id);
        issue.attractorId = patternId;
      } else {
        // Standalone issue, save without pattern
        issue.attractorId = null;
      }
    }

    // Save the issue
    this.saveIssue(issue, run);
    run.issuesFound++;
  }

  /**
   * Match issue to existing pattern
   */
  matchPattern(issue) {
    const stmt = this.db.prepare(`
      SELECT p.id, p.slug, p.condition_sql, a.weight, a.samples_tested
      FROM pattern_dictionary p
      JOIN attractors a ON p.id = a.pattern_id
      WHERE p.status = 'active'
      AND p.slug = ?
      LIMIT 1
    `);

    // Generate slug from pattern signature
    const slug = this.signatureToSlug(issue.patternSignature);
    return stmt.get(slug);
  }

  /**
   * Update attractor statistics
   */
  updateAttractorStats(attractorId, isTruePositive) {
    const stmt = this.db.prepare(`
      UPDATE attractors
      SET samples_tested = samples_tested + 1,
          true_positives = true_positives + ?,
          weight = (
            SELECT CASE 
              WHEN samples_tested < 5 THEN 0.5
              ELSE (true_positives * 1.0 / samples_tested)
            END
          )
      WHERE id = ?
    `);
    stmt.run(isTruePositive ? 1 : 0, attractorId);
  }

  /**
   * Check for phase transition
   */
  shouldTransitionPhase(run) {
    if (run.phase === 'bootstrap') {
      // Transition when we have 3+ active attractors
      const count = this.db.prepare(`
        SELECT COUNT(*) as count FROM attractors WHERE status = 'active'
      `).get().count;
      return count >= 3;
    } else if (run.phase === 'targeted') {
      // Transition when findings rate drops below target
      return run.newFindingsRate < run.targetRate;
    } else if (run.phase === 'validation') {
      // Transition when no open issues remain
      const count = this.db.prepare(`
        SELECT COUNT(*) as count FROM issues WHERE status = 'open'
      `).get().count;
      return count === 0;
    }
    return false;
  }

  /**
   * Calculate overall convergence score
   */
  calculateConvergence() {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM documents').get().count;
    const checked = this.db.prepare(`
      SELECT COUNT(*) as count FROM documents 
      WHERE checked_angle_a = 1 AND checked_angle_b = 1 
      AND checked_angle_c = 1 AND checked_angle_d = 1 
      AND checked_angle_e = 1 AND checked_angle_f = 1
    `).get().count;
    const docCoverage = checked / total;

    const active = this.db.prepare(`
      SELECT COUNT(*) as count FROM attractors WHERE status = 'active'
    `).get().count;
    const totalAttr = this.db.prepare(`
      SELECT COUNT(*) as count FROM attractors WHERE status != 'retired'
    `).get().count;
    const attrExhaustion = totalAttr > 0 ? 1 - (active / totalAttr) : 1;

    const recentRate = this.getRecentFindingsRate(20);
    const findingsConfidence = 1 - recentRate;

    return 0.4 * docCoverage + 0.3 * attrExhaustion + 0.3 * findingsConfidence;
  }

  /**
   * Get recent findings rate
   */
  getRecentFindingsRate(n) {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT document_id FROM samples 
        WHERE id > (SELECT MAX(id) - ? FROM samples)
      )
    `);
    const recentSamples = stmt.get(n).count;

    const findingStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT s.document_id) as count
      FROM samples s
      JOIN issues i ON s.document_id = i.document_id
      WHERE s.id > (SELECT MAX(id) - ? FROM samples)
      AND i.created_at > (
        SELECT selected_at FROM samples ORDER BY id DESC LIMIT 1 OFFSET ?
      )
    `);
    const recentFindings = findingStmt.get(n, n).count;

    return recentSamples > 0 ? recentFindings / recentSamples : 0;
  }

  /**
   * Extract frontmatter from markdown content
   */
  extractFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;

    try {
      // Simple YAML parser (for full parsing, use js-yaml)
      const lines = match[1].split('\n');
      const frontmatter = {};
      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();
          frontmatter[key] = value;
        }
      }
      return frontmatter;
    } catch (e) {
      return null;
    }
  }

  /**
   * Convert file path to relative path
   */
  getRelativePath(fullPath, repo) {
    const repoBase = join(process.cwd(), repo);
    return relative(repoBase, fullPath);
  }

  /**
   * Initialize database schema
   */
  initSchema() {
    this.db.exec(`
      -- Documents table
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL UNIQUE,
        repo TEXT NOT NULL,
        full_path TEXT NOT NULL,
        lines INTEGER,
        created_date TEXT,
        modified_date TEXT,
        size_bytes INTEGER,
        has_frontmatter BOOLEAN DEFAULT 0,
        document_role TEXT,
        lifecycle_state TEXT,
        last_stamped_at TEXT,
        indexed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        checked_angle_a BOOLEAN DEFAULT 0,
        checked_angle_b BOOLEAN DEFAULT 0,
        checked_angle_c BOOLEAN DEFAULT 0,
        checked_angle_d BOOLEAN DEFAULT 0,
        checked_angle_e BOOLEAN DEFAULT 0,
        checked_angle_f BOOLEAN DEFAULT 0,
        consistency_score REAL DEFAULT 0.0,
        last_checked_at TEXT,
        check_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_documents_repo ON documents(repo);
      CREATE INDEX IF NOT EXISTS idx_documents_checked ON documents(checked_angle_a, checked_angle_b);
      CREATE INDEX IF NOT EXISTS idx_documents_score ON documents(consistency_score);

      -- Samples table
      CREATE TABLE IF NOT EXISTS samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        document_id INTEGER NOT NULL,
        phase TEXT NOT NULL,
        sampling_method TEXT NOT NULL,
        attractor_id INTEGER,
        selected_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES runs(id),
        FOREIGN KEY (document_id) REFERENCES documents(id),
        FOREIGN KEY (attractor_id) REFERENCES attractors(id)
      );

      CREATE INDEX IF NOT EXISTS idx_samples_run ON samples(run_id);
      CREATE INDEX IF NOT EXISTS idx_samples_document ON samples(document_id);

      -- Issues table
      CREATE TABLE IF NOT EXISTS issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        issue_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        location TEXT,
        pattern_signature TEXT,
        status TEXT DEFAULT 'open',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TEXT,
        fixed_at TEXT,
        attractor_id INTEGER,
        FOREIGN KEY (document_id) REFERENCES documents(id),
        FOREIGN KEY (attractor_id) REFERENCES attractors(id)
      );

      CREATE INDEX IF NOT EXISTS idx_issues_doc ON issues(document_id);
      CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status, severity);
      CREATE INDEX IF NOT EXISTS idx_issues_attractor ON issues(attractor_id);

      -- Attractors table
      CREATE TABLE IF NOT EXISTS attractors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        weight REAL DEFAULT 0.5,
        confidence REAL DEFAULT 0.5,
        samples_tested INTEGER DEFAULT 0,
        issues_found INTEGER DEFAULT 0,
        true_positives INTEGER DEFAULT 0,
        false_positives INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pattern_id) REFERENCES pattern_dictionary(id)
      );

      CREATE INDEX IF NOT EXISTS idx_attractors_status ON attractors(status, weight DESC);
      CREATE INDEX IF NOT EXISTS idx_attractors_pattern ON attractors(pattern_id);

      -- Pattern Dictionary table
      CREATE TABLE IF NOT EXISTS pattern_dictionary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        canonical_name TEXT NOT NULL,
        category TEXT NOT NULL,
        condition_template TEXT,
        condition_sql TEXT,
        example_match TEXT,
        example_nonmatch TEXT,
        description TEXT,
        rationale TEXT,
        fix_recommendation TEXT,
        severity_default TEXT DEFAULT 'P2',
        status TEXT DEFAULT 'draft',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_by_run_id INTEGER,
        validated_at TEXT,
        retired_at TEXT,
        parent_pattern_id INTEGER,
        merged_into_id INTEGER,
        fork_reason TEXT,
        merge_reason TEXT,
        FOREIGN KEY (created_by_run_id) REFERENCES runs(id),
        FOREIGN KEY (parent_pattern_id) REFERENCES pattern_dictionary(id),
        FOREIGN KEY (merged_into_id) REFERENCES pattern_dictionary(id)
      );

      CREATE INDEX IF NOT EXISTS idx_patterns_category ON pattern_dictionary(category, status);
      CREATE INDEX IF NOT EXISTS idx_patterns_slug ON pattern_dictionary(slug);
      CREATE INDEX IF NOT EXISTS idx_patterns_parent ON pattern_dictionary(parent_pattern_id);

      -- Pattern Refinements table
      CREATE TABLE IF NOT EXISTS pattern_refinements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_id INTEGER NOT NULL,
        run_id INTEGER NOT NULL,
        change_type TEXT NOT NULL,
        from_state TEXT,
        to_state TEXT,
        condition_sql_before TEXT,
        condition_sql_after TEXT,
        reason TEXT,
        judgment_id INTEGER,
        auto_refined BOOLEAN DEFAULT 0,
        at_time TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pattern_id) REFERENCES pattern_dictionary(id),
        FOREIGN KEY (run_id) REFERENCES runs(id),
        FOREIGN KEY (judgment_id) REFERENCES judgments(id)
      );

      CREATE INDEX IF NOT EXISTS idx_refinements_pattern ON pattern_refinements(pattern_id, at_time DESC);

      -- Pattern Validations table
      CREATE TABLE IF NOT EXISTS pattern_validations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern_id INTEGER NOT NULL,
        run_id INTEGER NOT NULL,
        samples_validated INTEGER,
        true_positives INTEGER,
        false_positives INTEGER,
        precision REAL,
        recall REAL,
        f1_score REAL,
        validated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pattern_id) REFERENCES pattern_dictionary(id),
        FOREIGN KEY (run_id) REFERENCES runs(id)
      );

      -- Judgments table
      CREATE TABLE IF NOT EXISTS judgments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        issue_id INTEGER NOT NULL,
        attractor_id INTEGER,
        pattern_id INTEGER,
        judgment TEXT NOT NULL,
        reasoning TEXT,
        made_by TEXT DEFAULT 'human',
        made_at TEXT DEFAULT CURRENT_TIMESTAMP,
        refined_condition_sql TEXT,
        notes TEXT,
        FOREIGN KEY (issue_id) REFERENCES issues(id),
        FOREIGN KEY (attractor_id) REFERENCES attractors(id),
        FOREIGN KEY (pattern_id) REFERENCES pattern_dictionary(id)
      );

      -- Runs table
      CREATE TABLE IF NOT EXISTS runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        ended_at TEXT,
        phase TEXT DEFAULT 'bootstrap',
        samples_count INTEGER DEFAULT 0,
        issues_found INTEGER DEFAULT 0,
        issues_confirmed INTEGER DEFAULT 0,
        issues_fixed INTEGER DEFAULT 0,
        new_findings_rate REAL DEFAULT 1.0,
        convergence_score REAL DEFAULT 0.0,
        status TEXT DEFAULT 'running',
        sample_size INTEGER DEFAULT 37,
        target_rate REAL DEFAULT 0.05,
        notes TEXT
      );

      -- Meta table
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      INSERT OR IGNORE INTO meta (key, value) VALUES 
        ('schema_version', '1.0'),
        ('consistency_score', '0.0');
    `);
  }
}

export default ConsistencyScanner;

/**
 * Judgment Batching Manager
 * Groups ambiguous issues into batches for efficient agent processing
 */
export class JudgmentBatcher {
  constructor(db) {
    this.db = db;
    this.initSchema();
  }

  /**
   * Initialize batch-specific schema
   */
  initSchema() {
    this.db.exec(`
      -- Judgment Batches table
      CREATE TABLE IF NOT EXISTS judgment_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        batch_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        agent_type TEXT NOT NULL,
        agent_id TEXT,
        agent_capability TEXT,
        target_size INTEGER DEFAULT 5,
        actual_size INTEGER DEFAULT 0,
        priority INTEGER DEFAULT 5,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        dispatched_at TEXT,
        completed_at TEXT,
        timeout_at TEXT,
        total_items INTEGER DEFAULT 0,
        judged_items INTEGER DEFAULT 0,
        accepted_judgments INTEGER DEFAULT 0,
        rejected_judgments INTEGER DEFAULT 0,
        refined_judgments INTEGER DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (run_id) REFERENCES runs(id)
      );

      CREATE INDEX IF NOT EXISTS idx_batches_status ON judgment_batches(status, priority DESC);
      CREATE INDEX IF NOT EXISTS idx_batches_agent ON judgment_batches(agent_type, status);
      CREATE INDEX IF NOT EXISTS idx_batches_run ON judgment_batches(run_id);

      -- Judgment Batch Items table
      CREATE TABLE IF NOT EXISTS judgment_batch_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER NOT NULL,
        item_type TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        context_json TEXT,
        question TEXT,
        options_json TEXT,
        recommended_judgment TEXT,
        confidence REAL DEFAULT 0.5,
        judgment TEXT,
        reasoning TEXT,
        judgment_made_at TEXT,
        agent_confidence REAL,
        validated_at TEXT,
        validated_by TEXT,
        validation_notes TEXT,
        status TEXT DEFAULT 'pending',
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (batch_id) REFERENCES judgment_batches(id)
      );

      CREATE INDEX IF NOT EXISTS idx_batch_items_batch ON judgment_batch_items(batch_id, sort_order);
      CREATE INDEX IF NOT EXISTS idx_batch_items_status ON judgment_batch_items(status);

      -- Agent Registry table
      CREATE TABLE IF NOT EXISTS agent_registry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL UNIQUE,
        agent_type TEXT NOT NULL,
        agent_name TEXT,
        can_judge_patterns BOOLEAN DEFAULT 0,
        can_judge_content BOOLEAN DEFAULT 0,
        can_judge_xref BOOLEAN DEFAULT 0,
        can_judge_frontmatter BOOLEAN DEFAULT 0,
        total_batches INTEGER DEFAULT 0,
        total_items_judged INTEGER DEFAULT 0,
        accepted_judgments INTEGER DEFAULT 0,
        rejected_judgments INTEGER DEFAULT 0,
        avg_confidence REAL DEFAULT 0.5,
        preferred_batch_size INTEGER DEFAULT 5,
        max_batch_size INTEGER DEFAULT 10,
        specialized_categories TEXT,
        is_available BOOLEAN DEFAULT 1,
        last_active_at TEXT,
        registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_agents_type ON agent_registry(agent_type, is_available);
    `);
  }

  /**
   * Create a new batch for pending judgments
   * @param {Object} config - Batch configuration
   * @returns {number} Batch ID
   */
  createBatch(config) {
    const {
      runId,
      batchType = 'issue_validation',
      agentType = 'human',  // or 'ai_claude', 'ai_gpt4'
      agentId = null,
      targetSize = 5,
      priority = 5
    } = config;

    const stmt = this.db.prepare(`
      INSERT INTO judgment_batches (
        run_id, batch_type, agent_type, agent_id,
        target_size, priority, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `);

    const result = stmt.run(runId, batchType, agentType, agentId, targetSize, priority);
    return result.lastInsertRowid;
  }

  /**
   * Add an item to a batch
   * @param {number} batchId - Batch ID
   * @param {Object} item - Item to add
   */
  addItemToBatch(batchId, item) {
    const {
      itemType,
      itemId,
      context,
      question,
      options,
      recommendedJudgment,
      confidence = 0.5,
      sortOrder = 0
    } = item;

    const stmt = this.db.prepare(`
      INSERT INTO judgment_batch_items (
        batch_id, item_type, item_id, context_json,
        question, options_json, recommended_judgment,
        confidence, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      batchId, itemType, itemId,
      JSON.stringify(context), question,
      JSON.stringify(options), recommendedJudgment,
      confidence, sortOrder
    );

    // Update batch size
    this.db.prepare(`
      UPDATE judgment_batches
      SET actual_size = actual_size + 1,
          total_items = total_items + 1
      WHERE id = ?
    `).run(batchId);
  }

  /**
   * Collect pending issues into batches based on similarity and priority
   * @param {number} runId - Current run ID
   * @param {Object} config - Batching configuration
   * @returns {Array<number>} Created batch IDs
   */
  collectPendingIntoBatches(runId, config = {}) {
    const {
      targetSize = 5,
      agentType = 'human',
      groupByPattern = true,  // Group items by pattern signature
      maxBatches = 3  // Maximum batches to create per call
    } = config;

    // Get pending issues
    let issues;
    if (groupByPattern) {
      // Group by pattern signature for coherent batches
      issues = this.db.prepare(`
        SELECT i.id, i.issue_type, i.severity, i.title, 
               i.description, i.pattern_signature, i.context,
               d.path, d.repo, p.slug as pattern_slug
        FROM issues i
        JOIN documents d ON i.document_id = d.id
        LEFT JOIN attractors a ON i.attractor_id = a.id
        LEFT JOIN pattern_dictionary p ON a.pattern_id = p.id
        WHERE i.status = 'open'
        AND i.id NOT IN (
          SELECT item_id FROM judgment_batch_items 
          WHERE item_type = 'issue' AND status != 'deferred'
        )
        ORDER BY 
          CASE i.severity
            WHEN 'P0' THEN 1
            WHEN 'P1' THEN 2
            WHEN 'P2' THEN 3
            ELSE 4
          END,
          p.slug NULLS LAST,
          i.id
        LIMIT ?
      `).all(targetSize * maxBatches);
    } else {
      issues = this.db.prepare(`
        SELECT i.id, i.issue_type, i.severity, i.title,
               i.description, i.pattern_signature,
               d.path, d.repo
        FROM issues i
        JOIN documents d ON i.document_id = d.id
        WHERE i.status = 'open'
        AND i.id NOT IN (
          SELECT item_id FROM judgment_batch_items
          WHERE item_type = 'issue' AND status != 'deferred'
        )
        ORDER BY 
          CASE i.severity
            WHEN 'P0' THEN 1
            WHEN 'P1' THEN 2
            WHEN 'P2' THEN 3
            ELSE 4
          END
        LIMIT ?
      `).all(targetSize * maxBatches);
    }

    // Group issues into batches
    const batches = [];
    let currentBatch = null;
    let currentItems = [];

    for (const issue of issues) {
      if (!currentBatch || currentItems.length >= targetSize) {
        // Start new batch if group changed or target size reached
        if (currentItems.length > 0) {
          batches.push({ batch: currentBatch, items: currentItems });
        }
        currentBatch = this.createBatch({
          runId,
          batchType: 'issue_validation',
          agentType,
          targetSize,
          priority: this.severityToPriority(issue.severity)
        });
        currentItems = [];
      }

      currentItems.push({
        itemType: 'issue',
        itemId: issue.id,
        context: {
          document: `${issue.repo}/${issue.path}`,
          issue: issue.title,
          description: issue.description,
          severity: issue.severity,
          pattern: issue.pattern_slug || issue.pattern_signature
        },
        question: `Is this a valid ${issue.severity} issue?`,
        options: [
          { value: 'valid', label: 'Valid - fix required' },
          { value: 'invalid', label: 'False positive - not an issue' },
          { value: 'defer', label: 'Defer - decide later' }
        ],
        recommendedJudgment: this.recommendJudgment(issue),
        confidence: 0.6,
        sortOrder: currentItems.length
      });
    }

    // Add last batch
    if (currentItems.length > 0) {
      batches.push({ batch: currentBatch, items: currentItems });
    }

    // Insert all items into their batches
    const batchIds = [];
    for (const { batch, items } of batches) {
      for (const item of items) {
        this.addItemToBatch(batch, item);
      }
      batchIds.push(batch);
    }

    return batchIds;
  }

  /**
   * Dispatch batch to agent (human or AI)
   * @param {number} batchId - Batch ID
   * @returns {Object} Continuation packet with batch context
   */
  dispatchBatch(batchId) {
    // Update batch status
    this.db.prepare(`
      UPDATE judgment_batches
      SET status = 'processing', dispatched_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(batchId);

    // Get batch with items
    const batch = this.db.prepare(`
      SELECT b.*, a.agent_name, a.preferred_batch_size
      FROM judgment_batches b
      LEFT JOIN agent_registry a ON b.agent_id = a.agent_id
      WHERE b.id = ?
    `).get(batchId);

    const items = this.db.prepare(`
      SELECT id, item_type, item_id, context_json, 
             question, options_json, recommended_judgment,
             confidence, sort_order
      FROM judgment_batch_items
      WHERE batch_id = ? AND status = 'pending'
      ORDER BY sort_order
    `).all(batchId);

    // Parse JSON fields
    const parsedItems = items.map(item => ({
      ...item,
      context: JSON.parse(item.context_json),
      options: JSON.parse(item.options_json)
    }));

    // Create continuation packet
    return {
      packet_type: 'judgment_batch',
      batch_id: batchId,
      batch_type: batch.batch_type,
      agent_type: batch.agent_type,
      agent_id: batch.agent_id,
      target_size: batch.target_size,
      actual_size: batch.actual_size,
      priority: batch.priority,
      created_at: batch.created_at,
      timeout_at: this.calculateTimeout(batch),
      items: parsedItems,
      summary: this.generateBatchSummary(batch, parsedItems)
    };
  }

  /**
   * Process judgments returned from agent
   * @param {number} batchId - Batch ID
   * @param {Array<Object>} judgments - Agent's judgments
   * @param {string} agentId - Agent who made judgments
   * @param {string} agentConfidence - Agent's overall confidence
   */
  processJudgments(batchId, judgments, agentId, agentConfidence = 0.8) {
    const batch = this.db.prepare('SELECT * FROM judgment_batches WHERE id = ?').get(batchId);
    
    let acceptedCount = 0;
    let rejectedCount = 0;
    let refinedCount = 0;

    for (const judgment of judgments) {
      const { itemId, judgment: j, reasoning, confidence } = judgment;

      // Update batch item
      this.db.prepare(`
        UPDATE judgment_batch_items
        SET judgment = ?,
            reasoning = ?,
            agent_confidence = ?,
            judgment_made_at = CURRENT_TIMESTAMP,
            status = 'judged'
        WHERE id = ?
      `).run(j, reasoning, confidence, itemId);

      // Update corresponding issue/pattern based on judgment
      const item = this.db.prepare('SELECT * FROM judgment_batch_items WHERE id = ?').get(itemId);
      
      if (item.item_type === 'issue') {
        if (j === 'valid') {
          this.db.prepare(`
            UPDATE issues SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(item.item_id);
          acceptedCount++;
        } else if (j === 'invalid') {
          this.db.prepare(`
            UPDATE issues SET status = 'false_positive'
            WHERE id = ?
          `).run(item.item_id);
          rejectedCount++;
        } else if (j === 'defer') {
          // Keep as open, remove from batch consideration
          this.db.prepare(`
            UPDATE judgment_batch_items SET status = 'deferred' WHERE id = ?
          `).run(itemId);
        }
      } else if (item.item_type === 'pattern_create') {
        if (j === 'valid') {
          this.activatePattern(item.item_id);
          acceptedCount++;
        } else if (j === 'invalid') {
          this.rejectPattern(item.item_id);
          rejectedCount++;
        }
      }
    }

    // Update batch statistics
    this.db.prepare(`
      UPDATE judgment_batches
      SET judged_items = judged_items + ?,
          accepted_judgments = accepted_judgments + ?,
          rejected_judgments = rejected_judgments + ?,
          refined_judgments = refined_judgments + ?,
          status = CASE 
            WHEN judged_items + ? >= total_items THEN 'completed'
            ELSE 'processing'
          END,
          completed_at = CASE 
            WHEN judged_items + ? >= total_items THEN CURRENT_TIMESTAMP
            ELSE completed_at
          END
      WHERE id = ?
    `).run(
      judgments.length, acceptedCount, rejectedCount, refinedCount,
      judgments.length, judgments.length, batchId
    );

    // Update agent stats
    this.updateAgentStats(agentId, judgments.length, acceptedCount, rejectedCount, agentConfidence);

    // Tune batch size based on results
    this.tuneBatchSize(batch.agent_type, batch.target_size, judgments.length, acceptedCount);
  }

  /**
   * Tune batch size based on agent performance
   * Uses adaptive approach: increase if high acceptance, decrease if low
   */
  tuneBatchSize(agentType, currentSize, itemsProcessed, acceptedCount) {
    const acceptanceRate = itemsProcessed > 0 ? acceptedCount / itemsProcessed : 0.5;

    let newSize = currentSize;
    if (acceptanceRate > 0.8 && currentSize < 10) {
      // High acceptance, increase batch size
      newSize = Math.min(10, currentSize + 1);
    } else if (acceptanceRate < 0.5 && currentSize > 3) {
      // Low acceptance, decrease batch size
      newSize = Math.max(3, currentSize - 1);
    }

    if (newSize !== currentSize) {
      // Update agent registry with new preferred size
      this.db.prepare(`
        UPDATE agent_registry
        SET preferred_batch_size = ?, updated_at = CURRENT_TIMESTAMP
        WHERE agent_type = ?
      `).run(newSize, agentType);
    }
  }

  /**
   * Update agent statistics
   */
  updateAgentStats(agentId, itemsJudged, accepted, rejected, confidence) {
    const agent = this.db.prepare('SELECT * FROM agent_registry WHERE agent_id = ?').get(agentId);

    if (agent) {
      const newTotal = agent.total_items_judged + itemsJudged;
      const newAvgConfidence = (
        (agent.avg_confidence * agent.total_items_judged) + (confidence * itemsJudged)
      ) / newTotal;

      this.db.prepare(`
        UPDATE agent_registry
        SET total_items_judged = ?,
            accepted_judgments = accepted_judgments + ?,
            rejected_judgments = rejected_judgments + ?,
            avg_confidence = ?,
            last_active_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE agent_id = ?
      `).run(newTotal, accepted, rejected, newAvgConfidence, agentId);
    } else {
      // Register new agent
      this.db.prepare(`
        INSERT INTO agent_registry (
          agent_id, agent_type, agent_name,
          total_items_judged, accepted_judgments, rejected_judgments,
          avg_confidence, last_active_at
        ) VALUES (?, ?, 'Agent', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(agentId, agentId, itemsJudged, accepted, rejected, confidence);
    }
  }

  /**
   * Get next pending batch for processing
   */
  getNextBatch(agentType = null) {
    const stmt = this.db.prepare(`
      SELECT b.* FROM judgment_batches b
      WHERE b.status = 'pending'
      AND (b.agent_type = ? OR ? IS NULL)
      AND (b.timeout_at IS NULL OR b.timeout_at > CURRENT_TIMESTAMP)
      ORDER BY b.priority DESC, b.created_at ASC
      LIMIT 1
    `);
    return stmt.get(agentType, agentType);
  }

  /**
   * Calculate timeout for batch based on agent type and size
   */
  calculateTimeout(batch) {
    const baseTimeout = {
      'human': 3600000,      // 1 hour
      'ai_claude': 300000,   // 5 minutes
      'ai_gpt4': 300000,     // 5 minutes
      'ai_other': 600000     // 10 minutes
    }[batch.agent_type] || 600000;

    // Scale with batch size
    const timeout = baseTimeout * (1 + (batch.actual_size / 10));
    return new Date(Date.now() + timeout).toISOString();
  }

  /**
   * Generate human-readable batch summary
   */
  generateBatchSummary(batch, items) {
    const bySeverity = items.reduce((acc, item) => {
      const sev = item.context.severity || 'P3';
      acc[sev] = (acc[sev] || 0) + 1;
      return acc;
    }, {});

    const byPattern = items.reduce((acc, item) => {
      const pattern = item.context.pattern || 'unclassified';
      acc[pattern] = (acc[pattern] || 0) + 1;
      return acc;
    }, {});

    return {
      total: items.length,
      severity_breakdown: bySeverity,
      pattern_breakdown: byPattern,
      recommended_batch_size: this.calculateRecommendedSize(batch.agent_type, items.length),
      estimated_time: this.estimateProcessingTime(batch.agent_type, items.length)
    };
  }

  /**
   * Calculate recommended batch size based on agent performance history
   */
  calculateRecommendedSize(agentType, itemCount) {
    const agent = this.db.prepare(`
      SELECT preferred_batch_size, avg_confidence
      FROM agent_registry
      WHERE agent_type = ? AND is_available = 1
      ORDER BY avg_confidence DESC
      LIMIT 1
    `).get(agentType);

    if (agent) {
      return Math.min(agent.preferred_batch_size, itemCount);
    }

    // Default sizes by type
    const defaults = {
      'human': 5,
      'ai_claude': 10,
      'ai_gpt4': 10,
      'ai_other': 8
    };

    return defaults[agentType] || 5;
  }

  /**
   * Estimate processing time for batch
   */
  estimateProcessingTime(agentType, itemCount) {
    const perItemTime = {
      'human': 60,      // 1 minute per item
      'ai_claude': 10,  // 10 seconds per item
      'ai_gpt4': 10,
      'ai_other': 15
    }[agentType] || 30;

    return `${perItemTime * itemCount} seconds (${Math.ceil(perItemTime * itemCount / 60)} minutes)`;
  }

  /**
   * Convert severity to priority (1-10, higher = more urgent)
   */
  severityToPriority(severity) {
    const map = { 'P0': 10, 'P1': 8, 'P2': 5, 'P3': 3 };
    return map[severity] || 5;
  }

  /**
   * Recommend judgment for an issue
   */
  recommendJudgment(issue) {
    // Simple heuristic: if pattern exists and validated, recommend valid
    if (issue.pattern_slug && issue.confidence > 0.7) {
      return 'valid';
    }
    return 'defer';  // Default to defer when uncertain
  }

  /**
   * Register or update agent
   */
  registerAgent(agent) {
    const {
      agentId,
      agentType,
      agentName,
      capabilities = {},
      preferences = {}
    } = agent;

    const existing = this.db.prepare('SELECT id FROM agent_registry WHERE agent_id = ?').get(agentId);

    if (existing) {
      this.db.prepare(`
        UPDATE agent_registry
        SET agent_name = COALESCE(?, agent_name),
            is_available = 1,
            last_active_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE agent_id = ?
      `).run(agentName, agentId);
    } else {
      this.db.prepare(`
        INSERT INTO agent_registry (
          agent_id, agent_type, agent_name,
          can_judge_patterns, can_judge_content, 
          can_judge_xref, can_judge_frontmatter,
          preferred_batch_size, max_batch_size,
          registered_at, last_active_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        agentId, agentType, agentName,
        capabilities.patterns || false,
        capabilities.content || false,
        capabilities.xref || false,
        capabilities.frontmatter || false,
        preferences.batchSize || 5,
        preferences.maxBatchSize || 10
      );
    }
  }

  /**
   * Activate a pattern from draft status
   */
  activatePattern(patternId) {
    this.db.prepare(`
      UPDATE pattern_dictionary
      SET status = 'active', validated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(patternId);
  }

  /**
   * Reject a pattern
   */
  rejectPattern(patternId) {
    this.db.prepare(`
      UPDATE pattern_dictionary
      SET status = 'rejected', retired_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(patternId);
  }
}

export { JudgmentBatcher };
    """
    Incremental consistency scanner. Can be interrupted and resumed.
    
    Each call:
    1. Loads current state from DB
    2. Selects samples based on current attractors
    3. Checks documents for issues
    4. Updates attractors based on findings
    5. Writes results to DB
    6. Returns continuation packet
    
    Properties:
    - Monotonic: consistency_score never decreases
    - Convergent: new_findings_rate decreases over time
    - Interruptible: can stop after any sample
    - Resumable: next call continues from where left off
    """
    
    # Phase 1: Initialize or resume
    db = sqlite3.connect(db_path)
    run = create_or_resume_run(db, config)
    
    # Phase 2: Select samples (guided by current attractors)
    while run.samples_count < run.sample_size:
        # Phase 2a: Bootstrap phase (random sampling)
        if run.phase == 'bootstrap':
            doc = select_random_unchecked(db, run)
            
        # Phase 2b: Targeted phase (attractor-guided)
        elif run.phase == 'targeted':
            doc = select_by_attractor(db, run)
            
        # Phase 2c: Validation phase (check previous findings)
        elif run.phase == 'validation':
            doc = select_for_validation(db, run)
        
        # Phase 3: Check document
        issues = check_all_angles(doc, db)
        
        # Phase 4: Record findings
        for issue in issues:
            # Check if issue matches known attractor
            attractor = match_attractor(issue, db)
            if attractor:
                issue.attractor_id = attractor.id
                attractor.samples_tested += 1
                if issue.status == 'confirmed':
                    attractor.issues_found += 1
                    attractor.true_positives += 1
                else:
                    attractor.false_positives += 1
                update_attractor_weight(attractor, db)
            else:
                # New pattern - create new attractor if multiple occurrences
                if is_repeated_pattern(issue, db):
                    attractor = create_attractor_from_issue(issue, db)
                    issue.attractor_id = attractor.id
            
            save_issue(issue, db)
            run.issues_found += 1
        
        # Phase 5: Update document and run
        update_document_checks(doc, db)
        run.samples_count += 1
        run.new_findings_rate = run.issues_found / run.samples_count
        
        # Phase 6: Check for convergence
        if should_transition_phase(run, db):
            run = transition_phase(run, db)
        
        # Phase 7: Check for judgment requests
        if has_ambiguous_issues(db):
            # Issue continuation for human judgment
            return create_continuation_packet(run, db)
        
        # Phase 8: Check for interrupt
        if is_interrupted():
            run.status = 'interrupted'
            save_run(run, db)
            return create_continuation_packet(run, db)
    
    # Phase 9: Run complete
    run.status = 'completed'
    run.ended_at = now()
    run.convergence_score = calculate_convergence(db)
    save_run(run, db)
    update_global_metrics(db)
    
    return create_report_packet(run, db)


def select_by_attractor(db, run):
    """
    Select next document based on active attractors.
    
    Uses weighted random selection:
    - Higher weight = more likely to be selected
    - Weight updated based on true_positive rate
    
    This is Metropolis-Hastings adaptation:
    - Exploit: Sample from high-weight attractors
    - Explore: Occasionally sample from low-weight or random
    """
    active = get_active_attractors(db)
    if not active:
        return select_random_unchecked(db, run)
    
    # Weighted random selection
    weights = [a.weight for a in active]
    selected = random.choices(active, weights=weights)[0]
    
    # Find documents matching attractor's condition
    docs = execute_attractor_query(selected, db)
    unchecked = [d for d in docs if not fully_checked(d)]
    
    return random.choice(unchecked) if unchecked else select_random_unchecked(db, run)


def update_attractor_weight(attractor, db):
    """
    Update attractor weight based on recent findings.
    
    Weight = P(issue | attractor)
    - If true_positive rate high: increase weight
    - If false_positive rate high: decrease weight
    - If exhausted: mark as exhausted
    """
    if attractor.samples_tested < 5:
        return  # Need more data
    
    tpr = attractor.true_positives / attractor.samples_tested
    fpr = attractor.false_positives / attractor.samples_tested
    
    # Update weight (exponential moving average)
    alpha = 0.3  # Learning rate
    attractor.weight = (1 - alpha) * attractor.weight + alpha * tpr
    attractor.confidence = min(1.0, attractor.samples_tested / 20)
    
    # Check for exhaustion
    remaining = count_matching_docs(attractor, db) - attractor.samples_tested
    if remaining == 0 or (tpr < 0.1 and attractor.samples_tested > 10):
        attractor.status = 'exhausted'
    
    save_attractor(attractor, db)


def should_transition_phase(run, db):
    """
    Decide if we should transition to next phase.
    
    Bootstrap → Targeted: When we have enough attractors (>= 3)
    Targeted → Validation: When new_findings_rate < target_rate
    Validation → Complete: When all validations pass
    """
    if run.phase == 'bootstrap':
        active_attractors = count_active_attractors(db)
        return active_attractors >= 3
    
    elif run.phase == 'targeted':
        return run.new_findings_rate < run.target_rate
    
    elif run.phase == 'validation':
        return count_open_issues(db) == 0
    
    return False


def calculate_convergence(db):
    """
    Calculate overall convergence score.
    
    Estimates what percentage of total issues we've found.
    Based on:
    - Documents checked / total documents
    - Attractor exhaustion rate
    - Recent findings rate
    """
    total = count_documents(db)
    checked = count_checked_documents(db)
    doc_coverage = checked / total
    
    active = count_active_attractors(db)
    total_attr = count_total_attractors(db)
    attractor_coverage = 1.0 - (active / max(1, total_attr))
    
    recent_rate = get_recent_findings_rate(db, last_n=20)
    findings_confidence = 1.0 - recent_rate
    
    # Weighted combination
    return 0.4 * doc_coverage + 0.3 * attractor_coverage + 0.3 * findings_confidence
```

---

## Continuation Packet Format

```yaml
# continuation-packet.yaml
packet_type: corpus_consistency_scan
version: 1.0
timestamp: "2026-07-09T16:45:00Z"
run_id: 42

# Current state
state:
  phase: targeted
  samples_this_run: 23
  samples_total: 156
  issues_this_run: 3
  issues_total: 47
  
# Convergence metrics
convergence:
  new_findings_rate: 0.13  # 13% of samples find new issues
  convergence_score: 0.68   # 68% estimated completeness
  document_coverage: 0.72   # 72% of documents checked
  attractor_exhaustion: 0.54 # 54% of attractors exhausted

# Active attractors
attractors:
  - id: 1
    name: missing_last_stamped_at
    weight: 0.34
    confidence: 0.82
    samples: 45
    findings: 23
    status: active
  - id: 2
    name: unidirectional_cop_xref
    weight: 0.21
    confidence: 0.65
    samples: 32
    findings: 12
    status: active

# Judgment requests (ambiguous findings)
judgment_requests:
  - id: jr-001
    issue_id: 47
    pattern_id: 1
    question: "Is this a valid issue or false positive?"
    context:
      document: "barons-Mariani/research/agile.md"
      finding: "Missing last_stamped_at but document is working draft"
      pattern: "missing-last-stamped-at"
      current_condition: "document_role IN ('source') AND last_stamped_at IS NULL"
    options:
      - value: valid
        label: "Valid issue - fix all matching docs"
        action: validate_pattern
      - value: invalid
        label: "False positive - working drafts don't need stamps"
        action: retire_pattern
      - value: refine
        label: "Refine pattern - exclude working drafts"
        action: refine_pattern
        params:
          new_condition: "lifecycle_state = 'working' AND last_stamped_at IS NULL"
      - value: fork
        label: "Fork pattern - separate source docs from drafts"
        action: fork_pattern
        params:
          forks:
            - name: "missing-stamp-source-docs"
              condition: "document_role = 'source' AND last_stamped_at IS NULL"
              severity: "P1"
            - name: "missing-stamp-draft-docs"
              condition: "document_role = 'working-paper' AND last_stamped_at IS NULL"
              severity: "P3"
    recommended: valid

# Pattern operations (new patterns detected, pending confirmation)
pattern_operations:
  - operation: create
    pattern:
      slug: "unidirectional-cop-xref"
      canonical_name: "Unidirectional COP cross-reference"
      category: "xref"
      condition_sql: "related_documents LIKE '%cop-core%' AND NOT EXISTS (SELECT 1 FROM documents d2 WHERE d2.related_documents LIKE ...)"
      description: "Document references cop-core but cop-core doesn't reference back"
      severity_default: "P2"
      samples_found: 3
      confidence: 0.65
      needs_confirmation: true
      
  - operation: merge
    source_pattern_id: 12
    target_pattern_id: 7
    reason: "Both patterns detect missing date fields"
    needs_confirmation: true

# Next action
next_action:
  type: resume
  command: "python scanner.py --resume run-42"
  estimated_remaining_samples: 45
  estimated_completion: "2026-07-09T17:30:00Z"

# Human-readable summary
summary: |
  Scan Progress: 68% complete
  - 156/217 documents checked
  - 47 issues found (3 this run)
  - 2 active attractors need guidance
  - 1 judgment request pending
  
  Recent findings rate: 13% (target: <5%)
  
  Recommendation: Review judgment request for agile.md,
  then resume for ~45 more samples.
```

---

## Usage

```bash
# Initialize database and scan 37 random documents
python scanner.py --init

# Resume from interruption (continuation packet)
python scanner.py --resume continuation-packet.yaml

# Check specific document
python scanner.py --check barons-Mariani/research/agile.md

# Report current status
python scanner.py --report

# Validate all issues marked as "fixed"
python scanner.py --validate

# Export findings
python scanner.py --export issues.json
```

---

## Implementation Priority

1. ✅ Database schema designed
2. ⏳ Core scanner engine (Python/Node)
3. ⏳ Angle checkers (A-F implementations)
4. ⏳ Attractor detection and updating
5. ⏳ Continuation packet I/O
6. ⏳ CLI interface
7. ⏳ Report generation

---

**Next Step:** Should I implement the core scanner engine now, or would you like to refine the schema/algorithm first?
