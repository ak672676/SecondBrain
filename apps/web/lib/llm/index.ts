import { LLMProvider, LLMMessage, ChatOptions } from './types';

// Factory: creates the active LLM provider based on LLM_PROVIDER env var.
// To swap providers, change LLM_PROVIDER and LLM_MODEL in .env.local.
function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || 'groq';

  switch (provider) {
    case 'groq': {
      const { GroqProvider } = require('./providers/groq');
      return new GroqProvider();
    }
    case 'openai': {
      const { OpenAIProvider } = require('./providers/openai');
      return new OpenAIProvider();
    }
    case 'anthropic': {
      const { AnthropicProvider } = require('./providers/anthropic');
      return new AnthropicProvider();
    }
    default:
      throw new Error(`Unknown LLM provider: ${provider}. Use groq, openai, or anthropic.`);
  }
}

// Convenience function — use this throughout the app.
export async function chatWithLLM(
  messages: LLMMessage[],
  options?: ChatOptions
): Promise<ReadableStream<string>> {
  const provider = getLLMProvider();
  return provider.chat(messages, options);
}

export type { LLMMessage, ChatOptions, LLMProvider };
