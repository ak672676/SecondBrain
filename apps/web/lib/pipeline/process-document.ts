import { supabase } from '@/lib/supabase/client';
import { parseDocument } from '@/lib/parsers';
import { chunkDocument } from '@/lib/chunking';
import { embedTexts } from '@/lib/embeddings/client';

const EMBED_BATCH_SIZE = 50;  // chunks per embedding request
const DB_BATCH_SIZE = 100;    // rows per DB insert

export async function processDocument(
  documentId: string,
  userId: string
): Promise<void> {
  try {
    // 1. Fetch document metadata
    const { data: doc, error } = await supabase
      .from('documents')
      .select('storage_path, file_type')
      .eq('id', documentId)
      .single();

    if (error || !doc) throw new Error('Document not found');

    // 2. Update status → parsing
    await updateStatus(documentId, 'parsing');

    // 3. Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('uploads')
      .download(doc.storage_path);

    if (downloadError || !fileData) throw new Error('Failed to download file');

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // 4. Parse raw text from the file
    const parsed = await parseDocument(buffer, doc.file_type);

    // 5. Chunk the content
    const chunks = chunkDocument(parsed, doc.file_type);

    if (chunks.length === 0) throw new Error('No content extracted from document');

    // 6. Update status → embedding
    await updateStatus(documentId, 'embedding');

    // 7. Generate embeddings in batches of 50
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const embeddings = await embedTexts(batch);
      allEmbeddings.push(...embeddings);
    }

    // 8. Store chunks + embeddings in DB (batches of 100)
    for (let i = 0; i < chunks.length; i += DB_BATCH_SIZE) {
      const batchRows = chunks.slice(i, i + DB_BATCH_SIZE).map((content, j) => ({
        user_id: userId,
        document_id: documentId,
        content,
        embedding: JSON.stringify(allEmbeddings[i + j]),
        chunk_index: i + j,
      }));

      const { error: insertError } = await supabase.from('chunks').insert(batchRows);
      if (insertError) throw new Error(`Failed to insert chunks: ${insertError.message}`);
    }

    // 9. Mark as indexed with final chunk count
    await supabase
      .from('documents')
      .update({ status: 'indexed', chunk_count: chunks.length })
      .eq('id', documentId);

    console.log(`Document ${documentId} indexed: ${chunks.length} chunks`);
  } catch (err) {
    console.error(`Pipeline error for document ${documentId}:`, err);
    await updateStatus(documentId, 'error');
  }
}

async function updateStatus(documentId: string, status: string) {
  await supabase
    .from('documents')
    .update({ status })
    .eq('id', documentId);
}
