// RegScout AI-Powered Regulatory Source Discovery Service

import { ScoutingConfiguration, ScoutingJob, RegulatorySource } from '../types';
import { US_STATES, LINES_OF_BUSINESS, REGULATORY_DOCUMENT_TYPES } from '../data/mockData';

// Simulated authoritative regulatory sources database
// In production, this would be AI-discovered and validated
const KNOWN_REGULATORY_SOURCES: Record<string, { baseUrl: string; agency: string; patterns: string[] }> = {
  CA: {
    baseUrl: 'https://www.dir.ca.gov',
    agency: 'California Department of Industrial Relations',
    patterns: ['/dwc/', '/chswc/', '/wcirb/'],
  },
  MI: {
    baseUrl: 'https://www.michigan.gov',
    agency: 'Michigan Department of Insurance and Financial Services',
    patterns: ['/difs/', '/lara/'],
  },
  WI: {
    baseUrl: 'https://oci.wi.gov',
    agency: 'Wisconsin Office of the Commissioner of Insurance',
    patterns: ['/pages/', '/publications/'],
  },
  TX: {
    baseUrl: 'https://www.tdi.texas.gov',
    agency: 'Texas Department of Insurance',
    patterns: ['/wc/', '/rules/'],
  },
  AZ: {
    baseUrl: 'https://difi.az.gov',
    agency: 'Arizona Department of Insurance and Financial Institutions',
    patterns: ['/consumers/', '/industry/'],
  },
  NY: {
    baseUrl: 'https://www.dfs.ny.gov',
    agency: 'New York Department of Financial Services',
    patterns: ['/insurance/', '/regulations/'],
  },
  FL: {
    baseUrl: 'https://www.floir.com',
    agency: 'Florida Office of Insurance Regulation',
    patterns: ['/sections/', '/data-reports/'],
  },
};

// Simulated AI prompts for different LLM providers
const generateSearchPrompt = (
  state: string,
  lob: string,
  docType: string,
  llmProvider: string
): string => {
  const stateName = US_STATES.find((s) => s.code === state)?.name || state;
  const lobName = LINES_OF_BUSINESS.find((l) => l.id === lob)?.name || lob;
  const docTypeName = REGULATORY_DOCUMENT_TYPES.find((d) => d.id === docType)?.name || docType;

  return `You are a regulatory compliance expert. Find all authoritative government sources for ${docTypeName} related to ${lobName} in ${stateName}.

Requirements:
1. Only include official government websites (.gov, .state.*.us)
2. Identify the primary regulatory agency
3. Locate specific pages with filing requirements, forms, or manuals
4. Extract effective dates and version information if available
5. Verify the URL is currently active

Provide results in JSON format with: source_url, agency_name, document_title, effective_date, confidence_score`;
};

