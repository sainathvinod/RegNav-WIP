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
  
  // Wisconsin
  WI: ['wisconsin.gov', 'oci.wi.gov', 'dwd.wisconsin.gov', 'docs.legis.wisconsin.gov'],
};

/**
 * Authoritative industry-standard organizations
 * These are rating bureaus and advisory organizations that are PRIMARY sources
 * for regulatory information, policy forms, and filing requirements
 */
const AUTHORITATIVE_INDUSTRY_ORGS = [
  // National Organizations
  'ncci.com',              // National Council on Compensation Insurance
  'iso.com',               // Insurance Services Office
  'verisk.com',            // Verisk Analytics (parent of ISO)
  'aaisonline.com',        // American Association of Insurance Services
  
  // State-Specific Workers' Compensation Rating Bureaus
  'wcrb.org',              // Wisconsin Compensation Rating Bureau (CRITICAL)
  'wcribma.org',           // Workers' Comp Rating & Inspection Bureau of MA
  'dcrb.com',              // Delaware Compensation Rating Bureau
  'njcrib.org',            // New Jersey Compensation Rating & Inspection Bureau
  'ncrb.org',              // North Carolina Rate Bureau
  'pcrb.com',              // Pennsylvania Compensation Rating Bureau
  'mwcia.org',             // Midwest Compensation Insurance Association
  'scrbcc.com',            // South Carolina Reinsurance Facility
  'txsb.com',              // Texas Surplus Lines Stamping Office
  
  // Advisory Organizations
  'iii.org',               // Insurance Information Institute
  'irmi.com',              // International Risk Management Institute
  
  // Additional Rating Organizations
  'floir.com',             // Florida Office of Insurance Regulation
  'serff.com',             // System for Electronic Rate & Form Filing
];

/**
 * State-specific rating bureau mappings
 * Maps state codes to their primary rating bureau domains
 */
const STATE_RATING_BUREAUS: Record<string, string[]> = {
  WI: ['wcrb.org'],
  MA: ['wcribma.org'],
  DE: ['dcrb.com'],
  NJ: ['njcrib.org'],
  NC: ['ncrb.org'],
  PA: ['pcrb.com'],
  // NCCI states (most states use NCCI)
  DEFAULT_NCCI: ['ncci.com'],
};

/**
 * Check if a URL is from an authoritative source (government OR industry-standard organization)
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
    
    // STEP 1: Check if it's an authoritative industry organization
    // These are PRIMARY sources (rating bureaus, advisory orgs) - NOT optional
    const matchesIndustryOrg = AUTHORITATIVE_INDUSTRY_ORGS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );
    
    if (matchesIndustryOrg) {
      // For state-specific rating bureaus, verify it's relevant to the selected state(s)
      if (country === 'US' && stateCodes.length > 0) {
        // Check if this is a state-specific rating bureau
        for (const stateCode of stateCodes) {
          const stateRatingBureaus = STATE_RATING_BUREAUS[stateCode] || [];
          const matchesStateRatingBureau = stateRatingBureaus.some(domain =>
            hostname === domain || hostname.endsWith(`.${domain}`)
          );
          if (matchesStateRatingBureau) {
            return true; // State-specific rating bureau for selected state
          }
        }
        
        // Check if it's a national organization (NCCI, ISO, etc.) - these are valid for all states
        const nationalOrgs = ['ncci.com', 'iso.com', 'verisk.com', 'aaisonline.com', 'iii.org', 'irmi.com', 'serff.com'];
        if (nationalOrgs.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
          return true;
        }
        
        // If it's a state-specific bureau but for a different state, exclude it
        const isOtherStateRatingBureau = Object.values(STATE_RATING_BUREAUS)
          .flat()
          .some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
        
        if (isOtherStateRatingBureau) {
          return false; // Don't include rating bureaus from other states
        }
      }
      
      return true; // Industry org, verified or non-US
    }
    
    // STEP 2: Check country-level government patterns
    const countryPatterns = GOV_DOMAIN_PATTERNS[country] || [];
    const matchesCountryPattern = countryPatterns.some(pattern => pattern.test(hostname));
    
    if (!matchesCountryPattern) {
      return false; // Not gov and not industry org
    }
    
    // STEP 3: For US, verify it's from selected state(s) or federal
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
  // Note: 'gov-auto' now includes both government AND industry-standard sources (rating bureaus, etc.)
  const govSources = sources.filter(s => s.trustLevel === 'gov-auto');
  const userSources = sources.filter(s => s.trustLevel === 'user-added');
  
  const result: QualityCheckResult = {
    hasMinimumSources: govSources.length >= minimumGovSources,
    govSourceCount: govSources.length,
    userSourceCount: userSources.length,
  };
  
  if (govSources.length === 0) {
    result.warning = 'No authoritative sources found (government or rating bureaus). Consider selecting more document types or adjusting your search scope.';
  } else if (govSources.length < minimumGovSources) {
    result.warning = `Only ${govSources.length} authoritative source${govSources.length === 1 ? '' : 's'} found. Consider selecting more document types or adjusting scope.`;
  }
  
  return result;
}


