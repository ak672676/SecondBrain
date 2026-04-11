const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_OVERLAP = 50;

// Splits text into chunks of ~maxTokens words with overlap.
// Uses word count as a token approximation (~1 word ≈ 1 token).
export function chunkText(
  text: string,
  maxTokens = DEFAULT_MAX_TOKENS,
  overlap = DEFAULT_OVERLAP
): string[] {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length === 0) return [];
  if (words.length <= maxTokens) return [words.join(' ')];

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + maxTokens, words.length);
    chunks.push(words.slice(start, end).join(' '));

    if (end >= words.length) break;
    start = end - overlap;
  }

  return chunks;
}

// Markdown: split on ## headings first, then token-chunk each section.
// This preserves section boundaries so a chunk about "Authentication"
// doesn't bleed into a chunk about "Deployment".
function chunkMarkdown(
  text: string,
  maxTokens = DEFAULT_MAX_TOKENS,
  overlap = DEFAULT_OVERLAP
): string[] {
  const sections = text.split(/(?=^## )/m);
  const chunks: string[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    chunks.push(...chunkText(trimmed, maxTokens, overlap));
  }

  return chunks.length > 0 ? chunks : chunkText(text, maxTokens, overlap);
}

// Main dispatch: picks the right chunking strategy based on file type.
export function chunkDocument(
  content: string | string[],
  fileType: string
): string[] {
  // CSV: parser already returns one string per row — these are the chunks
  if (fileType === 'csv' && Array.isArray(content)) {
    return content.filter((row) => row.trim().length > 0);
  }

  const text = content as string;

  // Markdown: split on ## headings first
  if (fileType === 'md') {
    return chunkMarkdown(text);
  }

  // All other formats: standard token chunking
  return chunkText(text);
}
