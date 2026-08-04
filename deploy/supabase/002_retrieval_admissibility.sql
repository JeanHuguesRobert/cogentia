-- Public Guide serving policy: only admissible corpus sources participate in retrieval.
ALTER TABLE public.retrieval_chunks
  ADD COLUMN IF NOT EXISTS admissible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS document_kind text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS canonical_weight integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS retrieval_chunks_admissible_idx
  ON public.retrieval_chunks (corpus_key, index_hash, admissible, canonical_weight DESC);

CREATE OR REPLACE FUNCTION public.match_retrieval_chunks(query_embedding vector(1536), corpus_key text, index_hash text DEFAULT NULL, match_count integer DEFAULT 8, provider_filter text DEFAULT 'openai', model_filter text DEFAULT 'text-embedding-3-small')
RETURNS TABLE (source_id text, repo text, path text, start_line integer, end_line integer, title text, heading_path text, role text, visibility text, github_url text, text text, index_hash text, similarity double precision)
LANGUAGE sql STABLE AS $$
  SELECT c.source_id, c.repo, c.path, c.start_line, c.end_line, c.title, c.heading_path, c.role, c.visibility, c.github_url, c.text, c.index_hash, 1 - (c.embedding <=> query_embedding)
  FROM public.retrieval_chunks c
  WHERE c.corpus_key = match_retrieval_chunks.corpus_key AND c.admissible = true
    AND c.embedding IS NOT NULL AND c.provider = provider_filter AND c.model_name = model_filter
    AND (index_hash IS NULL OR index_hash = '' OR c.index_hash = index_hash)
  ORDER BY c.canonical_weight DESC, c.embedding <=> query_embedding
  LIMIT GREATEST(1, LEAST(match_count, 50));
$$;

CREATE OR REPLACE FUNCTION public.search_retrieval_chunks_fts(search_query text, corpus_key text, index_hash text DEFAULT NULL, match_count integer DEFAULT 8)
RETURNS TABLE (source_id text, repo text, path text, start_line integer, end_line integer, title text, heading_path text, role text, visibility text, github_url text, text text, index_hash text, rank double precision)
LANGUAGE sql STABLE AS $$
  SELECT c.source_id, c.repo, c.path, c.start_line, c.end_line, c.title, c.heading_path, c.role, c.visibility, c.github_url, c.text, c.index_hash, ts_rank(c.fts, websearch_to_tsquery('simple', search_query)) AS rank
  FROM public.retrieval_chunks c
  WHERE c.corpus_key = search_retrieval_chunks_fts.corpus_key AND c.admissible = true
    AND (index_hash IS NULL OR index_hash = '' OR c.index_hash = index_hash)
    AND c.fts @@ websearch_to_tsquery('simple', search_query)
  ORDER BY c.canonical_weight DESC, rank DESC
  LIMIT GREATEST(1, LEAST(match_count, 50));
$$;

-- The Guide reaches these through a service-role backend, never through the
-- public Data API. Keep raw chunks and RPCs unavailable to browser roles.
ALTER TABLE public.retrieval_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS retrieval_chunks_service_role_all ON public.retrieval_chunks;
CREATE POLICY retrieval_chunks_service_role_all
  ON public.retrieval_chunks
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.retrieval_chunks FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.match_retrieval_chunks(vector, text, text, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_retrieval_chunks_fts(text, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_retrieval_chunks(vector, text, text, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_retrieval_chunks_fts(text, text, text, integer) TO service_role;
