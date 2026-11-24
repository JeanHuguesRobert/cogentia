#!/usr/bin/env node
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { storeEmbeddingsSafely } from "./lib/embedding-store-safety.js";

const db = new DatabaseSync(":memory:");
db.exec(`
PRAGMA foreign_keys=ON;
CREATE TABLE chunks (id INTEGER PRIMARY KEY, repo TEXT, path TEXT, content_hash TEXT, start_line INTEGER, end_line INTEGER);
CREATE TABLE embeddings (
 id INTEGER PRIMARY KEY, chunk_id INTEGER NOT NULL, content_hash TEXT NOT NULL,
 provider TEXT NOT NULL, repo TEXT NOT NULL, path TEXT NOT NULL,
 start_line INTEGER NOT NULL, end_line INTEGER NOT NULL,
 embedding JSON NOT NULL, model_name TEXT NOT NULL, dimensions INTEGER NOT NULL, created_at TEXT NOT NULL,
 FOREIGN KEY(chunk_id) REFERENCES chunks(id) ON DELETE CASCADE,
 UNIQUE(chunk_id,provider,model_name)
);
INSERT INTO chunks VALUES (1,'cogentia','a.md','hash-a',1,2),(2,'cogentia','b.md','hash-b',3,4);
`);
const item = (id, hash, provider, model, embedding) => ({
 chunk_id:id, content_hash:hash, provider, model_name:model, dimensions:embedding.length, embedding,
});
const openai = item(1,"hash-a","openai","text-embedding-3-small",[0.5,0.5]);
assert.deepEqual(storeEmbeddingsSafely(db,[openai]),{stored:1,reused:0,stale:0,repeated_inputs:0});
const existing = db.prepare("SELECT embedding FROM embeddings WHERE provider='openai'").get().embedding;
const cf = item(1,"hash-a","cloudflare","qwen3-0.6b",[0.2,0.8]);
assert.equal(storeEmbeddingsSafely(db,[cf,cf]).stored,1);
const replay = storeEmbeddingsSafely(db,[cf]);
assert.equal(replay.stored,0);
assert.equal(replay.reused,1);
assert.equal(db.prepare("SELECT count(*) AS n FROM embeddings").get().n,2);
assert.equal(db.prepare("SELECT embedding FROM embeddings WHERE provider='openai'").get().embedding,existing);
assert.equal(storeEmbeddingsSafely(db,[item(1,"stale-hash","cloudflare","qwen3-0.6b",[0.8,0.2])]).stale,1);
assert.equal(db.prepare("SELECT embedding FROM embeddings WHERE provider='cloudflare'").get().embedding,JSON.stringify([0.2,0.8]));
assert.throws(() => storeEmbeddingsSafely(db,[item(1,"hash-a","cloudflare","qwen3-0.6b",[0.8,0.2,0.1])]),/dimension_conflict/);
assert.throws(() => storeEmbeddingsSafely(db,[item(1,"hash-a","cloudflare","qwen3-0.6b",[Infinity,0])]),/invalid_embedding_row/);
assert.throws(() => storeEmbeddingsSafely(db,[cf,item(1,"hash-a","cloudflare","qwen3-0.6b",[0.1,0.9])]),/conflicting_duplicate/);
db.exec("UPDATE chunks SET content_hash='hash-a-new' WHERE id=1");
assert.equal(storeEmbeddingsSafely(db,[cf]).stale,1);
const updated = item(1,"hash-a-new","cloudflare","qwen3-0.6b",[0.3,0.7]);
assert.equal(storeEmbeddingsSafely(db,[updated]).stored,1);
assert.equal(db.prepare("SELECT content_hash FROM embeddings WHERE provider='cloudflare'").get().content_hash,"hash-a-new");
// Test rollback when a late incompatible row follows a valid new insertion.
const newRow=item(2,"hash-b","cloudflare","qwen3-0.6b",[0.1,0.9]);
assert.throws(()=>storeEmbeddingsSafely(db,[newRow,item(1,"hash-a-new","cloudflare","qwen3-0.6b",[0.4,0.3,0.3])]),/dimension_conflict/);
assert.equal(db.prepare("SELECT count(*) AS n FROM embeddings WHERE chunk_id=2").get().n,0);
assert.equal(db.prepare("SELECT embedding FROM embeddings WHERE provider='openai'").get().embedding,existing);
// Known policy is retained; legacy provenance is never invented.
const known={...item(1,"hash-a-new","cloudflare","gemma-policy-test",[0.1,0.9]),embedding_policy_version:"document-v1"};
assert.equal(storeEmbeddingsSafely(db,[known]).stored,1);
assert.equal(storeEmbeddingsSafely(db,[known]).reused,1);
assert.equal(db.prepare("SELECT policy FROM embeddings WHERE model_name='gemma-policy-test'").get().policy,"document-v1");
assert.equal(db.prepare("SELECT policy FROM embeddings WHERE provider='openai'").get().policy,null);
assert.throws(()=>storeEmbeddingsSafely(db,[{...known,embedding_policy_version:"document-v2"}]),/policy_conflict/);
assert.throws(()=>storeEmbeddingsSafely(db,[{...known,chunk_id:2,content_hash:"hash-b",embedding_policy_version:"document-v2"}]),/policy_conflict/);
assert.throws(()=>storeEmbeddingsSafely(db,[{...known,policy:"different"}]),/conflicting_embedding_policy/);
db.close();
console.log("embedding-store-safety: PASS (replay, stale-hash, rollback, model coexistence, baseline)");
