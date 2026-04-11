import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth/get-user';

export async function GET() {
  try {
    const user = getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase.rpc('get_document_graph', {
      p_user_id: user.userId,
      p_min_similarity: 0.5,
    });

    if (error) {
      console.error('Graph error:', error);
      return NextResponse.json({ error: 'Failed to compute graph' }, { status: 500 });
    }

    return NextResponse.json(data || { nodes: [], edges: [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
