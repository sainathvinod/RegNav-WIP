// Anthropic Claude API Client
import { LLMConfiguration, LLMTestResult } from '../../types';

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  temperature?: number;
  top_p?: number;
}

export interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Call Anthropic Claude API
 */
export const callAnthropicAPI = async (
  prompt: string,
  config: LLMConfiguration
): Promise<string> => {
  if (!config.apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const startTime = Date.now();

  const requestBody: AnthropicRequest = {
    model: config.model,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    top_p: config.topP,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(config.timeout * 1000),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Anthropic API error: ${response.status} ${response.statusText}${
        errorData.error?.message ? ` - ${errorData.error.message}` : ''
      }`
    );
  }

  const data: AnthropicResponse = await response.json();
  const latency = Date.now() - startTime;

  console.log(`Anthropic API call completed in ${latency}ms`);
  console.log(`Tokens used: ${data.usage.input_tokens} in, ${data.usage.output_tokens} out`);

  if (data.content && data.content.length > 0 && data.content[0].text) {
    return data.content[0].text;
  }

  throw new Error('Unexpected response format from Anthropic API');
};

/**
 * Test Anthropic API connection
 */
export const testAnthropicConnection = async (
  config: LLMConfiguration
): Promise<LLMTestResult> => {
  const startTime = Date.now();

  try {
    if (!config.apiKey) {
      return {
        success: false,
        message: 'API key is required',
        error: 'No API key provided',
      };
    }

    const testPrompt = 'Respond with "OK" to confirm connection.';
    const response = await callAnthropicAPI(testPrompt, {
      ...config,
      maxTokens: 10,
      temperature: 0,
    });

    const latency = Date.now() - startTime;

    if (response && response.length > 0) {
      return {
        success: true,
        message: `Connected successfully to ${config.model}`,
        latency,
        model: config.model,
      };
    }

    return {
      success: false,
      message: 'Unexpected response from API',
      error: 'Empty or invalid response',
    };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      message: 'Connection failed',
      latency,
      error: error.message || 'Unknown error',
    };
  }
};

