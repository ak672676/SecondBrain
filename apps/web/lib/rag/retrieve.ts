import { supabase } from '@/lib/supabase/client';
import { embedTexts } from '@/lib/embeddings/client';

export interface RetrievedChunk {
  id: string;
  content: string;
  documentId: string;
  documentName: string;
  similarity: number;
}

// Embed the query and find the top matching chunks via pgvector cosine similarity.
export async function retrieveChunks(
  query: string,
  userId: string,
  topK: number = 5
): Promise<RetrievedChunk[]> {
  // 1. Embed the query
  const [queryEmbedding] = await embedTexts([query]);

  // 2. Call the match_chunks Postgres function
  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_user_id: userId,
    match_count: topK,
  });

  if (error) {
    console.error('Retrieval error:', error);
    return [];
  }

  return (data || []).map((row: { id: string; content: string; document_id: string; document_name: string; similarity: number }) => ({
    id: row.id,
    content: row.content,
    documentId: row.document_id,
    documentName: row.document_name,
    similarity: row.similarity,
  }));
}
