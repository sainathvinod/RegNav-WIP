// RegScout Country/Region/LOB Mappings
// Scalable data structure for multi-country support

import { Country, State } from '../types';

/**
 * Supported countries with region labels
 */
export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', label: 'States', regions: [] },
  { code: 'CA', name: 'Canada', label: 'Provinces and Territories', regions: [] },
  { code: 'UK', name: 'United Kingdom', label: 'Constituent Countries', regions: [] },
  { code: 'AU', name: 'Australia', label: 'States and Territories', regions: [] },
];

/**
 * Regions by country
 */
export const REGIONS_BY_COUNTRY: Record<string, State[]> = {
  // United States - All 50 states
  US: [
    { code: 'AL', name: 'Alabama', country: 'US', region: 'South', status: 'active' },
    { code: 'AK', name: 'Alaska', country: 'US', region: 'West', status: 'active' },
    { code: 'AZ', name: 'Arizona', country: 'US', region: 'West', status: 'active' },
    { code: 'AR', name: 'Arkansas', country: 'US', region: 'South', status: 'active' },
    { code: 'CA', name: 'California', country: 'US', region: 'West', status: 'active' },
    { code: 'CO', name: 'Colorado', country: 'US', region: 'West', status: 'active' },
    { code: 'CT', name: 'Connecticut', country: 'US', region: 'Northeast', status: 'active' },
    { code: 'DE', name: 'Delaware', country: 'US', region: 'South', status: 'active' },
    { code: 'FL', name: 'Florida', country: 'US', region: 'South', status: 'active' },
    { code: 'GA', name: 'Georgia', country: 'US', region: 'South', status: 'active' },
    { code: 'HI', name: 'Hawaii', country: 'US', region: 'West', status: 'active' },
    { code: 'ID', name: 'Idaho', country: 'US', region: 'West', status: 'active' },
    { code: 'IL', name: 'Illinois', country: 'US', region: 'Midwest', status: 'active' },
    { code: 'IN', name: 'Indiana', country: 'US', region: 'Midwest', status: 'active' },
    { code: 'IA', name: 'Iowa', country: 'US', region: 'Midwest', status: 'active' },
    { code: 'KS', name: 'Kansas', country: 'US', region: 'Midwest', status: 'active' },
    { code: 'KY', name: 'Kentucky', country: 'US', region: 'South', status: 'active' },
    { code: 'LA', name: 'Louisiana', country: 'US', region: 'South', status: 'active' },
    { code: 'ME', name: 'Maine', country: 'US', region: 'Northeast', status: 'active' },
    { code: 'MD', name: 'Maryland', country: 'US', region: 'South', status: 'active' },
    { code: 'MA', name: 'Massachusetts', country: 'US', region: 'Northeast', status: 'active' },
    { code: 'MI', name: 'Michigan', country: 'US', region: 'Midwest', status: 'active' },
    { code: 'MN', name: 'Minnesota', country: 'US', region: 'Midwest', status: 'active' },
    { code: 'MS', name: 'Mississippi', country: 'US', region: 'South', status: 'active' },
    { code: 'MO', name: 'Missouri', country: 'US', region: 'Midwest', status: 'active' },
    { code: 'MT', name: 'Montana', country: 'US', region: 'West', status: 'active' },
    { code: 'NE', name: 'Nebraska', country: 'US', region: 'Midwest', status: 'active' },
    { code: 'NV', name: 'Nevada', country: 'US', region: 'West', status: 'active' },
    { code: 'NH', name: 'New Hampshire', country: 'US', region: 'Northeast', status: 'active' },
    { code: 'NJ', name: 'New Jersey', country: 'US', region: 'Northeast', status: 'active' },
    { code: 'NM', name: 'New Mexico', country: 'US', region: 'West', status: 'active' },
    { code: 'NY', name: 'New York', country: 'US', region: 'Northeast', status: 'active' },
    { code: 'NC', name: 'North Carolina', country: 'US', region: 'South', status: 'active' },
    { code: 'ND', name: 'North Dakota', country: 'US', region: 'Midwest', status: 'active' },
    { code: 'OH', name: 'Ohio', country: 'US', region: 'Midwest', status: 'active' },
    { code: 'OK', name: 'Oklahoma', country: 'US', region: 'South', status: 'active' },
    { code: 'OR', name: 'Oregon', country: 'US', region: 'West', status: 'active' },
    { code: 'PA', name: 'Pennsylvania', country: 'US', region: 'Northeast', status: 'active' },
    { code: 'RI', name: 'Rhode Island', country: 'US', region: 'Northeast', status: 'active' },
    { code: 'SC', name: 'South Carolina', country: 'US', region: 'South', status: 'active' },
    { code: 'SD', name: 'South Dakota', country: 'US', region: 'Midwest', status: 'active' },
    { code: 'TN', name: 'Tennessee', country: 'US', region: 'South', status: 'active' },
    { code: 'TX', name: 'Texas', country: 'US', region: 'South', status: 'active' },
    { code: 'UT', name: 'Utah', country: 'US', region: 'West', status: 'active' },
    { code: 'VT', name: 'Vermont', country: 'US', region: 'Northeast', status: 'active' },
    { code: 'VA', name: 'Virginia', country: 'US', region: 'South', status: 'active' },
    { code: 'WA', name: 'Washington', country: 'US', region: 'West', status: 'active' },
    { code: 'WV', name: 'West Virginia', country: 'US', region: 'South', status: 'active' },
    { code: 'WI', name: 'Wisconsin', country: 'US', region: 'Midwest', status: 'active' },
    { code: 'WY', name: 'Wyoming', country: 'US', region: 'West', status: 'active' },
  ],

  // Canada - Provinces and Territories
  CA: [
    { code: 'AB', name: 'Alberta', country: 'CA', region: 'Western', status: 'active' },
    { code: 'BC', name: 'British Columbia', country: 'CA', region: 'Western', status: 'active' },
    { code: 'MB', name: 'Manitoba', country: 'CA', region: 'Central', status: 'active' },
    { code: 'NB', name: 'New Brunswick', country: 'CA', region: 'Atlantic', status: 'active' },
    { code: 'NL', name: 'Newfoundland and Labrador', country: 'CA', region: 'Atlantic', status: 'active' },
    { code: 'NS', name: 'Nova Scotia', country: 'CA', region: 'Atlantic', status: 'active' },
    { code: 'ON', name: 'Ontario', country: 'CA', region: 'Central', status: 'active' },
    { code: 'PE', name: 'Prince Edward Island', country: 'CA', region: 'Atlantic', status: 'active' },
    { code: 'QC', name: 'Quebec', country: 'CA', region: 'Central', status: 'active' },
    { code: 'SK', name: 'Saskatchewan', country: 'CA', region: 'Western', status: 'active' },
    { code: 'NT', name: 'Northwest Territories', country: 'CA', region: 'Northern', status: 'active' },
    { code: 'NU', name: 'Nunavut', country: 'CA', region: 'Northern', status: 'active' },
    { code: 'YT', name: 'Yukon', country: 'CA', region: 'Northern', status: 'active' },
  ],

  // United Kingdom - Countries
  UK: [
    { code: 'ENG', name: 'England', country: 'UK', region: 'UK', status: 'active' },
    { code: 'SCT', name: 'Scotland', country: 'UK', region: 'UK', status: 'active' },
    { code: 'WLS', name: 'Wales', country: 'UK', region: 'UK', status: 'active' },
    { code: 'NIR', name: 'Northern Ireland', country: 'UK', region: 'UK', status: 'active' },
  ],

  // Australia - States and Territories
  AU: [
    { code: 'NSW', name: 'New South Wales', country: 'AU', region: 'Eastern', status: 'active' },
    { code: 'VIC', name: 'Victoria', country: 'AU', region: 'Eastern', status: 'active' },
    { code: 'QLD', name: 'Queensland', country: 'AU', region: 'Eastern', status: 'active' },
    { code: 'SA', name: 'South Australia', country: 'AU', region: 'Southern', status: 'active' },
    { code: 'WA', name: 'Western Australia', country: 'AU', region: 'Western', status: 'active' },
    { code: 'TAS', name: 'Tasmania', country: 'AU', region: 'Southern', status: 'active' },
    { code: 'NT', name: 'Northern Territory', country: 'AU', region: 'Northern', status: 'active' },
    { code: 'ACT', name: 'Australian Capital Territory', country: 'AU', region: 'Eastern', status: 'active' },
  ],
};

