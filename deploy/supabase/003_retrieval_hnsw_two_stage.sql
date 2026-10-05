-- Migration 003: Two-stage HNSW vector retrieval with canonical re-ranking
--
-- Problem:
--   Prior match_retrieval_chunks sorted by:
--     ORDER BY c.canonical_weight DESC, c.embedding <=> query_embedding
--   Because c.canonical_weight DESC was the primary sort key, PostgreSQL
--   could not perform an HNSW index scan on retrieval_chunks_embedding_idx.
--   This forced a sequential scan across ~30,000 1536-dimensional vectors,
--   causing HTTP 500 statement timeouts (canceling statement due to statement timeout).
--
-- Solution:
--   Two-stage retrieval:
--   1. CTE 'candidates' uses HNSW index scan sorting strictly by (c.embedding <=> query_embedding)
--      fetching the top semantically similar candidates (GREATEST(20, match_count * 3)).
--   2. Outer query re-ranks the candidates by (canonical_weight DESC, similarity DESC)
--      and applies the final limit.

CREATE OR REPLACE FUNCTION public.match_retrieval_chunks(
  query_embedding vector(1536),
  corpus_key text,
  index_hash text DEFAULT NULL,
  match_count integer DEFAULT 8,
  provider_filter text DEFAULT 'openai',
  model_filter text DEFAULT 'text-embedding-3-small'
)
RETURNS TABLE (
  source_id text,
  repo text,
  path text,
  start_line integer,
  end_line integer,
  title text,
  heading_path text,
  role text,
  visibility text,
  github_url text,
  text text,
  index_hash text,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  WITH candidates AS (
    SELECT
      c.source_id,
      c.repo,
      c.path,
      c.start_line,
      c.end_line,
      c.title,
      c.heading_path,
      c.role,
      c.visibility,
      c.github_url,
      c.text,
      c.index_hash,
      c.canonical_weight,
      1 - (c.embedding <=> query_embedding) AS similarity
    FROM public.retrieval_chunks c
    WHERE c.corpus_key = match_retrieval_chunks.corpus_key
      AND c.admissible = true
      AND c.embedding IS NOT NULL
      AND c.provider = provider_filter
      AND c.model_name = model_filter
      AND (index_hash IS NULL OR index_hash = '' OR c.index_hash = index_hash)
    ORDER BY c.embedding <=> query_embedding
    LIMIT GREATEST(20, LEAST(match_count * 3, 100))
  )
  SELECT
    candidates.source_id,
    candidates.repo,
    candidates.path,
    candidates.start_line,
    candidates.end_line,
    candidates.title,
    candidates.heading_path,
    candidates.role,
    candidates.visibility,
    candidates.github_url,
    candidates.text,
    candidates.index_hash,
    candidates.similarity
  FROM candidates
  ORDER BY candidates.canonical_weight DESC, candidates.similarity DESC
  LIMIT GREATEST(1, LEAST(match_count, 50));
$$;

REVOKE ALL ON FUNCTION public.match_retrieval_chunks(vector, text, text, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_retrieval_chunks(vector, text, text, integer, text, text) TO service_role;
