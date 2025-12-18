// OpenAI GPT API Client
import { LLMConfiguration, LLMTestResult } from '../../types';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call OpenAI GPT API
 */
export const callOpenAIAPI = async (
  prompt: string,
  config: LLMConfiguration,
  systemPrompt?: string
): Promise<string> => {
  if (!config.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const startTime = Date.now();

  const messages: OpenAIMessage[] = [];
  
  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt,
    });
  }
  
  messages.push({
    role: 'user',
    content: prompt,
  });

  const requestBody: OpenAIRequest = {
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    top_p: config.topP,
    frequency_penalty: config.frequencyPenalty,
    presence_penalty: config.presencePenalty,
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(config.timeout * 1000),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText}${
        errorData.error?.message ? ` - ${errorData.error.message}` : ''
      }`
    );
  }

  const data: OpenAIResponse = await response.json();
  const latency = Date.now() - startTime;

  console.log(`OpenAI API call completed in ${latency}ms`);
  console.log(`Tokens used: ${data.usage.prompt_tokens} in, ${data.usage.completion_tokens} out`);

  if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
    return data.choices[0].message.content;
  }

  throw new Error('Unexpected response format from OpenAI API');
};

/**
 * Test OpenAI API connection
 */
export const testOpenAIConnection = async (
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
    const response = await callOpenAIAPI(testPrompt, {
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