/**
 * LOB Catalog with descriptions
 * This is the master list of all available LOBs
 */
export interface LOBDetails {
  id: string;
  name: string;
  icon: string;
  code: string;
  description: string;
}

export const LOB_CATALOG: Record<string, LOBDetails> = {
  commercial_auto: {
    id: 'commercial_auto',
    name: 'Commercial Auto',
    icon: '🚛',
    code: 'CA',
    description: 'Coverage for vehicles used for business operations.',
  },
  personal_auto: {
    id: 'personal_auto',
    name: 'Personal Auto',
    icon: '🚗',
    code: 'PA',
    description: 'Coverage for individually owned vehicles and drivers.',
  },
  workers_comp: {
    id: 'workers_comp',
    name: "Workers' Compensation",
    icon: '🏗️',
    code: 'WC',
    description: 'Coverage for employee work-related injuries and wage replacement.',
  },
  general_liability: {
    id: 'general_liability',
    name: 'General Liability',
    icon: '🛡️',
    code: 'GL',
    description: 'Coverage for third-party injury and property damage claims.',
  },
  professional_liability: {
    id: 'professional_liability',
    name: 'Professional Liability (E&O)',
    icon: '👩‍⚖️',
    code: 'PL',
    description: 'Coverage for negligence claims tied to professional services.',
  },
  umbrella: {
    id: 'umbrella',
    name: 'Umbrella',
    icon: '☔',
    code: 'UM',
    description: 'Additional liability coverage beyond other policies.',
  },
  commercial_property: {
    id: 'commercial_property',
    name: 'Commercial Property',
    icon: '🏢',
    code: 'CP',
    description: 'Protection for business property from fire, theft, and disasters.',
  },
  homeowners: {
    id: 'homeowners',
    name: 'Homeowners',
    icon: '🏠',
    code: 'HO',
    description: 'Coverage for private residences and personal property.',
  },
  life_insurance: {
    id: 'life_insurance',
    name: 'Life Insurance',
    icon: '❤️',
    code: 'LI',
    description: 'Monetary benefit to beneficiaries upon insured person\'s death.',
  },
  health_insurance: {
    id: 'health_insurance',
    name: 'Health Insurance',
    icon: '🏥',
    code: 'HI',
    description: 'Coverage for medical, surgical, and prescription drug expenses.',
  },
  dental_vision: {
    id: 'dental_vision',
    name: 'Dental & Vision',
    icon: '🦷',
    code: 'DV',
    description: 'Specialized insurance for dental and vision care.',
  },
  cyber_liability: {
    id: 'cyber_liability',
    name: 'Cyber Liability',
    icon: '💻',
    code: 'CY',
    description: 'Coverage for data breaches, cyber incidents, and related costs.',
  },
  surety_bonds: {
    id: 'surety_bonds',
    name: 'Surety Bonds',
    icon: '🤝',
    code: 'SB',
    description: 'Three-party agreement guaranteeing performance or payment.',
  },
  environmental: {
    id: 'environmental',
    name: 'Environmental Liability',
    icon: '🌳',
    code: 'EL',
    description: 'Coverage for pollution-related risks and cleanup costs.',
  },
};

