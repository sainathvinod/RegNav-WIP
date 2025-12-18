// Comprehensive Mock Data for RegNav.AI

import { Country, State, LineOfBusiness, RegulatoryDocumentType, LLMProvider } from '../types';

export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', label: 'State', regions: ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West'] },
  { code: 'CA', name: 'Canada', label: 'Province', regions: ['Eastern', 'Central', 'Western', 'Northern'] },
  { code: 'UK', name: 'United Kingdom', label: 'Country', regions: ['England', 'Scotland', 'Wales', 'Northern Ireland'] },
  { code: 'AU', name: 'Australia', label: 'State', regions: ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS'] },
];

export const US_STATES: State[] = [
  // Active states with mock data
  { code: 'AL', name: 'Alabama', country: 'US', region: 'Southeast', status: 'active', rulesCount: 0 },
  { code: 'AK', name: 'Alaska', country: 'US', region: 'West', status: 'inactive', rulesCount: 0 },
  { code: 'AZ', name: 'Arizona', country: 'US', region: 'Southwest', status: 'pending', rulesCount: 89 },
  { code: 'AR', name: 'Arkansas', country: 'US', region: 'Southeast', status: 'inactive', rulesCount: 0 },
  { code: 'CA', name: 'California', country: 'US', region: 'West', status: 'pending', rulesCount: 234 },
  { code: 'CO', name: 'Colorado', country: 'US', region: 'West', status: 'inactive', rulesCount: 0 },
  { code: 'CT', name: 'Connecticut', country: 'US', region: 'Northeast', status: 'inactive', rulesCount: 0 },
  { code: 'DE', name: 'Delaware', country: 'US', region: 'Northeast', status: 'inactive', rulesCount: 0 },
  { code: 'FL', name: 'Florida', country: 'US', region: 'Southeast', status: 'inactive', rulesCount: 0 },
  { code: 'GA', name: 'Georgia', country: 'US', region: 'Southeast', status: 'inactive', rulesCount: 0 },
  { code: 'HI', name: 'Hawaii', country: 'US', region: 'West', status: 'inactive', rulesCount: 0 },
  { code: 'ID', name: 'Idaho', country: 'US', region: 'West', status: 'inactive', rulesCount: 0 },
  { code: 'IL', name: 'Illinois', country: 'US', region: 'Midwest', status: 'inactive', rulesCount: 0 },
  { code: 'IN', name: 'Indiana', country: 'US', region: 'Midwest', status: 'inactive', rulesCount: 0 },
  { code: 'IA', name: 'Iowa', country: 'US', region: 'Midwest', status: 'inactive', rulesCount: 0 },
  { code: 'KS', name: 'Kansas', country: 'US', region: 'Midwest', status: 'inactive', rulesCount: 0 },
  { code: 'KY', name: 'Kentucky', country: 'US', region: 'Southeast', status: 'inactive', rulesCount: 0 },
  { code: 'LA', name: 'Louisiana', country: 'US', region: 'Southeast', status: 'inactive', rulesCount: 0 },
  { code: 'ME', name: 'Maine', country: 'US', region: 'Northeast', status: 'inactive', rulesCount: 0 },
  { code: 'MD', name: 'Maryland', country: 'US', region: 'Northeast', status: 'inactive', rulesCount: 0 },
  { code: 'MA', name: 'Massachusetts', country: 'US', region: 'Northeast', status: 'inactive', rulesCount: 0 },
  { code: 'MI', name: 'Michigan', country: 'US', region: 'Midwest', status: 'active', rulesCount: 142 },
  { code: 'MN', name: 'Minnesota', country: 'US', region: 'Midwest', status: 'inactive', rulesCount: 0 },
  { code: 'MS', name: 'Mississippi', country: 'US', region: 'Southeast', status: 'inactive', rulesCount: 0 },
  { code: 'MO', name: 'Missouri', country: 'US', region: 'Midwest', status: 'inactive', rulesCount: 0 },
  { code: 'MT', name: 'Montana', country: 'US', region: 'West', status: 'inactive', rulesCount: 0 },
  { code: 'NE', name: 'Nebraska', country: 'US', region: 'Midwest', status: 'inactive', rulesCount: 0 },
  { code: 'NV', name: 'Nevada', country: 'US', region: 'West', status: 'inactive', rulesCount: 0 },
  { code: 'NH', name: 'New Hampshire', country: 'US', region: 'Northeast', status: 'inactive', rulesCount: 0 },
  { code: 'NJ', name: 'New Jersey', country: 'US', region: 'Northeast', status: 'inactive', rulesCount: 0 },
  { code: 'NM', name: 'New Mexico', country: 'US', region: 'Southwest', status: 'inactive', rulesCount: 0 },
  { code: 'NY', name: 'New York', country: 'US', region: 'Northeast', status: 'inactive', rulesCount: 0 },
  { code: 'NC', name: 'North Carolina', country: 'US', region: 'Southeast', status: 'inactive', rulesCount: 0 },
  { code: 'ND', name: 'North Dakota', country: 'US', region: 'Midwest', status: 'inactive', rulesCount: 0 },
  { code: 'OH', name: 'Ohio', country: 'US', region: 'Midwest', status: 'inactive', rulesCount: 0 },
  { code: 'OK', name: 'Oklahoma', country: 'US', region: 'Southwest', status: 'inactive', rulesCount: 0 },
  { code: 'OR', name: 'Oregon', country: 'US', region: 'West', status: 'inactive', rulesCount: 0 },
  { code: 'PA', name: 'Pennsylvania', country: 'US', region: 'Northeast', status: 'inactive', rulesCount: 0 },
  { code: 'RI', name: 'Rhode Island', country: 'US', region: 'Northeast', status: 'inactive', rulesCount: 0 },
  { code: 'SC', name: 'South Carolina', country: 'US', region: 'Southeast', status: 'inactive', rulesCount: 0 },
  { code: 'SD', name: 'South Dakota', country: 'US', region: 'Midwest', status: 'inactive', rulesCount: 0 },
  { code: 'TN', name: 'Tennessee', country: 'US', region: 'Southeast', status: 'inactive', rulesCount: 0 },
  { code: 'TX', name: 'Texas', country: 'US', region: 'Southwest', status: 'pending', rulesCount: 67 },
  { code: 'UT', name: 'Utah', country: 'US', region: 'West', status: 'inactive', rulesCount: 0 },
  { code: 'VT', name: 'Vermont', country: 'US', region: 'Northeast', status: 'inactive', rulesCount: 0 },
  { code: 'VA', name: 'Virginia', country: 'US', region: 'Southeast', status: 'inactive', rulesCount: 0 },
  { code: 'WA', name: 'Washington', country: 'US', region: 'West', status: 'inactive', rulesCount: 0 },
  { code: 'WV', name: 'West Virginia', country: 'US', region: 'Southeast', status: 'inactive', rulesCount: 0 },
  { code: 'WI', name: 'Wisconsin', country: 'US', region: 'Midwest', status: 'active', rulesCount: 156 },
  { code: 'WY', name: 'Wyoming', country: 'US', region: 'West', status: 'inactive', rulesCount: 0 },
];

