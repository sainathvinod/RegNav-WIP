// RegNav.AI TypeScript Type Definitions

export interface Organization {
  id: string;
  name: string;
  naicNumber?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  selectedCategories?: string[];
  restoredRules?: string[];
}

export interface Country {
  code: string;
  name: string;
  label: string; // e.g., "State" or "Province"
  regions?: string[];
}

export interface State {
  code: string;
  name: string;
  country: string;
  region?: string;
  rulesCount?: number;
  status: 'active' | 'pending' | 'inactive';
}

export interface LineOfBusiness {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  category: 'auto' | 'property' | 'life' | 'health' | 'workers_comp' | 'liability' | 'specialty';
  subTypes?: string[];
}

export interface RegulatoryDocumentType {
  id: string;
  name: string;
  code: string;
  description: string;
  applicableStates: string[];
  applicableLOBs: string[];
  format: 'PDF' | 'Excel' | 'Web' | 'Database' | 'API';
}

export interface LLMProvider {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'azure' | 'ollama' | 'huggingface';
  models: LLMModel[];
  requiresApiKey: boolean;
  supportsStreaming: boolean;
  maxContextWindow: number;
}

export interface LLMModel {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
  costPerToken: number;
  speedRating: 'fast' | 'medium' | 'slow';
  qualityRating: 'high' | 'medium' | 'basic';
}

export interface LLMConfiguration {
  provider: string;
  model: string;
  apiKey?: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  timeout: number;
  retries: number;
  enableCaching: boolean;
  enableStreaming: boolean;
}

export interface ScoutingConfiguration {
  countries: string[];
  states: string[];
  linesOfBusiness: string[];
  documentTypes: string[];
  llmConfig: LLMConfiguration;
  searchDepth: 'shallow' | 'moderate' | 'deep';
  includeHistorical: boolean;
  validateUrls: boolean;
  extractMetadata: boolean;
  confidenceThreshold: number;
  maxResults: number;
}

export interface RegulatorySource {
  id: string;
  country: string;
  stateCode: string;
  lineOfBusiness: string;
  documentType: string;
  sourceUrl: string;
  sourceName: string;
  agencyName?: string;
  effectiveDate?: string;
  expirationDate?: string;
  discoveryMethod: 'ai_discovered' | 'user_provided' | 'scraped' | 'baseline';
  status: 'active' | 'archived' | 'pending_review' | 'invalid';
  confidenceScore: number;
  trustLevel?: 'gov-auto' | 'user-added';
  metadata?: {
    lastVerified?: string;
    fileSize?: string;
    format?: string;
    pages?: number;
    language?: string;
    jurisdiction?: string;
    category?: string;
    tags?: string[];
    contactInfo?: string;
    generatedSummary?: string;
  };
  createdAt: string;
  discoveredBy?: string;
  validationResult?: {
    isValid: boolean;
    statusCode?: number;
    contentType?: string;
    lastChecked: string;
    errorMessage?: string;
  };
}

export type RegScoutView = 'config' | 'loading' | 'results';

export interface DiscoveryProgress {
  step: 'generating' | 'searching' | 'validating' | 'extracting' | 'finalizing';
  stepLabel: string;
  percent: number;
}

export interface ScoutingJob {
  id: string;
  configuration: ScoutingConfiguration;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt: string;
  completedAt?: string;
  sourcesFound: number;
  sourcesValidated: number;
  errors?: string[];
  results?: RegulatorySource[];
  executionTime?: number;
}

export interface Document {
  id: string;
  sourceId?: string;
  filename: string;
  fileType: string;
  fileSize: number;
  status: 'processing' | 'completed' | 'failed';
  uploadedAt: string;
  processedAt?: string;
  metadata?: Record<string, any>;
}

export interface Rule {
  id: string;
  ruleId: string;
  ruleTitle: string;
  description: string;
  stateCode: string;
  lineOfBusiness: string;
  validationType: 'format' | 'value_range' | 'required_field' | 'conditional' | 'calculation' | 'business_logic';
  validationCriteria: Record<string, any>;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  correctiveAction?: string;
  references?: string[];
  examples?: Record<string, any>;
  confidenceScore: number;
  status: 'draft' | 'approved' | 'archived';
  version: number;
  documentId?: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface ValidationReport {
  id: string;
  filename: string;
  stateCode: string;
  lineOfBusiness: string;
  profileId?: string;
  totalRulesEvaluated: number;
  rulesPassed: number;
  rulesFailed: number;
  complianceScore: number;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  results: ValidationResult[];
}

export interface ValidationResult {
  id: string;
  reportId: string;
  ruleId: string;
  rule?: Rule;
  passed: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  details?: Record<string, any>;
  correctiveAction?: string;
  recordType?: string;
  recordIndex?: number;
}

export interface AppState {
  selectedOrganization: Organization | null;
  selectedCountries: string[];
  selectedStates: string[];
  selectedLOBs: string[];
  selectedDocTypes: string[];
  llmConfig: LLMConfiguration | null;
  currentPage: string;
  breadcrumbs: Breadcrumb[];
  organizations: Organization[];
  sources: RegulatorySource[];
  documents: Document[];
  rules: Rule[];
  validationReports: ValidationReport[];
  scoutingJobs: ScoutingJob[];
  sidebarCollapsed: boolean;
  loading: boolean;
  error: string | null;
}

export interface Breadcrumb {
  label: string;
  path: string;
  icon?: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  agent?: 'regscout' | 'regingest' | 'ruleminer' | 'rulesense' | 'regvalidate';
  badge?: number;
  children?: NavItem[];
}

export interface ContextAction {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface ComplianceMetrics {
  overallScore: number;
  criticalViolations: number;
  highViolations: number;
  mediumViolations: number;
  lowViolations: number;
  totalRules: number;
  passingRules: number;
  trend: 'improving' | 'stable' | 'declining';
}