/**
 * LOB availability by country and region
 * This demonstrates the scalable pattern without claiming completeness
 * 
 * Structure: LOB_BY_COUNTRY_REGION[country][region] = [lobId1, lobId2, ...]
 */
export const LOB_BY_COUNTRY_REGION: Record<string, Record<string, string[]>> = {
  // United States - Example mappings for key states
  US: {
    // California
    CA: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners', 'health_insurance', 'cyber_liability'],
    
    // Texas
    TX: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'commercial_property', 'homeowners', 'life_insurance'],
    
    // New York
    NY: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'professional_liability', 'homeowners', 'health_insurance', 'cyber_liability'],
    
    // Michigan
    MI: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'professional_liability', 'commercial_property', 'homeowners'],
    
    // North Carolina
    NC: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners'],
    
    // Florida
    FL: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners', 'commercial_property'],
    
    // Safe default for other US states
    DEFAULT: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners'],
  },

  // Canada - Example mappings for key provinces
  CA: {
    // Ontario
    ON: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners', 'professional_liability', 'commercial_property'],
    
    // Quebec
    QC: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners', 'commercial_property'],
    
    // British Columbia
    BC: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners', 'commercial_property', 'environmental'],
    
    // Alberta
    AB: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners', 'commercial_property', 'umbrella'],
    
    // Safe default for other Canadian provinces
    DEFAULT: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners'],
  },

  // United Kingdom - Example mappings
  UK: {
    // England
    ENG: ['commercial_auto', 'personal_auto', 'general_liability', 'professional_liability', 'homeowners', 'commercial_property', 'cyber_liability'],
    
    // Scotland
    SCT: ['commercial_auto', 'personal_auto', 'general_liability', 'homeowners', 'commercial_property'],
    
    // Wales
    WLS: ['commercial_auto', 'personal_auto', 'general_liability', 'homeowners', 'commercial_property'],
    
    // Northern Ireland
    NIR: ['commercial_auto', 'personal_auto', 'general_liability', 'homeowners'],
    
    // Safe default
    DEFAULT: ['commercial_auto', 'personal_auto', 'general_liability', 'homeowners'],
  },

  // Australia - Example mappings
  AU: {
    // New South Wales
    NSW: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners', 'professional_liability', 'commercial_property'],
    
    // Victoria
    VIC: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners', 'commercial_property', 'cyber_liability'],
    
    // Queensland
    QLD: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners', 'commercial_property'],
    
    // Western Australia
    WA: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners', 'environmental'],
    
    // Safe default for other Australian states
    DEFAULT: ['commercial_auto', 'personal_auto', 'workers_comp', 'general_liability', 'homeowners'],
  },
};

