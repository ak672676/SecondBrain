-- Postgres function for vector similarity search.
-- Used by the RAG pipeline to find the most relevant chunks for a query.
-- Uses cosine distance (<=> operator) with the existing ivfflat index.
create or replace function match_chunks(
  query_embedding vector(384),
  match_user_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  document_id uuid,
  document_name text,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.content,
    c.document_id,
    d.name as document_name,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.document_id
  where c.user_id = match_user_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
