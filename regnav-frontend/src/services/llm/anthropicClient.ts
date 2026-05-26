// Anthropic Claude API Client
//
// PHASE 0 NOTE: This client still accepts an API key from the browser and
// forwards it through the legacy proxy. That is a known security gap and
// will be removed in Phase 1 when the FastAPI backend handles all LLM
// credentials via Azure Key Vault. For now the proxy URL is at least
// environment-driven instead of hardcoded.
import { LLMConfiguration, LLMTestResult } from '../../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
const PROXY_URL = `${API_BASE_URL.replace(/\/$/, '')}/api/anthropic`;

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
 * Call Anthropic Claude API via the RegNav proxy/backend.
 */
export const callAnthropicAPI = async (
  prompt: string,
  config: LLMConfiguration,
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

  const proxyRequestBody = { ...requestBody, apiKey: config.apiKey };

  let response: Response;
  try {
    response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proxyRequestBody),
      signal: AbortSignal.timeout(config.timeout * 1000),
    });
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === 'TypeError' && err.message?.includes('Failed to fetch')) {
      throw new Error(
        `Cannot connect to RegNav backend at ${PROXY_URL}. ` +
          `Confirm the backend is running and VITE_API_BASE_URL points at it.`,
      );
    }
    throw error;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Anthropic API error: ${response.status} ${response.statusText}${
        errorData.error?.message ? ` - ${errorData.error.message}` : ''
      }`,
    );
  }

  const data: AnthropicResponse = await response.json();
  const latency = Date.now() - startTime;

  if (import.meta.env.DEV) {
    console.debug(
      `[anthropic] ${config.model} ${latency}ms in=${data.usage.input_tokens} out=${data.usage.output_tokens}`,
    );
  }

  if (data.content && data.content.length > 0 && data.content[0].text) {
    return data.content[0].text;
  }

  throw new Error('Unexpected response format from Anthropic API');
};

/**
 * Test Anthropic API connection.
 */
export const testAnthropicConnection = async (
  config: LLMConfiguration,
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
  } catch (error: unknown) {
    const err = error as { message?: string };
    const latency = Date.now() - startTime;
    return {
      success: false,
      message: 'Connection failed',
      latency,
      error: err.message ?? 'Unknown error',
    };
  }
};