export const LINES_OF_BUSINESS: LineOfBusiness[] = [
  // Auto Insurance
  {
    id: 'commercial_auto',
    name: 'Commercial Auto',
    code: 'CA',
    description: 'Commercial vehicle insurance coverage',
    icon: '🚛',
    category: 'auto',
    subTypes: ['Fleet', 'Trucking', 'Delivery', 'Taxi/Rideshare'],
  },
  {
    id: 'personal_auto',
    name: 'Personal Auto',
    code: 'PA',
    description: 'Personal vehicle insurance coverage',
    icon: '🚗',
    category: 'auto',
    subTypes: ['Liability', 'Collision', 'Comprehensive', 'Uninsured Motorist'],
  },
  // Workers Compensation
  {
    id: 'workers_comp',
    name: "Workers' Compensation",
    code: 'WC',
    description: 'Workers compensation insurance policies and filings',
    icon: '🏗️',
    category: 'workers_comp',
    subTypes: ['Standard', 'Monopolistic State', 'Self-Insured'],
  },
  // Liability
  {
    id: 'general_liability',
    name: 'General Liability',
    code: 'GL',
    description: 'General liability insurance policies',
    icon: '🛡️',
    category: 'liability',
    subTypes: ['Commercial GL', 'Products Liability', 'Professional Liability'],
  },
  {
    id: 'umbrella_excess',
    name: 'Umbrella/Excess Liability',
    code: 'UMB',
    description: 'Umbrella and excess liability coverage',
    icon: '☂️',
    category: 'liability',
  },
  {
    id: 'professional_liability',
    name: 'Professional Liability (E&O)',
    code: 'PROF',
    description: 'Professional liability and errors & omissions',
    icon: '💼',
    category: 'liability',
    subTypes: ['Medical Malpractice', 'Legal Malpractice', 'Technology E&O', 'Directors & Officers'],
  },
  // Property
  {
    id: 'commercial_property',
    name: 'Commercial Property',
    code: 'CP',
    description: 'Commercial property insurance',
    icon: '🏢',
    category: 'property',
    subTypes: ['Building', 'Business Personal Property', 'Business Income', 'Equipment Breakdown'],
  },
  {
    id: 'homeowners',
    name: 'Homeowners',
    code: 'HO',
    description: 'Residential property insurance',
    icon: '🏠',
    category: 'property',
    subTypes: ['HO-3', 'HO-4 (Renters)', 'HO-6 (Condo)', 'HO-8 (Older Homes)'],
  },
  // Life & Health
  {
    id: 'life_insurance',
    name: 'Life Insurance',
    code: 'LIFE',
    description: 'Individual and group life insurance',
    icon: '❤️',
    category: 'life',
    subTypes: ['Term Life', 'Whole Life', 'Universal Life', 'Variable Life', 'Group Life'],
  },
  {
    id: 'health_insurance',
    name: 'Health Insurance',
    code: 'HEALTH',
    description: 'Medical and health coverage',
    icon: '🏥',
    category: 'health',
    subTypes: ['Individual', 'Group', 'Medicare Supplement', 'Long-Term Care', 'Disability'],
  },
  {
    id: 'dental_vision',
    name: 'Dental & Vision',
    code: 'DV',
    description: 'Dental and vision insurance',
    icon: '🦷',
    category: 'health',
  },
  // Specialty
  {
    id: 'cyber_liability',
    name: 'Cyber Liability',
    code: 'CYBER',
    description: 'Cybersecurity and data breach coverage',
    icon: '🔒',
    category: 'specialty',
    subTypes: ['First-Party', 'Third-Party', 'Ransomware', 'Privacy Liability'],
  },
  {
    id: 'surety_bonds',
    name: 'Surety Bonds',
    code: 'SURETY',
    description: 'Contract and commercial surety bonds',
    icon: '📜',
    category: 'specialty',
  },
  {
    id: 'environmental',
    name: 'Environmental',
    code: 'ENV',
    description: 'Environmental liability and pollution coverage',
    icon: '🌱',
    category: 'specialty',
  },
];

