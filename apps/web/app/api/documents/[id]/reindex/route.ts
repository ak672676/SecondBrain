import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth/get-user';
import { processDocument } from '@/lib/pipeline/process-document';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;

    // Verify ownership
    const { data: doc } = await supabase
      .from('documents')
      .select('id, user_id')
      .eq('id', documentId)
      .eq('user_id', user.userId)
      .single();

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete existing chunks
    await supabase.from('chunks').delete().eq('document_id', documentId);

    // Reset status and chunk count
    await supabase
      .from('documents')
      .update({ status: 'uploading', chunk_count: 0 })
      .eq('id', documentId);

    // Re-run pipeline (fire-and-forget)
    processDocument(documentId, user.userId).catch((err) => {
      console.error('Re-index failed for document:', documentId, err);
    });

    return NextResponse.json({ success: true, message: 'Re-indexing started' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