// Simulated AI discovery function
const simulateAIDiscovery = async (
  state: string,
  lob: string,
  docType: string,
  llmConfig: ScoutingConfiguration['llmConfig']
): Promise<RegulatorySource[]> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

  const sources: RegulatorySource[] = [];
  const stateInfo = KNOWN_REGULATORY_SOURCES[state];
  
  if (!stateInfo) {
    // For states we don't have mock data, generate a generic source
    const stateName = US_STATES.find((s) => s.code === state)?.name || state;
    sources.push({
      id: `${state}-${lob}-${docType}-1`,
      country: 'US',
      stateCode: state,
      lineOfBusiness: lob,
      documentType: docType,
      sourceUrl: `https://insurance.${state.toLowerCase()}.gov`,
      sourceName: `${stateName} Insurance Department - Main Portal`,
      agencyName: `${stateName} Department of Insurance`,
      discoveryMethod: 'ai_discovered',
      status: 'pending_review',
      confidenceScore: 0.75,
      metadata: {
        lastVerified: new Date().toISOString(),
        format: 'Web',
        language: 'English',
        jurisdiction: state,
        category: 'General Information',
        tags: [lob, docType, 'regulatory'],
      },
      createdAt: new Date().toISOString(),
      discoveredBy: `${llmConfig.provider}:${llmConfig.model}`,
    });
    return sources;
  }

  // Generate multiple sources for states with known data
  const lobInfo = LINES_OF_BUSINESS.find((l) => l.id === lob);
  const docTypeInfo = REGULATORY_DOCUMENT_TYPES.find((d) => d.id === docType);
  
  // Source 1: Main department page
  sources.push({
    id: `${state}-${lob}-${docType}-main`,
    country: 'US',
    stateCode: state,
    lineOfBusiness: lob,
    documentType: docType,
    sourceUrl: `${stateInfo.baseUrl}${stateInfo.patterns[0]}`,
    sourceName: `${stateInfo.agency} - ${docTypeInfo?.name || docType} Portal`,
    agencyName: stateInfo.agency,
    effectiveDate: '2024-01-01',
    discoveryMethod: 'ai_discovered',
    status: 'active',
    confidenceScore: 0.95,
    metadata: {
      lastVerified: new Date().toISOString(),
      format: docTypeInfo?.format || 'Web',
      language: 'English',
      jurisdiction: state,
      category: 'Primary Source',
      tags: [lob, docType, 'official', 'regulatory'],
      contactInfo: `Contact: ${stateInfo.agency}`,
    },
    createdAt: new Date().toISOString(),
    discoveredBy: `${llmConfig.provider}:${llmConfig.model}`,
    validationResult: {
      isValid: true,
      statusCode: 200,
      contentType: 'text/html',
      lastChecked: new Date().toISOString(),
    },
  });

  // Source 2: Forms and filing requirements
  sources.push({
    id: `${state}-${lob}-${docType}-forms`,
    country: 'US',
    stateCode: state,
    lineOfBusiness: lob,
    documentType: docType,
    sourceUrl: `${stateInfo.baseUrl}${stateInfo.patterns[1]}forms-${docType.toLowerCase()}`,
    sourceName: `${docTypeInfo?.name || docType} Filing Forms and Instructions`,
    agencyName: stateInfo.agency,
    effectiveDate: '2024-01-01',
    discoveryMethod: 'ai_discovered',
    status: 'active',
    confidenceScore: 0.92,
    metadata: {
      lastVerified: new Date().toISOString(),
      format: 'PDF',
      fileSize: '2.3 MB',
      pages: 45,
      language: 'English',
      jurisdiction: state,
      category: 'Forms & Templates',
      tags: [lob, docType, 'forms', 'filing requirements'],
    },
    createdAt: new Date().toISOString(),
    discoveredBy: `${llmConfig.provider}:${llmConfig.model}`,
    validationResult: {
      isValid: true,
      statusCode: 200,
      contentType: 'application/pdf',
      lastChecked: new Date().toISOString(),
    },
  });

  // Source 3: Manual or guidelines
  sources.push({
    id: `${state}-${lob}-${docType}-manual`,
    country: 'US',
    stateCode: state,
    lineOfBusiness: lob,
    documentType: docType,
    sourceUrl: `${stateInfo.baseUrl}${stateInfo.patterns[2] || stateInfo.patterns[0]}manual-${lobInfo?.code || lob}`,
    sourceName: `${lobInfo?.name || lob} Filing Manual - ${state}`,
    agencyName: stateInfo.agency,
    effectiveDate: '2023-07-01',
    expirationDate: '2024-12-31',
    discoveryMethod: 'ai_discovered',
    status: 'active',
    confidenceScore: 0.88,
    metadata: {
      lastVerified: new Date().toISOString(),
      format: 'PDF',
      fileSize: '15.7 MB',
      pages: 234,
      language: 'English',
      jurisdiction: state,
      category: 'Regulatory Manual',
      tags: [lob, docType, 'manual', 'guidelines', 'comprehensive'],
    },
    createdAt: new Date().toISOString(),
    discoveredBy: `${llmConfig.provider}:${llmConfig.model}`,
    validationResult: {
      isValid: true,
      statusCode: 200,
      contentType: 'application/pdf',
      lastChecked: new Date().toISOString(),
    },
  });

  // Source 4: Bulletins and updates
  sources.push({
    id: `${state}-${lob}-${docType}-bulletins`,
    country: 'US',
    stateCode: state,
    lineOfBusiness: lob,
    documentType: docType,
    sourceUrl: `${stateInfo.baseUrl}/bulletins/2024`,
    sourceName: `Recent Regulatory Bulletins - ${lobInfo?.name || lob}`,
    agencyName: stateInfo.agency,
    discoveryMethod: 'ai_discovered',
    status: 'active',
    confidenceScore: 0.85,
    metadata: {
      lastVerified: new Date().toISOString(),
      format: 'Web',
      language: 'English',
      jurisdiction: state,
      category: 'Updates & Bulletins',
      tags: [lob, docType, 'bulletins', 'updates', 'recent'],
    },
    createdAt: new Date().toISOString(),
    discoveredBy: `${llmConfig.provider}:${llmConfig.model}`,
    validationResult: {
      isValid: true,
      statusCode: 200,
      contentType: 'text/html',
      lastChecked: new Date().toISOString(),
    },
  });

  return sources;
};