/**
 * Get available LOBs for selected regions (INTERSECTION logic)
 * Returns LOBs that are valid for ALL selected regions
 */
export function getAvailableLOBsForRegions(
  country: string,
  regionCodes: string[]
): string[] {
  if (regionCodes.length === 0) {
    // No regions selected - return all LOBs
    return Object.keys(LOB_CATALOG);
  }

  const countryLOBs = LOB_BY_COUNTRY_REGION[country];
  if (!countryLOBs) {
    // Country not in mapping - return all LOBs
    return Object.keys(LOB_CATALOG);
  }

  // Get LOB sets for each selected region
  const lobSets = regionCodes.map(regionCode => {
    const regionLOBs = countryLOBs[regionCode] || countryLOBs.DEFAULT || [];
    return new Set(regionLOBs);
  });

  if (lobSets.length === 0) {
    return Object.keys(LOB_CATALOG);
  }

  if (lobSets.length === 1) {
    return Array.from(lobSets[0]);
  }

  // Calculate intersection - only LOBs present in ALL selected regions
  const intersection = Array.from(lobSets[0]).filter(lob =>
    lobSets.every(set => set.has(lob))
  );

  return intersection;
}

/**
 * Get LOB details with description
 */
export function getLOBDetails(lobId: string): LOBDetails | null {
  return LOB_CATALOG[lobId] || null;
}

/**
 * Get regions for a country
 */
export function getRegionsForCountry(countryCode: string): State[] {
  return REGIONS_BY_COUNTRY[countryCode] || [];
}

/**
 * Get country details
 */
export function getCountryDetails(countryCode: string): Country | null {
  return COUNTRIES.find(c => c.code === countryCode) || null;
}

