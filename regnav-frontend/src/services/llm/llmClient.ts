// Unified LLM Client - Routes to appropriate provider
import { LLMConfiguration, LLMTestResult } from '../../types';
import { callOpenAIAPI, testOpenAIConnection } from './openaiClient';
import { callAnthropicAPI, testAnthropicConnection } from './anthropicClient';
import { callGoogleAPI, testGoogleConnection } from './googleClient';

/**
 * Call the appropriate LLM API based on configuration
 */
export const callLLM = async (
  prompt: string,
  config: LLMConfiguration,
  systemPrompt?: string
): Promise<string> => {
  switch (config.provider) {
    case 'openai':
    case 'azure':
      return callOpenAIAPI(prompt, config, systemPrompt);
    
    case 'anthropic':
      return callAnthropicAPI(prompt, config);
    
    case 'google':
      return callGoogleAPI(prompt, config);
    
    case 'ollama':
      // Ollama uses OpenAI-compatible API
      // User needs to set up Ollama locally and configure endpoint if needed
      return callOpenAIAPI(prompt, {
        ...config,
        // Override API endpoint for Ollama if needed (default: http://localhost:11434)
        // This would require adding an endpoint field to LLMConfiguration
      });
    
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
};

/**
 * Test LLM connection for any provider
 */
export const testLLMConnection = async (
  config: LLMConfiguration
): Promise<LLMTestResult> => {
  try {
    switch (config.provider) {
      case 'openai':
      case 'azure':
        return await testOpenAIConnection(config);
      
      case 'anthropic':
        return await testAnthropicConnection(config);
      
      case 'google':
        return await testGoogleConnection(config);
      
      case 'ollama':
        // Ollama uses OpenAI-compatible API
        return await testOpenAIConnection(config);
      
      default:
        return {
          success: false,
          message: 'Unsupported provider',
          error: `Provider "${config.provider}" is not supported`,
        };
    }
  } catch (error: any) {
    return {
      success: false,
      message: 'Test failed',
      error: error.message || 'Unknown error occurred',
    };
  }
};

/**
 * Parse LLM response for structured data (JSON)
 */
export const parseLLMResponse = <T = any>(response: string): T | null => {
  try {
    // Try to find JSON in the response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                     response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    }
    
    // If the entire response is JSON
    return JSON.parse(response);
  } catch (error) {
    console.warn('Failed to parse LLM response as JSON:', error);
    return null;
  }
};

/**
 * Retry wrapper for LLM calls
 */
export const callLLMWithRetry = async (
  prompt: string,
  config: LLMConfiguration,
  systemPrompt?: string
): Promise<string> => {
  let lastError: Error | null = null;
  const maxRetries = config.retries || 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await callLLM(prompt, config, systemPrompt);
    } catch (error: any) {
      lastError = error;
      console.warn(`LLM call attempt ${attempt + 1} failed:`, error.message);
      
      // Don't retry on authentication errors
      if (error.message.includes('401') || error.message.includes('403') || error.message.includes('API key')) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('LLM call failed after retries');
};