/**
 * Main scouting function - discovers regulatory sources using AI
 */
export const executeScoutingJob = async (
  config: ScoutingConfiguration,
  onProgress?: (job: Partial<ScoutingJob>) => void
): Promise<ScoutingJob> => {
  const jobId = `scout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const job: ScoutingJob = {
    id: jobId,
    configuration: config,
    status: 'running',
    progress: 0,
    startedAt: new Date().toISOString(),
    sourcesFound: 0,
    sourcesValidated: 0,
    results: [],
  };

  try {
    // Calculate total combinations to search
    const totalSearches = config.states.length * config.linesOfBusiness.length * config.documentTypes.length;
    let completedSearches = 0;
    const allSources: RegulatorySource[] = [];

    // Iterate through all combinations
    for (const state of config.states) {
      for (const lob of config.linesOfBusiness) {
        for (const docType of config.documentTypes) {
          try {
            // Simulate AI discovery
            const sources = await simulateAIDiscovery(state, lob, docType, config.llmConfig);
            
            // Filter by confidence threshold
            const filteredSources = sources.filter(
              (s) => s.confidenceScore >= config.confidenceThreshold
            );
            
            allSources.push(...filteredSources);
            completedSearches++;

            // Update progress
            const progress = Math.round((completedSearches / totalSearches) * 100);
            job.progress = progress;
            job.sourcesFound = allSources.length;
            job.sourcesValidated = allSources.filter((s) => s.validationResult?.isValid).length;

            if (onProgress) {
              onProgress({
                progress,
                sourcesFound: allSources.length,
                sourcesValidated: job.sourcesValidated,
              });
            }
          } catch (error) {
            console.error(`Error discovering sources for ${state}-${lob}-${docType}:`, error);
            job.errors = job.errors || [];
            job.errors.push(`Failed to discover sources for ${state}-${lob}-${docType}: ${error}`);
          }
        }
      }
    }

    // Apply max results limit
    const finalSources = config.maxResults > 0 
      ? allSources.slice(0, config.maxResults)
      : allSources;

    // Complete the job
    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date().toISOString();
    job.results = finalSources;
    job.sourcesFound = finalSources.length;
    job.sourcesValidated = finalSources.filter((s) => s.validationResult?.isValid).length;
    job.executionTime = new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime();

    if (onProgress) {
      onProgress(job);
    }

    return job;
  } catch (error) {
    job.status = 'failed';
    job.completedAt = new Date().toISOString();
    job.errors = [`Critical error: ${error}`];
    
    if (onProgress) {
      onProgress(job);
    }

    throw error;
  }
};

/**
 * Validate a specific URL (simulated)
 */
export const validateSourceUrl = async (url: string): Promise<boolean> => {
  // Simulate validation delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // Basic validation - check if it's a valid URL and appears to be a government site
  try {
    const urlObj = new URL(url);
    const isGovSite = urlObj.hostname.endsWith('.gov') || 
                      urlObj.hostname.includes('.state.') ||
                      urlObj.hostname.endsWith('.us');
    return isGovSite;
  } catch {
    return false;
  }
};

/**
 * Get AI prompt that would be used for discovery (for transparency)
 */
export const getDiscoveryPrompt = (
  state: string,
  lob: string,
  docType: string,
  llmProvider: string
): string => {
  return generateSearchPrompt(state, lob, docType, llmProvider);
};

/**
 * Estimate cost and time for a scouting job
 */
export const estimateScoutingJob = (config: ScoutingConfiguration): {
  estimatedTime: number;
  estimatedCost: number;
  totalSearches: number;
} => {
  const totalSearches = 
    config.states.length * 
    config.linesOfBusiness.length * 
    config.documentTypes.length;

  // Estimate 2-3 seconds per search
  const estimatedTimeSeconds = totalSearches * 2.5;
  
  // Estimate cost based on LLM provider (tokens per search * cost per token)
  const tokensPerSearch = 1500; // Average for prompt + response
  const providerCosts: Record<string, number> = {
    'openai': 0.00003,
    'anthropic': 0.000015,
    'google': 0.0000005,
    'azure': 0.00003,
    'ollama': 0,
  };
  
  const costPerToken = providerCosts[config.llmConfig.provider] || 0;
  const estimatedCost = totalSearches * tokensPerSearch * costPerToken;

  return {
    estimatedTime: Math.round(estimatedTimeSeconds),
    estimatedCost: parseFloat(estimatedCost.toFixed(4)),
    totalSearches,
  };
};

