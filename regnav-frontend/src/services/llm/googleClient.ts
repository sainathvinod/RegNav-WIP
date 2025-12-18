// Google Gemini API Client
import { LLMConfiguration, LLMTestResult } from '../../types';

export interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Call Google Gemini API
 */
export const callGoogleAPI = async (
  prompt: string,
  config: LLMConfiguration
): Promise<string> => {
  if (!config.apiKey) {
    throw new Error('Google API key not configured');
  }

  const startTime = Date.now();

  const requestBody: GeminiRequest = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: config.temperature,
      topP: config.topP,
      maxOutputTokens: config.maxTokens,
    },
  };

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(config.timeout * 1000),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Google API error: ${response.status} ${response.statusText}${
        errorData.error?.message ? ` - ${errorData.error.message}` : ''
      }`
    );
  }

  const data: GeminiResponse = await response.json();
  const latency = Date.now() - startTime;

  console.log(`Google API call completed in ${latency}ms`);
  if (data.usageMetadata) {
    console.log(`Tokens used: ${data.usageMetadata.promptTokenCount} in, ${data.usageMetadata.candidatesTokenCount} out`);
  }

  if (
    data.candidates &&
    data.candidates.length > 0 &&
    data.candidates[0].content?.parts &&
    data.candidates[0].content.parts.length > 0
  ) {
    return data.candidates[0].content.parts[0].text;
  }

  throw new Error('Unexpected response format from Google API');
};

/**
 * Test Google API connection
 */
export const testGoogleConnection = async (
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
    const response = await callGoogleAPI(testPrompt, {
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

