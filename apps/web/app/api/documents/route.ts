import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth/get-user';
import { processDocument } from '@/lib/pipeline/process-document';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES: Record<string, string> = {
  'text/markdown': '.md',
  'text/plain': '.txt',
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/csv': '.csv',
};

const ALLOWED_EXTENSIONS = ['.md', '.txt', '.pdf', '.docx', '.csv'];

function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.')).toLowerCase();
}

// GET /api/documents — list user's documents
export async function GET() {
  try {
    const user = getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, name, file_type, file_size, chunk_count, status, created_at')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json({ documents });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/documents — upload a new document
export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const ext = getFileExtension(file.name);
    const mimeAllowed = ALLOWED_TYPES[file.type];
    const extAllowed = ALLOWED_EXTENSIONS.includes(ext);

    if (!mimeAllowed && !extAllowed) {
      return NextResponse.json(
        { error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const fileType = ext.replace('.', '');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${user.userId}/${randomUUID()}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, buffer, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    const { data: document, error: insertError } = await supabase
      .from('documents')
      .insert({
        user_id: user.userId,
        name: file.name,
        file_type: fileType,
        file_size: file.size,
        status: 'uploading',
        storage_path: storagePath,
      })
      .select('id, name, file_type, file_size, status, created_at')
      .single();

    if (insertError) {
      await supabase.storage.from('uploads').remove([storagePath]);
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
    }

    // Fire-and-forget: run the pipeline in the background
    processDocument(document.id, user.userId).catch((err) => {
      console.error('Pipeline failed for document:', document.id, err);
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
