const EMBEDDING_URL = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:3001';

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await fetch(`${EMBEDDING_URL}/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Embedding service error (${response.status}): ${(err as { error?: string }).error || 'unknown'}`);
  }

  const data = await response.json();
  return data.embeddings;
}