export const REGULATORY_DOCUMENT_TYPES: RegulatoryDocumentType[] = [
  {
    id: 'wcpols',
    name: 'WCPOLS',
    code: 'WCPOLS',
    description: 'Workers Compensation Policy Language Reporting Format',
    applicableStates: ['ALL'],
    applicableLOBs: ['workers_comp'],
    format: 'PDF',
  },
  {
    id: 'wcstats',
    name: 'WCSTAT',
    code: 'WCSTAT',
    description: 'Workers Compensation Statistical Reporting',
    applicableStates: ['ALL'],
    applicableLOBs: ['workers_comp'],
    format: 'PDF',
  },
  {
    id: 'iso_forms',
    name: 'ISO Forms',
    code: 'ISO',
    description: 'Insurance Services Office standardized forms',
    applicableStates: ['ALL'],
    applicableLOBs: ['general_liability', 'commercial_auto', 'commercial_property'],
    format: 'PDF',
  },
  {
    id: 'rate_filing',
    name: 'Rate Filing Manual',
    code: 'RATE',
    description: 'State-specific rate filing requirements',
    applicableStates: ['ALL'],
    applicableLOBs: ['ALL'],
    format: 'PDF',
  },
  {
    id: 'dmv_requirements',
    name: 'DMV Requirements',
    code: 'DMV',
    description: 'Department of Motor Vehicles filing requirements',
    applicableStates: ['ALL'],
    applicableLOBs: ['personal_auto', 'commercial_auto'],
    format: 'Web',
  },
  {
    id: 'naic_filing',
    name: 'NAIC Filing',
    code: 'NAIC',
    description: 'National Association of Insurance Commissioners filing',
    applicableStates: ['ALL'],
    applicableLOBs: ['ALL'],
    format: 'PDF',
  },
  {
    id: 'state_bulletin',
    name: 'State Bulletins',
    code: 'BULLETIN',
    description: 'Official state insurance department bulletins',
    applicableStates: ['ALL'],
    applicableLOBs: ['ALL'],
    format: 'PDF',
  },
  {
    id: 'statute',
    name: 'Insurance Statutes',
    code: 'STATUTE',
    description: 'State insurance code and statutes',
    applicableStates: ['ALL'],
    applicableLOBs: ['ALL'],
    format: 'Web',
  },
  {
    id: 'form_filing',
    name: 'Form Filing Guidelines',
    code: 'FORM',
    description: 'Policy form filing and approval guidelines',
    applicableStates: ['ALL'],
    applicableLOBs: ['ALL'],
    format: 'PDF',
  },
  {
    id: 'classification_code',
    name: 'Classification Codes',
    code: 'CLASS',
    description: 'Industry classification code manuals',
    applicableStates: ['ALL'],
    applicableLOBs: ['workers_comp', 'general_liability'],
    format: 'Excel',
  },
];

