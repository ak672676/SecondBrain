import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/auth/get-user';
import { retrieveChunks } from '@/lib/rag/retrieve';
import { buildPrompt } from '@/lib/rag/prompt';
import { chatWithLLM, LLMMessage } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, conversationId: existingConvId } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. Create or load conversation
    let conversationId = existingConvId;

    if (!conversationId) {
      const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
      const { data: conv, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.userId, title })
        .select('id')
        .single();
      if (error || !conv) {
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }
      conversationId = conv.id;
    } else {
      // Verify ownership
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', user.userId)
        .single();
      if (!conv) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
    }

    // 2. Save user message
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
    });

    // 3. Load conversation history (last 6 messages for memory)
    const { data: historyRows } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    const history: LLMMessage[] = (historyRows || [])
      .slice(-6)
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // 4. Retrieve relevant chunks via vector search
    const chunks = await retrieveChunks(message, user.userId);

    // 5. Build the prompt
    // Remove the last message from history (it's the current question, we add it in buildPrompt)
    const promptHistory = history.slice(0, -1);
    const llmMessages = buildPrompt(message, chunks, promptHistory);

    // 6. Get LLM stream
    const llmStream = await chatWithLLM(llmMessages);

    // 7. Build SSE response stream — deduplicate sources by document
    const seenDocs = new Set<string>();
    const sources = chunks
      .filter((c) => {
        if (seenDocs.has(c.documentId)) return false;
        seenDocs.add(c.documentId);
        return true;
      })
      .map((c) => ({
        documentId: c.documentId,
        documentName: c.documentName,
        chunkPreview: c.content.slice(0, 100) + '...',
      }));

    let fullResponse = '';
    const encoder = new TextEncoder();

    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          const reader = llmStream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            fullResponse += value;
            const event = `data: ${JSON.stringify({ type: 'token', content: value })}\n\n`;
            controller.enqueue(encoder.encode(event));
          }

          // Send done event with metadata
          const doneEvent = `data: ${JSON.stringify({
            type: 'done',
            conversationId,
            sources,
          })}\n\n`;
          controller.enqueue(encoder.encode(doneEvent));

          // Save assistant message to DB
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullResponse,
            sources,
          });

          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            message: 'An error occurred while generating the response.',
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
          controller.close();
        }
      },
    });

    return new Response(sseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
