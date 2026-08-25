#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const args = process.argv.slice(2);
  const corpusKey = readFlag(args, "--corpus") || process.env.COGENTIA_RETRIEVAL_CORPUS_KEY || "cogentia-public";
  const dryRun = args.includes("--dry-run");
  const startAt = Number.parseInt(readFlag(args, "--start-at") || "0", 10);
  if (!Number.isInteger(startAt) || startAt < 0) {
    throw new Error("--start-at must be a non-negative integer");
  }
  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const registry = process.env.COGENTIA_REGISTRY || path.join(root, "..", "JeanHuguesRobert", ".cogentia.json");
  const dataDir = process.env.COGENTIA_DATA_DIR || path.dirname(registry);
  const dbPath = path.join(dataDir, ".cogentia", "index", "corpus.sqlite");
  if (!fs.existsSync(dbPath)) throw new Error(`Index not found: ${dbPath}`);

  const sqlite = await import("node:sqlite");
  const db = new sqlite.DatabaseSync(dbPath, { readOnly: true });
  try {
    const countRow = db.prepare(`
      SELECT count(*) as total
      FROM embeddings e
      JOIN chunks c ON c.id = e.chunk_id
      WHERE c.searchable_public = 1
    `).get();
    const totalRecords = countRow?.total || 0;

    console.log(JSON.stringify({
      ok: true,
      dry_run: dryRun,
      corpus_key: corpusKey,
      index_hash: indexHash,
      db_path: dbPath,
      rows: totalRecords,
      start_at: startAt,
    }, null, 2));

    if (dryRun) return;
    if (startAt > totalRecords) {
      throw new Error(`--start-at ${startAt} exceeds ${totalRecords} records`);
    }

    const batchStmt = db.prepare(`
      SELECT e.content_hash, e.provider, e.model_name, e.dimensions, e.embedding,
             c.repo, c.path, c.start_line, c.end_line, c.title, c.heading_path, c.role,
             c.visibility, c.github_url, c.text, c.searchable_public
      FROM embeddings e
      JOIN chunks c ON c.id = e.chunk_id
      WHERE c.searchable_public = 1
      ORDER BY c.repo, c.path, c.start_line
      LIMIT ? OFFSET ?
    `);

    const chunkSize = 100;
    let upserted = 0;
    for (let offset = startAt; offset < totalRecords; offset += chunkSize) {
      const rows = batchStmt.all(chunkSize, offset);
      if (!rows.length) break;

      const batch = rows.map(row => {
        const sourceId = `${row.repo}:${row.path}#L${row.start_line}-L${row.end_line}`;
        let embedding = row.embedding;
        try {
          embedding = typeof embedding === "string" ? JSON.parse(embedding) : embedding;
        } catch {
          embedding = null;
        }
        return {
          corpus_key: corpusKey,
          index_hash: indexHash,
          source_id: sourceId,
          repo: row.repo,
          path: row.path,
          start_line: row.start_line,
          end_line: row.end_line,
          title: row.title || "",
          heading_path: row.heading_path || "",
          role: row.role || "",
          document_kind: row.role === "source" ? "source" : "",
          admissible: row.role === "source" && !String(row.path || "").startsWith(".cogentia/") && !String(row.path || "").includes("/issues/"),
          canonical_weight: 0,
          visibility: row.visibility || "public",
          github_url: row.github_url || "",
          text: row.text || "",
          content_hash: row.content_hash || "",
          provider: row.provider || "openai",
          model_name: row.model_name || "text-embedding-3-small",
          dimensions: row.dimensions || 1536,
          embedding,
          updated_at: new Date().toISOString(),
        };
      }).filter(record => Array.isArray(record.embedding) && record.embedding.length === 1536 && record.text);

      if (batch.length > 0) {
        const response = await fetch(`${supabaseUrl}/rest/v1/retrieval_chunks?on_conflict=corpus_key,source_id,provider,model_name,dimensions`, {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify(batch),
        });
        if (!response.ok) {
          const detail = await response.text();
          throw new Error(`Supabase upsert failed (${response.status}): ${detail.slice(0, 500)}`);
        }
      }
      upserted += rows.length;
      console.log(JSON.stringify({ ok: true, batch_start: offset, batch_size: rows.length, upserted, total: totalRecords }, null, 2));
    }

    if (indexHash) {
      await fetch(`${supabaseUrl}/rest/v1/retrieval_chunks?corpus_key=eq.${encodeURIComponent(corpusKey)}&index_hash=neq.${encodeURIComponent(indexHash)}`, {
        method: "DELETE",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });
    }

    console.log(JSON.stringify({ ok: true, upserted, corpus_key: corpusKey, index_hash: indexHash }, null, 2));
  } finally {
    db.close();
  }
}

function readFlag(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}

main().catch(error => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