export const LLM_PROVIDERS: LLMProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    provider: 'openai',
    requiresApiKey: true,
    supportsStreaming: true,
    maxContextWindow: 128000,
    models: [
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Most capable model, best for complex tasks',
        maxTokens: 4096,
        costPerToken: 0.00003,
        speedRating: 'medium',
        qualityRating: 'high',
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Previous generation, still very capable',
        maxTokens: 8192,
        costPerToken: 0.00003,
        speedRating: 'slow',
        qualityRating: 'high',
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Faster and cheaper, good for simple tasks',
        maxTokens: 4096,
        costPerToken: 0.000002,
        speedRating: 'fast',
        qualityRating: 'medium',
      },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    provider: 'anthropic',
    requiresApiKey: true,
    supportsStreaming: true,
    maxContextWindow: 200000,
    models: [
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        description: 'Most intelligent model, best reasoning',
        maxTokens: 4096,
        costPerToken: 0.000015,
        speedRating: 'medium',
        qualityRating: 'high',
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance and cost',
        maxTokens: 4096,
        costPerToken: 0.000003,
        speedRating: 'fast',
        qualityRating: 'high',
      },
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Fastest response times',
        maxTokens: 4096,
        costPerToken: 0.00000025,
        speedRating: 'fast',
        qualityRating: 'medium',
      },
    ],
  },
  {
    id: 'google',
    name: 'Google AI',
    provider: 'google',
    requiresApiKey: true,
    supportsStreaming: true,
    maxContextWindow: 1000000,
    models: [
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Advanced multimodal capabilities',
        maxTokens: 8192,
        costPerToken: 0.0000005,
        speedRating: 'fast',
        qualityRating: 'high',
      },
      {
        id: 'gemini-ultra',
        name: 'Gemini Ultra',
        description: 'Most capable Google model',
        maxTokens: 8192,
        costPerToken: 0.00001,
        speedRating: 'medium',
        qualityRating: 'high',
      },
    ],
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    provider: 'azure',
    requiresApiKey: true,
    supportsStreaming: true,
    maxContextWindow: 128000,
    models: [
      {
        id: 'gpt-4-azure',
        name: 'GPT-4 (Azure)',
        description: 'Enterprise-grade OpenAI models',
        maxTokens: 8192,
        costPerToken: 0.00003,
        speedRating: 'medium',
        qualityRating: 'high',
      },
    ],
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    provider: 'ollama',
    requiresApiKey: false,
    supportsStreaming: true,
    maxContextWindow: 32000,
    models: [
      {
        id: 'llama2',
        name: 'Llama 2',
        description: 'Open source, runs locally',
        maxTokens: 4096,
        costPerToken: 0,
        speedRating: 'fast',
        qualityRating: 'medium',
      },
      {
        id: 'mistral',
        name: 'Mistral',
        description: 'Efficient open source model',
        maxTokens: 8192,
        costPerToken: 0,
        speedRating: 'fast',
        qualityRating: 'medium',
      },
    ],
  },
];

