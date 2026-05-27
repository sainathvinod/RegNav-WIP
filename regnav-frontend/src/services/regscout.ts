// RegScout API client — sources, discovery jobs, discovered documents.
import type {
  CreateSourceInput,
  DiscoveredDocStatus,
  DiscoveredDocument,
  RegulatorySource,
  StartDiscoveryInput,
  UpdateSourceInput,
} from '../types/regscout';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
).replace(/\/$/, '');

const BASE = `${API_BASE_URL}/api/v1/regscout`;

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
    throw new Error(`RegScout API ${response.status}: ${text || response.statusText}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export async function listSources(params?: {
  stateCode?: string;
  lob?: string;
}): Promise<RegulatorySource[]> {
  const q = new URLSearchParams();
  if (params?.stateCode) q.append('state_code', params.stateCode);
  if (params?.lob) q.append('lob', params.lob);
  const url = q.toString() ? `${BASE}/sources?${q.toString()}` : `${BASE}/sources`;
  const resp = await fetch(url, { headers: authHeaders() });
  return handleJson<RegulatorySource[]>(resp);
}

export async function createSource(input: CreateSourceInput): Promise<RegulatorySource> {
  const body = {
    name: input.name,
    url: input.url,
    source_type: input.sourceType,
    state_code: input.stateCode ?? null,
    lob: input.lob ?? null,
  };
  const resp = await fetch(`${BASE}/sources`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  return handleJson<RegulatorySource>(resp);
}

export async function updateSource(
  id: string,
  input: UpdateSourceInput,
): Promise<RegulatorySource> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.enabled !== undefined) body.enabled = input.enabled;
  if (input.lob !== undefined) body.lob = input.lob;
  if (input.stateCode !== undefined) body.state_code = input.stateCode;
  const resp = await fetch(`${BASE}/sources/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  return handleJson<RegulatorySource>(resp);
}

export async function deleteSource(id: string): Promise<void> {
  const resp = await fetch(`${BASE}/sources/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!resp.ok) {
    throw new Error(`Failed to delete source: ${resp.status}`);
  }
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

export async function startDiscovery(input: StartDiscoveryInput): Promise<{ jobId: string }> {
  const body = {
    source_ids: input.sourceIds ?? null,
    state_codes: input.stateCodes ?? null,
    all: input.all ?? false,
  };
  const resp = await fetch(`${BASE}/discover`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  return handleJson<{ jobId: string }>(resp);
}

// ---------------------------------------------------------------------------
// Discovered documents
// ---------------------------------------------------------------------------

export async function listDiscoveredDocs(params?: {
  sourceId?: string;
  status?: DiscoveredDocStatus;
}): Promise<DiscoveredDocument[]> {
  const q = new URLSearchParams();
  if (params?.sourceId) q.append('sourceId', params.sourceId);
  if (params?.status) q.append('status', params.status);
  const url = q.toString() ? `${BASE}/documents?${q.toString()}` : `${BASE}/documents`;
  const resp = await fetch(url, { headers: authHeaders() });
  return handleJson<DiscoveredDocument[]>(resp);
}

export async function ingestDiscoveredDoc(id: string): Promise<{ jobId: string }> {
  const resp = await fetch(`${BASE}/documents/${id}/ingest`, {
    method: 'POST',
    headers: authHeaders(),
  });
  return handleJson<{ jobId: string }>(resp);
}
