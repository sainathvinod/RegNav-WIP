/**
 * Wisconsin-specific regulatory mappings
 * State-accurate LOB → Document Type mappings and mandatory items
 */

export interface MandatoryItem {
  title: string;
  description: string;
  docType: string;
  authority?: string;
}

/**
 * WI-specific: Document types available per Line of Business
 * Complete doc type sets based on WI DWD, WI OCI, and WI Legislature
 */
export const WI_LOB_TO_DOC_TYPES: Record<string, string[]> = {
  workers_comp: [
    'wcpols',          // WCPOLS policy language reporting
    'wcstats',         // WCSTAT statistical reporting
    'statute',         // WI Statutes Chapter 102 (Workers' Comp law)
    'admin_code',      // WI Admin Code Chapter Ins 7
    'agency_portal',   // WI DWD Workers' Comp Division
    'state_bulletin',  // WI OCI bulletins
    'form_filing',     // Form filing guidelines
    'rate_filing',     // Rate filing manuals
    'classification_code', // WC classification codes
    'guidance',        // Regulatory guidance documents
  ],
  commercial_auto: [
    'dmv_requirements',
    'statute',
    'admin_code',
    'iso_forms',
    'rate_filing',
    'state_bulletin',
    'form_filing',
    'agency_portal',
    'guidance',
  ],
  personal_auto: [
    'dmv_requirements',
    'statute',
    'admin_code',
    'iso_forms',
    'rate_filing',
    'state_bulletin',
    'agency_portal',
    'guidance',
  ],
  general_liability: [
    'statute',
    'admin_code',
    'iso_forms',
    'rate_filing',
    'state_bulletin',
    'form_filing',
    'agency_portal',
    'guidance',
  ],
  commercial_property: [
    'statute',
    'admin_code',
    'iso_forms',
    'rate_filing',
    'state_bulletin',
    'form_filing',
    'agency_portal',
    'guidance',
  ],
  homeowners: [
    'statute',
    'admin_code',
    'iso_forms',
    'rate_filing',
    'state_bulletin',
    'agency_portal',
    'guidance',
  ],
  professional_liability: [
    'statute',
    'admin_code',
    'rate_filing',
    'state_bulletin',
    'form_filing',
    'agency_portal',
    'guidance',
  ],
  umbrella: [
    'statute',
    'admin_code',
    'iso_forms',
    'rate_filing',
    'state_bulletin',
    'agency_portal',
    'guidance',
  ],
};

/**
 * WI-specific: Mandatory regulatory items by Line of Business
 */
export const WI_MANDATORY_ITEMS_BY_LOB: Record<string, MandatoryItem[]> = {
  workers_comp: [
    {
      title: 'Wisconsin Statutes Chapter 102',
      description: 'Primary workers\' compensation law establishing employer obligations and employee rights.',
      docType: 'STATUTE',
      authority: 'WI Legislature',
    },
    {
      title: 'Wisconsin Administrative Code Chapter Ins 7',
      description: 'Administrative rules governing workers\' compensation insurance operations.',
      docType: 'ADMIN_CODE',
      authority: 'WI OCI',
    },
    {
      title: 'WCPOLS Transaction Reporting',
      description: 'Workers\' compensation policy language and transaction reporting requirements.',
      docType: 'WCPOLS_REFERENCE',
      authority: 'WI DWD',
    },
    {
      title: 'Department of Workforce Development Portal',
      description: 'Primary government authority for workers\' compensation regulation in Wisconsin.',
      docType: 'AGENCY_PORTAL',
      authority: 'WI DWD',
    },
  ],
  commercial_auto: [
    {
      title: 'Wisconsin Statutes Chapter 344',
      description: 'Motor vehicle insurance requirements and financial responsibility laws.',
      docType: 'STATUTE',
      authority: 'WI Legislature',
    },
    {
      title: 'Wisconsin DMV Insurance Requirements',
      description: 'Department of Motor Vehicles insurance coverage mandates for commercial vehicles.',
      docType: 'AGENCY_PORTAL',
      authority: 'WI DMV',
    },
    {
      title: 'Wisconsin Administrative Code Chapter Ins 6',
      description: 'Administrative rules for automobile insurance policy provisions.',
      docType: 'ADMIN_CODE',
      authority: 'WI OCI',
    },
  ],
  personal_auto: [
    {
      title: 'Wisconsin Statutes Chapter 344',
      description: 'Motor vehicle insurance requirements and financial responsibility laws.',
      docType: 'STATUTE',
      authority: 'WI Legislature',
    },
    {
      title: 'Wisconsin DMV Insurance Requirements',
      description: 'Department of Motor Vehicles insurance coverage mandates for personal vehicles.',
      docType: 'AGENCY_PORTAL',
      authority: 'WI DMV',
    },
    {
      title: 'Wisconsin Administrative Code Chapter Ins 6',
      description: 'Administrative rules for automobile insurance policy provisions.',
      docType: 'ADMIN_CODE',
      authority: 'WI OCI',
    },
  ],
  general_liability: [
    {
      title: 'Wisconsin Statutes Chapter 600-646',
      description: 'General insurance statutes governing liability coverage requirements.',
      docType: 'STATUTE',
      authority: 'WI Legislature',
    },
    {
      title: 'Wisconsin Office of the Commissioner of Insurance',
      description: 'Primary regulatory authority for general liability insurance in Wisconsin.',
      docType: 'AGENCY_PORTAL',
      authority: 'WI OCI',
    },
  ],
};

