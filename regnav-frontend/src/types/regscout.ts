// Types for the server-side RegScout APIs.

export type SourceType =
  | 'state_dept'
  | 'naic'
  | 'federal_register'
  | 'bulletin_index'
  | 'custom';

export type SourceLastStatus = 'ok' | '404' | '5xx' | 'timeout' | 'parse_error' | string;

export interface RegulatorySource {
  id: string;
  name: string;
  url: string;
  sourceType: SourceType;
  stateCode: string | null;
  lob: string | null;
  enabled: boolean;
  lastCheckedAt: string | null;
  lastStatus: SourceLastStatus | null;
  lastError: string | null;
  discoveredDocCount: number;
  createdAt: string;
}

export type DiscoveredDocStatus = 'pending' | 'ingested' | 'skipped' | 'failed';

export interface DiscoveredDocument {
  id: string;
  sourceId: string;
  url: string;
  title: string | null;
  contentType: string | null;
  status: DiscoveredDocStatus;
  ingestedDocumentId: string | null;
  discoveredAt: string;
}

export interface CreateSourceInput {
  name: string;
  url: string;
  sourceType: SourceType;
  stateCode?: string | null;
  lob?: string | null;
}

export interface UpdateSourceInput {
  name?: string;
  enabled?: boolean;
  lob?: string | null;
  stateCode?: string | null;
}

export interface StartDiscoveryInput {
  sourceIds?: string[];
  stateCodes?: string[];
  all?: boolean;
}

export interface IngestedDocument {
  id: string;
  title: string;
  sourceType: string;
  sourceUrl: string | null;
  stateCode: string | null;
  lob: string | null;
  status: string;
  chunkCount: number;
  createdAt: string;
}

export interface IngestUrlInput {
  url: string;
  title?: string | null;
  stateCode?: string | null;
  lob?: string | null;
}

export interface IngestTextInput {
  title: string;
  text: string;
  stateCode?: string | null;
  lob?: string | null;
}
