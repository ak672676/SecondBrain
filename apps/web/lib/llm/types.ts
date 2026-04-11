export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

// All LLM providers implement this interface.
// chat() returns a ReadableStream of text deltas (string chunks).
export interface LLMProvider {
  chat(messages: LLMMessage[], options?: ChatOptions): Promise<ReadableStream<string>>;
}
