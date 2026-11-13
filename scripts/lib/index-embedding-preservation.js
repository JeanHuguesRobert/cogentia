/**
 * FBF: keep already-paid embedding vectors through a corpus index rebuild.
 *
 * The SQLite embeddings.chunk_id foreign key cascades when clearIndex() deletes
 * chunks. Snapshot vectors by exact content hash BEFORE clearing the chunks,
 * then re-bind to the rebuilt IDs. A modified chunk gets no old embedding.
 * The snapshot is TEMP and the entire cycle runs within the caller's transaction.
 */
const TEMP_TABLE = "cogentia_preserved_chunk_embeddings";

export function snapshotChunkEmbeddings(db) {
  const exists = db.prepare(
    "SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name='embeddings'"
  ).get();
  if (!exists) return { available: false, preserved: 0 };
  db.exec(`DROP TABLE IF EXISTS temp.${TEMP_TABLE}`);
  db.exec(`
    CREATE TEMP TABLE ${TEMP_TABLE} AS
    SELECT c.repo, c.path, c.content_hash, e.provider, e.model_name,
           e.dimensions, e.embedding, e.created_at
    FROM embeddings AS e
    JOIN chunks AS c ON c.id = e.chunk_id
    WHERE c.content_hash = e.content_hash
  `);
  const preserved = Number(db.prepare(`SELECT count(*) AS n FROM temp.${TEMP_TABLE}`).get().n);
  return { available: true, preserved };
}

export function restoreChunkEmbeddings(db, snapshot) {
  if (!snapshot?.available) return { preserved: 0, restored: 0 };
  // The new source line interval must come from the rebuilt chunk, not the old
  // embedding record. Hash equality is required: no stale vector substitution.
  const result = db.prepare(`
    INSERT OR IGNORE INTO embeddings
      (chunk_id, content_hash, provider, repo, path, start_line, end_line,
       embedding, model_name, dimensions, created_at)
    SELECT c.id, c.content_hash, s.provider, c.repo, c.path, c.start_line,
           c.end_line, s.embedding, s.model_name, s.dimensions, s.created_at
    FROM temp.${TEMP_TABLE} AS s
    JOIN chunks AS c
      ON c.repo = s.repo AND c.path = s.path
     AND c.content_hash = s.content_hash
  `).run();
  db.exec(`DROP TABLE IF EXISTS temp.${TEMP_TABLE}`);
  return { preserved: snapshot.preserved, restored: Number(result.changes || 0) };
}
