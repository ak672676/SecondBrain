import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMMessage, ChatOptions } from '../types';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
    this.client = new Anthropic({ apiKey });
    this.model = process.env.LLM_MODEL || 'claude-sonnet-4-20250514';
  }

  async chat(messages: LLMMessage[], options?: ChatOptions): Promise<ReadableStream<string>> {
    // Anthropic takes system as a separate parameter
    const systemMsg = messages.find((m) => m.role === 'system');
    const nonSystemMsgs = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const stream = this.client.messages.stream({
      model: this.model,
      system: systemMsg?.content || '',
      messages: nonSystemMsgs,
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.7,
    });

    return new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(event.delta.text);
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
  }
}
