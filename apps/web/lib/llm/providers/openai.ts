import OpenAI from 'openai';
import { LLMProvider, LLMMessage, ChatOptions } from '../types';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
    this.client = new OpenAI({ apiKey });
    this.model = process.env.LLM_MODEL || 'gpt-4o-mini';
  }

  async chat(messages: LLMMessage[], options?: ChatOptions): Promise<ReadableStream<string>> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    });

    return new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) controller.enqueue(text);
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
  }
}
