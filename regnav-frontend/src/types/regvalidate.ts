export type ValidationStatus = 'pending' | 'running' | 'completed' | 'failed';
export type Severity = 'error' | 'warning' | 'info';

export interface ValidationRun {
  id: string;
  filename: string;
  fileType: string;
  status: ValidationStatus;
  totalRulesChecked: number;
  violationsFound: number;
  warningsFound: number;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface ValidationResult {
  id: string;
  ruleId: string | null;
  severity: Severity;
  fieldName: string | null;
  fieldValue: string | null;
  message: string;
  lineNumber: number | null;
  suggestion: string | null;
}

export interface ValidateRequest {
  filename: string;
  fileType: string;
  content: string;
  stateCode?: string;
  lob?: string;
}
