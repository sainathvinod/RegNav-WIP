// Source Quality and Government Authorization Utilities

/**
 * Government domain patterns by country
 */
const GOV_DOMAIN_PATTERNS: Record<string, RegExp[]> = {
  US: [
    /\.gov$/,
    /\.state\.[a-z]{2}\.us$/,
    /\.us$/,
  ],
  CA: [
    /\.gc\.ca$/,
    /\.gov\.[a-z]{2}\.ca$/,
    /\.canada\.ca$/,
  ],
  UK: [
    /\.gov\.uk$/,
    /\.parliament\.uk$/,
  ],
  AU: [
    /\.gov\.au$/,
    /\.australia\.gov\.au$/,
  ],
};

/**
 * State-specific government domains (examples for scalability)
 * This is NOT complete - just demonstrates the pattern
 */
const STATE_GOV_DOMAINS: Record<string, string[]> = {
  // Michigan
  MI: ['michigan.gov', 'difs.gov', 'lara.state.mi.us'],
  
  // California
  CA: ['ca.gov', 'dir.ca.gov', 'insurance.ca.gov', 'dmv.ca.gov'],
  
  // Texas
  TX: ['texas.gov', 'tdi.texas.gov', 'dps.texas.gov'],
  
  // New York
  NY: ['ny.gov', 'dfs.ny.gov', 'dmv.ny.gov'],
  
  // North Carolina
  NC: ['nc.gov', 'ncdoi.gov', 'ncdmv.gov'],
};

/**
 * Check if a URL is from a government-authorized domain
 * for the given country and state(s)
 */
export function isGovAuthorizedAutoSource(
  url: string,
  country: string,
  stateCodes: string[]
): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check country-level gov patterns
    const countryPatterns = GOV_DOMAIN_PATTERNS[country] || [];
    const matchesCountryPattern = countryPatterns.some(pattern => pattern.test(hostname));
    
    if (!matchesCountryPattern) {
      return false;
    }
    
    // For US, additionally verify it's from selected state(s) or federal
    if (country === 'US' && stateCodes.length > 0) {
      // Allow federal domains (like .gov without state prefix)
      if (hostname.endsWith('.gov') && !hostname.includes('.state.')) {
        return true;
      }
      
      // Check if matches any selected state's known domains
      const matchesStateGovDomain = stateCodes.some(stateCode => {
        const stateDomains = STATE_GOV_DOMAINS[stateCode] || [];
        return stateDomains.some(domain => hostname.includes(domain));
      });
      
      if (matchesStateGovDomain) {
        return true;
      }
      
      // Check if hostname contains state code pattern
      const statePattern = new RegExp(`\\.(${stateCodes.join('|').toLowerCase()})\\.`, 'i');
      if (statePattern.test(hostname)) {
        return true;
      }
      
      // Default: if it's .gov but we can't verify the state, be conservative
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Categorize source by trust level
 */
export type SourceTrustLevel = 'gov-auto' | 'user-added';

export function getSourceTrustLevel(
  source: { discoveryMethod: string; sourceUrl: string },
  country: string,
  stateCodes: string[]
): SourceTrustLevel {
  if (source.discoveryMethod === 'user_provided') {
    return 'user-added';
  }
  
  if (source.discoveryMethod === 'ai_discovered' && 
      isGovAuthorizedAutoSource(source.sourceUrl, country, stateCodes)) {
    return 'gov-auto';
  }
  
  return 'user-added';
}

/**
 * Get warning message for non-gov sources
 */
export function getNonGovWarning(url: string): string {
  return 'User-added: not government-authorized';
}

/**
 * Validate if we have sufficient quality sources
 */
export interface QualityCheckResult {
  hasMinimumSources: boolean;
  govSourceCount: number;
  userSourceCount: number;
  warning?: string;
}

export function checkSourceQuality(
  sources: Array<{ trustLevel?: SourceTrustLevel }>,
  minimumGovSources: number = 3
): QualityCheckResult {
  const govSources = sources.filter(s => s.trustLevel === 'gov-auto');
  const userSources = sources.filter(s => s.trustLevel === 'user-added');
  
  const result: QualityCheckResult = {
    hasMinimumSources: govSources.length >= minimumGovSources,
    govSourceCount: govSources.length,
    userSourceCount: userSources.length,
  };
  
  if (govSources.length === 0) {
    result.warning = 'No government-authorized sources found. Consider selecting more document types or adjusting your search scope.';
  } else if (govSources.length < minimumGovSources) {
    result.warning = `Only ${govSources.length} authorized source${govSources.length === 1 ? '' : 's'} found. Consider selecting more document types or adjusting scope.`;
  }
  
  return result;
}


