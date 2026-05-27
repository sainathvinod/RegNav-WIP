// RuleSense RAG chatbot types

export interface ChatSession {
  id: string;
  title: string;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface Citation {
  documentId: string;
  documentTitle: string;
  chunkId?: string;
  chunkIndex: number;
  score: number;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Citation[] | null;
  createdAt: string;
}

export interface RuleSenseDocument {
  id: string;
  title: string;
  sourceType: string;
  stateCode: string | null;
  lob: string | null;
  status: string;
  chunkCount: number;
  createdAt: string;
}

// SSE event envelope sent by the streaming endpoint
export type RuleSenseStreamEvent =
  | { type: 'citations'; citations: Citation[] }
  | { type: 'token'; text: string }
  | { type: 'done'; usage?: { input_tokens: number; output_tokens: number }; latency_ms?: number }
  | { type: 'error'; message: string };
