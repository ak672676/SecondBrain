import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth/get-user';

export async function GET(
  _request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify conversation belongs to user
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', params.conversationId)
      .eq('user_id', user.userId)
      .single();

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Fetch messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, role, content, sources, created_at')
      .eq('conversation_id', params.conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
