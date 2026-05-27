// RegIngest API client.
import type { IngestedDocument, IngestTextInput, IngestUrlInput } from '../types/regscout';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
).replace(/\/$/, '');

const BASE = `${API_BASE_URL}/api/v1/regingest`;

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
    throw new Error(`RegIngest API ${response.status}: ${text || response.statusText}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function listIngestedDocuments(): Promise<IngestedDocument[]> {
  const resp = await fetch(`${BASE}/documents`, { headers: authHeaders() });
  return handleJson<IngestedDocument[]>(resp);
}

export async function ingestFromUrl(input: IngestUrlInput): Promise<{ jobId: string }> {
  const resp = await fetch(`${BASE}/from-url`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({
      url: input.url,
      title: input.title ?? null,
      state_code: input.stateCode ?? null,
      lob: input.lob ?? null,
    }),
  });
  return handleJson<{ jobId: string }>(resp);
}

export async function ingestFromText(input: IngestTextInput): Promise<{ jobId: string }> {
  const resp = await fetch(`${BASE}/from-text`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({
      title: input.title,
      text: input.text,
      state_code: input.stateCode ?? null,
      lob: input.lob ?? null,
    }),
  });
  return handleJson<{ jobId: string }>(resp);
}

export async function deleteIngestedDocument(id: string): Promise<void> {
  const resp = await fetch(`${BASE}/documents/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!resp.ok) {
    throw new Error(`Failed to delete document: ${resp.status}`);
  }
}
