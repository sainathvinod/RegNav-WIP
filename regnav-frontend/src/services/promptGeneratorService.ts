// Meta-Prompt Generator Service
// Uses configured LLM to generate discovery prompts for any combination

import { LLMConfiguration } from '../types';
import { callLLMWithRetry } from './llm/llmClient';
import { US_STATES, LINES_OF_BUSINESS, REGULATORY_DOCUMENT_TYPES } from '../data/mockData';

/**
 * Meta-prompt for generating discovery prompts
 */
const generateMetaPrompt = (
  country: string,
  state: string,
  lob: string,
  docType: string,
  referencePrompt: string
): string => {
  const countryName = country === 'US' ? 'United States' : country;
  const stateName = US_STATES.find((s) => s.code === state)?.name || state;
  const lobName = LINES_OF_BUSINESS.find((l) => l.id === lob)?.name || lob;
  const docTypeName = REGULATORY_DOCUMENT_TYPES.find((d) => d.id === docType)?.name || docType;

  return `You are a prompt engineering expert specializing in regulatory compliance research. Your task is to generate a comprehensive, detailed discovery prompt for finding authoritative regulatory sources.

**TARGET CONFIGURATION:**
- Country: ${countryName}
- State/Region: ${stateName}
- Line of Business: ${lobName}
- Document Type: ${docTypeName}

**YOUR TASK:**
Generate a discovery prompt that an AI assistant will use to find ALL authoritative sources for "${docTypeName}" related to "${lobName}" in "${stateName}".

**REFERENCE PROMPT (Gold Standard - User-Configured Template):**
\`\`\`
${referencePrompt}
\`\`\`

**INSTRUCTIONS:**
1. Use the reference prompt above as your template for structure, clarity, and level of detail
2. Adapt it specifically for: ${stateName} + ${lobName} + ${docTypeName}
3. Research and include state-specific details:
   - Name the actual state agencies (e.g., "California Department of Insurance" not "State Department of Insurance")
   - Include state-specific rating bureaus or advisory organizations if they exist
   - Reference actual statute chapters or code sections if known
   - Include relevant industry-standard organizations for this LOB
4. Maintain the same level of specificity and emphasis (CRITICAL, MANDATORY, REQUIRED)
5. Keep the structured JSON output format identical
6. Ensure the prompt is comprehensive enough to find 5-10+ authoritative sources

**CRITICAL REQUIREMENTS:**
- The prompt MUST be at least as detailed as the reference prompt
- Include BOTH government sources AND industry-standard organizations
- Use strong directive language (CRITICAL, MANDATORY, DO NOT MISS)
- Provide specific examples and domains
- Maintain the JSON output structure exactly

**OUTPUT:**
Return ONLY the generated discovery prompt text. Do not include explanations, headers, or markdown formatting. The output should be ready to use directly as a prompt.`;
};

/**
 * Generate a discovery prompt using the configured LLM
 */
export const generateDiscoveryPrompt = async (
  country: string,
  state: string,
  lob: string,
  docType: string,
  llmConfig: LLMConfiguration,
  referencePrompt: string,
  onProgress?: (status: string) => void
): Promise<string> => {
  try {
    if (onProgress) onProgress('Generating prompt...');

    // Generate meta-prompt
    const metaPrompt = generateMetaPrompt(country, state, lob, docType, referencePrompt);

    // Call LLM to generate the discovery prompt
    if (onProgress) onProgress('Calling LLM to generate discovery prompt...');
    const generatedPrompt = await callLLMWithRetry(metaPrompt, {
      ...llmConfig,
      temperature: 0.3, // Lower for consistent prompt generation
      maxTokens: 3000,  // Prompts can be long
    });

    if (onProgress) onProgress('Prompt generated successfully');

    // Clean up any markdown formatting if present
    let cleanPrompt = generatedPrompt.trim();
    
    // Remove markdown code blocks if present
    cleanPrompt = cleanPrompt.replace(/^```[\w]*\n/gm, '').replace(/\n```$/gm, '');
    
    return cleanPrompt;
  } catch (error: any) {
    console.error('Failed to generate discovery prompt:', error);
    
    // Fallback to a basic prompt if generation fails
    const stateName = US_STATES.find((s) => s.code === state)?.name || state;
    const lobName = LINES_OF_BUSINESS.find((l) => l.id === lob)?.name || lob;
    const docTypeName = REGULATORY_DOCUMENT_TYPES.find((d) => d.id === docType)?.name || docType;
    
    return `You are an expert regulatory compliance analyst. Find ALL authoritative sources for ${docTypeName} related to ${lobName} in ${stateName}.

Include both government sources (.gov) and industry-standard organizations (.org, .com).

Return results as a JSON array with: source_url, agency_name, document_title, description, confidence_score, authority_type.`;
  }
};

/**
 * Validate that a generated prompt is suitable for discovery
 */
export const validateDiscoveryPrompt = (prompt: string): {
  isValid: boolean;
  warnings: string[];
} => {
  const warnings: string[] = [];
  
  // Check minimum length
  if (prompt.length < 500) {
    warnings.push('Prompt seems too short (< 500 characters)');
  }
  
  // Check for key elements
  if (!prompt.toLowerCase().includes('json')) {
    warnings.push('Prompt does not mention JSON output format');
  }
  
  if (!prompt.toLowerCase().includes('government') && !prompt.toLowerCase().includes('.gov')) {
    warnings.push('Prompt does not mention government sources');
  }
  
  if (!prompt.toLowerCase().includes('authoritative') && !prompt.toLowerCase().includes('official')) {
    warnings.push('Prompt does not emphasize authoritative sources');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
  };
};