export const DEFAULT_LLM_CONFIG = {
  provider: 'openai',
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 4000,
  topP: 1.0,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  timeout: 60,
  retries: 3,
  enableCaching: true,
  enableStreaming: false,
};

// State-specific LOB mappings (examples - not exhaustive)
// This demonstrates the scalable pattern without claiming completeness
export const LOB_BY_STATE: Record<string, string[]> = {
  MI: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'professional_liability', 'commercial_property', 'homeowners'],
  CA: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners', 'health_insurance'],
  TX: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'commercial_property', 'homeowners', 'life_insurance'],
  NY: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'professional_liability', 'homeowners', 'health_insurance'],
  NC: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners'],
  // Default for states not explicitly mapped
  DEFAULT: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners'],
};

// State-specific Document Type mappings (examples - not exhaustive)
export const DOC_TYPES_BY_STATE: Record<string, string[]> = {
  MI: ['wcpols', 'wcstats', 'iso_forms', 'rate_filing', 'dmv_requirements', 'state_bulletin'],
  CA: ['wcpols', 'wcstats', 'iso_forms', 'rate_filing', 'dmv_requirements', 'state_bulletin', 'statute'],
  TX: ['wcpols', 'iso_forms', 'rate_filing', 'dmv_requirements', 'state_bulletin', 'form_filing'],
  NY: ['wcpols', 'wcstats', 'iso_forms', 'rate_filing', 'state_bulletin', 'statute', 'form_filing'],
  NC: ['wcpols', 'iso_forms', 'rate_filing', 'dmv_requirements', 'state_bulletin'],
  // Default for states not explicitly mapped
  DEFAULT: ['wcpols', 'iso_forms', 'rate_filing', 'state_bulletin'],
};

/**
 * Get available LOBs for selected states (INTERSECTION)
 * Only returns LOBs that are valid for ALL selected states
 */
export function getAvailableLOBsForStates(stateCodes: string[]): string[] {
  if (stateCodes.length === 0) {
    return LINES_OF_BUSINESS.map(lob => lob.id);
  }
  
  // Get LOBs for each state
  const lobSets = stateCodes.map(stateCode => {
    const stateLobs = LOB_BY_STATE[stateCode] || LOB_BY_STATE.DEFAULT;
    return new Set(stateLobs);
  });
  
  // Return intersection
  if (lobSets.length === 1) {
    return Array.from(lobSets[0]);
  }
  
  const intersection = Array.from(lobSets[0]).filter(lob =>
    lobSets.every(set => set.has(lob))
  );
  
  return intersection;
}

/**
 * Get available Doc Types for selected states (INTERSECTION)
 */
export function getAvailableDocTypesForStates(stateCodes: string[]): string[] {
  if (stateCodes.length === 0) {
    return REGULATORY_DOCUMENT_TYPES.map(dt => dt.id);
  }
  
  // Get doc types for each state
  const docTypeSets = stateCodes.map(stateCode => {
    const stateDocTypes = DOC_TYPES_BY_STATE[stateCode] || DOC_TYPES_BY_STATE.DEFAULT;
    return new Set(stateDocTypes);
  });
  
  // Return intersection
  if (docTypeSets.length === 1) {
    return Array.from(docTypeSets[0]);
  }
  
  const intersection = Array.from(docTypeSets[0]).filter(docType =>
    docTypeSets.every(set => set.has(docType))
  );
  
  return intersection;
}

