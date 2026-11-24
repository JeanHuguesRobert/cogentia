/**
 * #338: crash/replay-safe persistence of already fulfilled embeddings.
 *
 * The source chunk hash is the authority: late results must never overwrite a
 * changed chunk. Every batch is atomic and a replay is a no-op. A model with a
 * different dimension must be assigned a different embedding-space identity,
 * not silently substituted under an existing provider/model pair.
 *
 * This is a reconstructible index projection, not a second continuation store.
 */
// Additive migration: unknown legacy provenance stays NULL. Until the full
// space-key migration lands, reject policy conflicts instead of overwriting.
export function ensureEmbeddingPolicyColumn(db) {
  if (!db.prepare("PRAGMA table_info(embeddings)").all().some(c => c.name === "policy")) {
    db.exec("ALTER TABLE embeddings ADD COLUMN policy TEXT");
    return true;
  }
  return false;
}

export function storeEmbeddingsSafely(db, incoming) {
  if (!Array.isArray(incoming)) throw new TypeError("embeddings must be an array");

  const byKey = new Map();
  let repeatedInputs = 0;
  for (const item of incoming) {
    const chunkId = Number(item.chunk_id);
    const provider = String(item.provider || "").trim();
    const model = String(item.model_name || "").trim();
    const hash = String(item.content_hash || "").trim();
    const dimensions = Number(item.dimensions || item.embedding?.length || 0);
    if (!Number.isSafeInteger(chunkId) || chunkId <= 0 || !provider || provider === "unknown"
        || !model || model === "unknown" || !hash || !Number.isSafeInteger(dimensions)
        || dimensions <= 0 || !Array.isArray(item.embedding)
        || item.embedding.length !== dimensions || !item.embedding.every(v => typeof v === "number" && Number.isFinite(v))) {
      throw new Error("invalid_embedding_row");
    }
    const policy = item.embedding_policy_version ?? item.policy ?? null;
    if (policy !== null && (typeof policy !== "string" || !policy.trim() || policy.length > 256)) throw new Error("invalid_embedding_policy");
    if (item.policy != null && item.embedding_policy_version != null && item.policy !== item.embedding_policy_version) throw new Error("conflicting_embedding_policy");
    const key = JSON.stringify([chunkId, provider, model]);
    const normalized = { chunkId, provider, model, hash, dimensions, policy, embedding: JSON.stringify(item.embedding) };
    const previous = byKey.get(key);
    if (previous) {
      if (previous.hash !== hash || previous.dimensions !== dimensions || previous.policy !== policy || previous.embedding !== normalized.embedding) {
        throw new Error("conflicting_duplicate_embedding");
      }
      repeatedInputs++;
    } else {
      byKey.set(key, normalized);
    }
  }

  const outcome = { stored: 0, reused: 0, stale: 0, repeated_inputs: repeatedInputs };
  db.exec("BEGIN IMMEDIATE");
  try {
    ensureEmbeddingPolicyColumn(db);
    const chunkLookup = db.prepare("SELECT repo, path, start_line, end_line, content_hash FROM chunks WHERE id = ?");
    const existingLookup = db.prepare("SELECT content_hash, dimensions, policy FROM embeddings WHERE chunk_id = ? AND provider = ? AND model_name = ?");
    const insert = db.prepare(`
      INSERT INTO embeddings
      (chunk_id, content_hash, provider, repo, path, start_line, end_line, embedding, model_name, dimensions, policy, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(chunk_id, provider, model_name) DO UPDATE SET
        content_hash=excluded.content_hash, repo=excluded.repo, path=excluded.path,
        start_line=excluded.start_line, end_line=excluded.end_line,
        embedding=excluded.embedding, dimensions=excluded.dimensions, policy=excluded.policy,
        created_at=excluded.created_at
      WHERE embeddings.content_hash <> excluded.content_hash
    `);
    const incompatibleSpace = db.prepare("SELECT 1 FROM embeddings WHERE provider = ? AND model_name = ? AND (policy IS NOT ? OR dimensions <> ?) LIMIT 1");
    for (const item of byKey.values()) {
      const chunk = chunkLookup.get(item.chunkId);
      if (!chunk || chunk.content_hash !== item.hash) {
        outcome.stale++;
        continue;
      }
      const existing = existingLookup.get(item.chunkId, item.provider, item.model);
      if (existing && Number(existing.dimensions) !== item.dimensions) {
        throw new Error("embedding_space_dimension_conflict");
      }
      if (existing && existing.policy !== item.policy) throw new Error("embedding_space_policy_conflict");
      // Until policy becomes part of the unique key, one provider/model pair
      // must not accumulate heterogeneous policies across different chunks.
      if (incompatibleSpace.get(item.provider,item.model,item.policy,item.dimensions)) throw new Error("embedding_space_policy_conflict");
      if (existing?.content_hash === item.hash) {
        outcome.reused++;
        continue;
      }
      const result = insert.run(
        item.chunkId, item.hash, item.provider, chunk.repo, chunk.path,
        chunk.start_line, chunk.end_line, item.embedding, item.model, item.dimensions, item.policy,
      );
      if (Number(result.changes) !== 1) throw new Error("embedding_store_race");
      outcome.stored++;
    }
    db.exec("COMMIT");
    return outcome;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
