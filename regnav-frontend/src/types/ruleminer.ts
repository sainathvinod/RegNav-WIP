export type RuleStatus = 'draft' | 'approved' | 'rejected' | 'superseded';
export type RuleType = 'filing' | 'underwriting' | 'rating' | 'claims' | 'compliance' | 'general';

export interface Rule {
  id: string;
  ruleCode: string;
  stateCode: string | null;
  lineOfBusiness: string | null;
  ruleType: RuleType;
  title: string;
  text: string;
  rationale: string | null;
  effectiveDate: string | null;
  status: RuleStatus;
  confidenceScore: number | null;
  sourceDocumentId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface ExtractionJobResponse {
  jobId: string;
}
