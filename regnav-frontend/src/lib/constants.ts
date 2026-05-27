/**
 * Single source of truth for option lists used across forms. Keeps every
 * "State" / "Line of business" / "Document type" dropdown consistent and
 * avoids free-text inputs for values with a fixed taxonomy.
 *
 * The richer master catalogues (with regions, descriptions, etc.) live in
 * src/data/regscoutMappings.ts — this file re-exposes the flat option arrays
 * that forms actually need.
 */

import { REGIONS_BY_COUNTRY, LOB_CATALOG } from '../data/regscoutMappings';

export interface Option<V extends string = string> {
  value: V;
  label: string;
}

/** US states + DC for forms that ask for a 2-letter state code. */
export const US_STATE_OPTIONS: Option[] = REGIONS_BY_COUNTRY.US.map((s) => ({
  value: s.code,
  label: `${s.code} — ${s.name}`,
}));

/** All lines of business defined in the master LOB catalogue. */
export const LOB_OPTIONS: Option[] = Object.values(LOB_CATALOG).map((lob) => ({
  value: lob.id,
  label: lob.name,
}));

/** Document source/type taxonomy as understood by RegIngest backend. */
export const DOCUMENT_TYPE_OPTIONS: Option[] = [
  { value: 'bulletin', label: 'Bulletin' },
  { value: 'regulation', label: 'Regulation' },
  { value: 'statute', label: 'Statute' },
  { value: 'circular', label: 'Circular' },
  { value: 'order', label: 'Order' },
  { value: 'guidance', label: 'Guidance' },
  { value: 'notice', label: 'Notice' },
  { value: 'form', label: 'Form' },
  { value: 'other', label: 'Other' },
];

/** Validation file types — must match backend FileType enum. */
export const VALIDATION_FILE_TYPE_OPTIONS: Option[] = [
  { value: 'wcpols', label: 'WCPOLS' },
  { value: 'acord', label: 'ACORD' },
  { value: 'csv', label: 'CSV' },
  { value: 'text', label: 'Plain Text' },
];

/** Tenant user roles — must match backend role enum. */
export const ROLE_OPTIONS: Option[] = [
  { value: 'platform_admin', label: 'Platform Admin' },
  { value: 'tenant_admin', label: 'Tenant Admin' },
  { value: 'compliance_officer', label: 'Compliance Officer' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'viewer', label: 'Viewer' },
];

/** Severity for validation results. */
export const SEVERITY_OPTIONS: Option[] = [
  { value: 'error', label: 'Error' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

/** Rule types as approved in RuleMiner. */
export const RULE_TYPE_OPTIONS: Option[] = [
  { value: 'compliance', label: 'Compliance' },
  { value: 'underwriting', label: 'Underwriting' },
  { value: 'rating', label: 'Rating' },
  { value: 'forms', label: 'Forms' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'other', label: 'Other' },
];

/** Profile workflow statuses. */
export const PROFILE_STATUS_OPTIONS: Option[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'finalized', label: 'Finalized' },
  { value: 'used_for_rules', label: 'Used for Rules' },
];
