export interface RuleStats {
  total: number;
  draft: number;
  approved: number;
  rejected: number;
}

export interface ValidationStats {
  total: number;
  today: number;
  violationsRate: number;
}

export interface AnalyticsSummary {
  documents: number;
  rules: RuleStats;
  validations: ValidationStats;
  complianceScore: number;
}
