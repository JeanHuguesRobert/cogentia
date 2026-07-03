-- Cogentia / Ophelia shared retrieval serving layer (public chunks + vectors)
-- Apply: supabase db push or SQL editor

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.retrieval_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corpus_key text NOT NULL,
  index_hash text NOT NULL DEFAULT '',
  source_id text NOT NULL,
  repo text NOT NULL,
  path text NOT NULL,
  start_line integer NOT NULL,
  end_line integer NOT NULL,
  title text NOT NULL DEFAULT '',
  heading_path text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  visibility text NOT NULL DEFAULT 'public',
  github_url text NOT NULL DEFAULT '',
  text text NOT NULL,
  content_hash text NOT NULL,
  provider text NOT NULL DEFAULT 'openai',
  model_name text NOT NULL DEFAULT 'text-embedding-3-small',
  dimensions integer NOT NULL DEFAULT 1536,
  embedding vector(1536),
  fts tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(text, ''))) STORED,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (corpus_key, source_id, provider, model_name, dimensions)
);

CREATE INDEX IF NOT EXISTS retrieval_chunks_corpus_idx
  ON public.retrieval_chunks (corpus_key, index_hash);

CREATE INDEX IF NOT EXISTS retrieval_chunks_fts_idx
  ON public.retrieval_chunks USING gin (fts);

CREATE INDEX IF NOT EXISTS retrieval_chunks_embedding_idx
  ON public.retrieval_chunks
  USING hnsw (embedding vector_cosine_ops);

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
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.retrieval_chunks c
  WHERE c.corpus_key = match_retrieval_chunks.corpus_key
    AND c.embedding IS NOT NULL
    AND c.provider = provider_filter
    AND c.model_name = model_filter
    AND (index_hash IS NULL OR index_hash = '' OR c.index_hash = index_hash)
  ORDER BY c.embedding <=> query_embedding
  LIMIT GREATEST(1, LEAST(match_count, 50));
$$;

CREATE OR REPLACE FUNCTION public.search_retrieval_chunks_fts(
  search_query text,
  corpus_key text,
  index_hash text DEFAULT NULL,
  match_count integer DEFAULT 8
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
  rank double precision
)
LANGUAGE sql
STABLE
AS $$
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
    ts_rank(c.fts, websearch_to_tsquery('simple', search_query)) AS rank
  FROM public.retrieval_chunks c
  WHERE c.corpus_key = search_retrieval_chunks_fts.corpus_key
    AND (index_hash IS NULL OR index_hash = '' OR c.index_hash = index_hash)
    AND c.fts @@ websearch_to_tsquery('simple', search_query)
  ORDER BY rank DESC
  LIMIT GREATEST(1, LEAST(match_count, 50));
$$;