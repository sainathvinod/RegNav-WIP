// RuleSense API client. All requests carry a JWT (or the `dev-bypass` token).
import type {
  ChatMessage,
  ChatSession,
  RuleSenseDocument,
  RuleSenseStreamEvent,
} from '../types';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
).replace(/\/$/, '');

const BASE = `${API_BASE_URL}/api/v1/rulesense`;

/** Build auth headers. Falls back to dev-bypass so local dev works without a real IdP. */
function authHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return { Authorization: `Bearer ${token ?? 'dev-bypass'}` };
}

function jsonHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', ...authHeaders() };
}

async function handleJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`RuleSense API ${response.status}: ${text || response.statusText}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function listSessions(): Promise<ChatSession[]> {
  const resp = await fetch(`${BASE}/sessions`, { headers: authHeaders() });
  return handleJson<ChatSession[]>(resp);
}

export async function createSession(): Promise<ChatSession> {
  const resp = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: jsonHeaders(),
  });
  return handleJson<ChatSession>(resp);
}

export async function getSession(
  id: string,
): Promise<{ session: ChatSession; messages: ChatMessage[] }> {
  const resp = await fetch(`${BASE}/sessions/${id}`, { headers: authHeaders() });
  return handleJson<{ session: ChatSession; messages: ChatMessage[] }>(resp);
}

export async function deleteSession(id: string): Promise<void> {
  const resp = await fetch(`${BASE}/sessions/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!resp.ok) {
    throw new Error(`Failed to delete session: ${resp.status}`);
  }
}

export async function listDocuments(): Promise<RuleSenseDocument[]> {
  const resp = await fetch(`${BASE}/documents`, { headers: authHeaders() });
  return handleJson<RuleSenseDocument[]>(resp);
}

export interface CreateDocumentInput {
  title: string;
  text: string;
  stateCode?: string | null;
  lob?: string | null;
  sourceType?: string;
}

export async function createDocument(input: CreateDocumentInput): Promise<RuleSenseDocument> {
  const body = {
    title: input.title,
    text: input.text,
    source_type: input.sourceType ?? 'text',
    state_code: input.stateCode ?? null,
    lob: input.lob ?? null,
  };
  const resp = await fetch(`${BASE}/documents`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  return handleJson<RuleSenseDocument>(resp);
}

export async function deleteDocument(id: string): Promise<void> {
  const resp = await fetch(`${BASE}/documents/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!resp.ok) {
    throw new Error(`Failed to delete document: ${resp.status}`);
  }
}

/**
 * Send a message and stream back SSE events.
 *
 * We can't use the browser `EventSource` API here because we need to POST a
 * body, so we read the raw response stream and parse the `event:`/`data:`
 * blocks by hand.
 */
export async function sendMessage(
  sessionId: string,
  text: string,
  onEvent: (event: RuleSenseStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const resp = await fetch(`${BASE}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ text }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    throw new Error(`RuleSense stream error: ${resp.status} ${resp.statusText}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE messages are separated by blank lines (\n\n)
    let separatorIdx: number;
    while ((separatorIdx = buffer.indexOf('\n\n')) !== -1) {
      const rawBlock = buffer.slice(0, separatorIdx);
      buffer = buffer.slice(separatorIdx + 2);
      const parsed = parseSseBlock(rawBlock);
      if (parsed) {
        onEvent(parsed);
      }
    }
  }
}

function parseSseBlock(block: string): RuleSenseStreamEvent | null {
  const lines = block.split('\n');
  let dataLine: string | null = null;
  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLine = line.slice('data:'.length).trim();
    }
  }
  if (!dataLine) return null;
  try {
    return JSON.parse(dataLine) as RuleSenseStreamEvent;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.debug('[rulesense] failed to parse SSE block', err, dataLine);
    }
    return null;
  }
}
