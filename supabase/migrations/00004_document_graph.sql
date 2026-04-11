-- Computes the knowledge graph: mean embedding per document + pairwise cosine similarities.
-- Returns JSON with nodes (documents) and edges (similarity pairs above threshold).
create or replace function get_document_graph(
  p_user_id uuid,
  p_min_similarity float default 0.5
)
returns json
language sql stable
as $$
  with doc_embeddings as (
    select
      c.document_id,
      avg(c.embedding) as mean_embedding
    from chunks c
    join documents d on d.id = c.document_id
    where c.user_id = p_user_id
      and d.status = 'indexed'
    group by c.document_id
  ),
  nodes as (
    select
      d.id,
      d.name,
      d.file_type,
      d.chunk_count
    from documents d
    join doc_embeddings de on de.document_id = d.id
  ),
  edges as (
    select
      a.document_id as source,
      b.document_id as target,
      round((1 - (a.mean_embedding <=> b.mean_embedding))::numeric, 4) as similarity
    from doc_embeddings a
    join doc_embeddings b on a.document_id < b.document_id
    where 1 - (a.mean_embedding <=> b.mean_embedding) >= p_min_similarity
  )
  select json_build_object(
    'nodes', (select coalesce(json_agg(row_to_json(n)), '[]'::json) from nodes n),
    'edges', (select coalesce(json_agg(row_to_json(e)), '[]'::json) from edges e)
  );
$$;
