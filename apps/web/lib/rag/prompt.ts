import { LLMMessage } from '@/lib/llm/types';
import { RetrievedChunk } from './retrieve';

const SYSTEM_PROMPT = `You are a helpful knowledge assistant. Answer questions using ONLY the provided context from the user's documents.

Rules:
- Always cite the source document name when using information from it (e.g., "According to [document.pdf]...")
- If the answer is not in the provided context, clearly state that you don't have enough information in the uploaded documents to answer
- Be concise and accurate
- If multiple documents contain relevant information, synthesize them and cite each source`;

// Build the full prompt for the LLM: system + context + conversation history + question.
export function buildPrompt(
  query: string,
  chunks: RetrievedChunk[],
  conversationHistory: LLMMessage[]
): LLMMessage[] {
  const messages: LLMMessage[] = [];

  // System message with retrieved context
  let systemContent = SYSTEM_PROMPT;

  if (chunks.length > 0) {
    systemContent += '\n\n--- Retrieved Context ---\n';
    chunks.forEach((chunk, i) => {
      systemContent += `\n[${i + 1}] From "${chunk.documentName}":\n${chunk.content}\n`;
    });
    systemContent += '\n--- End Context ---';
  } else {
    systemContent += '\n\nNo documents have been uploaded yet. Let the user know they need to upload documents first.';
  }

  messages.push({ role: 'system', content: systemContent });

  // Conversation memory: last 6 messages (3 exchanges)
  const recentHistory = conversationHistory.slice(-6);
  messages.push(...recentHistory);

  // Current user question
  messages.push({ role: 'user', content: query });

  return messages;
}
