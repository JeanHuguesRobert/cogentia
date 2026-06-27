#!/usr/bin/env node
/**
 * Migrate embeddings table to support multiple providers
 *
 * Changes:
 * - chunk_id INTEGER PRIMARY KEY → id INTEGER PRIMARY KEY (auto-increment)
 * - Add provider TEXT NOT NULL column
 * - Remove content_hash UNIQUE (different providers, different hashes)
 * - Add UNIQUE(chunk_id, provider, model_name)
 *
 * Existing data is migrated by inferring provider from model_name:
 * - "text-embedding-3-*" → "openai"
 * - "mxbai-embed-*" → "magistral"
 * - others → "unknown"
 */

import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const COGENTIA_DIR = process.cwd();
const DB_PATH = path.join(COGENTIA_DIR, ".cogentia", "index", "corpus.sqlite");

console.log("🔄 Multi-Provider Embeddings Migration\n");
console.log(`Database: ${DB_PATH}\n`);

// Backup first
const BACKUP_PATH = DB_PATH + ".backup";
console.log("1. Creating backup...");
if (fs.existsSync(BACKUP_PATH)) {
  console.log("   ⚠️  Backup already exists, skipping copy");
} else {
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  console.log("   ✅ Backup created");
}

// Open database
const db = new DatabaseSync(DB_PATH);

try {
  // Check current state
  console.log("\n2. Checking current state...");
  const currentCount = db.prepare("SELECT COUNT(*) as count FROM embeddings").get();
  console.log(`   Current embeddings: ${currentCount.count}`);

  const currentSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='embeddings'").get();
  console.log("\n   Current schema:");
  console.log("   " + currentSchema.sql.split("\n").join("\n   "));

  // Check if migration already happened
  const columns = db.prepare("PRAGMA table_info(embeddings)").all();
  const hasIdColumn = columns.some(c => c.name === 'id' && c.pk === 1);
  const hasProviderColumn = columns.some(c => c.name === 'provider');

  if (hasIdColumn && hasProviderColumn) {
    console.log("\n   ✅ Already migrated (has 'id' and 'provider' columns)");
    console.log("\nExiting safely.");
    db.close();
    process.exit(0);
  }

  // Begin transaction
  console.log("\n3. Creating new table...");
  db.exec("BEGIN");

  // Create new table with all existing columns plus provider
  db.exec(`
    CREATE TABLE embeddings_new (
      id INTEGER PRIMARY KEY,
      chunk_id INTEGER NOT NULL,
      content_hash TEXT NOT NULL,
      provider TEXT NOT NULL,
      repo TEXT NOT NULL,
      path TEXT NOT NULL,
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      embedding JSON NOT NULL,
      model_name TEXT NOT NULL,
      dimensions INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE,
      UNIQUE(chunk_id, provider, model_name)
    )
  `);

  console.log("   ✅ New table created");

  // Migrate data with provider inference
  console.log("\n4. Migrating existing data...");
  const rows = db.prepare("SELECT * FROM embeddings").all();
  console.log(`   Found ${rows.length} rows to migrate`);

  let migrated = 0;
  const insert = db.prepare(`
    INSERT INTO embeddings_new (chunk_id, content_hash, provider, repo, path, start_line, end_line, embedding, model_name, dimensions, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const row of rows) {
    // Infer provider from model_name
    let provider = "unknown";
    if (row.model_name.includes("text-embedding")) {
      provider = "openai";
    } else if (row.model_name.includes("mxbai")) {
      provider = "magistral";
    } else if (row.model_name.includes("magistral")) {
      provider = "magistral";
    }

    insert.run(
      row.chunk_id,
      row.content_hash,
      provider,
      row.repo,
      row.path,
      row.start_line,
      row.end_line,
      row.embedding,
      row.model_name,
      row.dimensions,
      row.created_at
    );
    migrated++;
  }

  console.log(`   ✅ Migrated ${migrated} rows`);

  // Drop old table
  console.log("\n5. Replacing old table...");
  db.exec("DROP TABLE embeddings");
  db.exec("ALTER TABLE embeddings_new RENAME TO embeddings");

  // Recreate indexes
  console.log("\n6. Recreating indexes...");
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_embeddings_chunk_id ON embeddings(chunk_id);
    CREATE INDEX IF NOT EXISTS idx_embeddings_provider ON embeddings(provider);
    CREATE INDEX IF NOT EXISTS idx_embeddings_repo_path ON embeddings(provider, repo, path);
  `);
  console.log("   ✅ Indexes created");

  // Commit
  db.exec("COMMIT");
  console.log("\n7. ✅ Migration committed");

  // Verify
  console.log("\n8. Verifying migration...");
  const newCount = db.prepare("SELECT COUNT(*) as count FROM embeddings").get();
  const byProvider = db.prepare("SELECT provider, model_name, COUNT(*) as count FROM embeddings GROUP BY provider, model_name").all();

  console.log(`   Total embeddings: ${newCount.count}`);
  console.log("\n   By provider:");
  for (const row of byProvider) {
    console.log(`   - ${row.provider}/${row.model_name}: ${row.count}`);
  }

  console.log("\n✅ Migration complete!");
  console.log(`\nBackup saved to: ${BACKUP_PATH}`);
  console.log("To restore if needed: cp embeddings.sqlite.backup embeddings.sqlite");

} catch (error) {
  console.error("\n❌ Migration failed:", error.message);
  console.error("Rolling back...");
  db.exec("ROLLBACK");
  console.log("\nYou can restore from backup:");
  console.log(`  cp ${BACKUP_PATH} ${DB_PATH}`);
  process.exit(1);
} finally {
  db.close();
}
