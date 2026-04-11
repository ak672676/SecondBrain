import Groq from 'groq-sdk';
import { LLMProvider, LLMMessage, ChatOptions } from '../types';

export class GroqProvider implements LLMProvider {
  private client: Groq;
  private model: string;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set');
    this.client = new Groq({ apiKey });
    this.model = process.env.LLM_MODEL || 'llama-3.3-70b-versatile';
  }

  async chat(messages: LLMMessage[], options?: ChatOptions): Promise<ReadableStream<string>> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
    });

    // Convert Groq's async iterable into a ReadableStream<string>
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
