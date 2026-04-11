import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth/get-user';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const documentId = params.id;

    // Fetch document to verify ownership and get storage path
    const { data: doc } = await supabase
      .from('documents')
      .select('id, storage_path, user_id')
      .eq('id', documentId)
      .eq('user_id', user.userId)
      .single();

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete file from Supabase Storage
    await supabase.storage.from('uploads').remove([doc.storage_path]);

    // Delete document record — chunks are cascade-deleted automatically
    await supabase.from('documents').delete().eq('id', documentId);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
