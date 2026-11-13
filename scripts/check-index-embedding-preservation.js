#!/usr/bin/env node
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { snapshotChunkEmbeddings, restoreChunkEmbeddings } from "./lib/index-embedding-preservation.js";

function dbWithFixtures() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE chunks (
      id INTEGER PRIMARY KEY, repo TEXT, path TEXT, content_hash TEXT,
      start_line INTEGER, end_line INTEGER
    );
    CREATE TABLE embeddings (
      id INTEGER PRIMARY KEY, chunk_id INTEGER NOT NULL,
      content_hash TEXT NOT NULL, provider TEXT NOT NULL, repo TEXT NOT NULL,
      path TEXT NOT NULL, start_line INTEGER NOT NULL, end_line INTEGER NOT NULL,
      embedding JSON NOT NULL, model_name TEXT NOT NULL,
      dimensions INTEGER NOT NULL, created_at TEXT NOT NULL,
      FOREIGN KEY (chunk_id) REFERENCES chunks(id) ON DELETE CASCADE,
      UNIQUE(chunk_id, provider, model_name)
    );
    INSERT INTO chunks VALUES (1, 'cogentia', 'a.md', 'unchanged-hash', 5, 8);
    INSERT INTO chunks VALUES (2, 'cogentia', 'b.md', 'changed-hash', 10, 14);
    INSERT INTO embeddings (chunk_id,content_hash,provider,repo,path,start_line,end_line,embedding,model_name,dimensions,created_at)
    VALUES (1,'unchanged-hash','openai','cogentia','a.md',5,8,'[0.1,0.2]','test-model',2,'2026-10-04'),
           (2,'changed-hash','openai','cogentia','b.md',10,14,'[0.3,0.4]','test-model',2,'2026-10-04');
  `);
  return db;
}
const db=dbWithFixtures();
db.exec("BEGIN");
const snapshot=snapshotChunkEmbeddings(db);
assert.equal(snapshot.preserved,2);
db.exec("DELETE FROM chunks");
assert.equal(db.prepare("SELECT count(*) AS n FROM embeddings").get().n,0);
db.exec(`
 INSERT INTO chunks VALUES (100,'cogentia','a.md','unchanged-hash',5,8);
 INSERT INTO chunks VALUES (101,'cogentia','b.md','new-hash',10,15);
`);
const retained=restoreChunkEmbeddings(db,snapshot);
db.exec("COMMIT");
assert.equal(retained.restored,1);
const rows=db.prepare("SELECT chunk_id,content_hash,embedding FROM embeddings").all();
assert.equal(rows.length,1);
assert.equal(rows[0].chunk_id,100);
assert.equal(rows[0].embedding,"[0.1,0.2]");
assert.equal(rows[0].content_hash,"unchanged-hash");
db.close();
console.log("Index embedding preservation across cascade: PASS");
