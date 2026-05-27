import type { ExtractionJobResponse, Rule } from '../types/ruleminer';

const API = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/ruleminer`;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('auth_token') ?? 'dev-bypass';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function listRules(params?: {
  status?: string;
  stateCode?: string;
  lob?: string;
  documentId?: string;
}): Promise<Rule[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.stateCode) qs.set('stateCode', params.stateCode);
  if (params?.lob) qs.set('lob', params.lob);
  if (params?.documentId) qs.set('documentId', params.documentId);

  const res = await fetch(`${API}/rules?${qs}`, { headers: authHeader() });
  if (!res.ok) throw new Error(`listRules: ${res.status}`);
  return res.json();
}

export async function getRule(ruleId: string): Promise<Rule> {
  const res = await fetch(`${API}/rules/${ruleId}`, { headers: authHeader() });
  if (!res.ok) throw new Error(`getRule: ${res.status}`);
  return res.json();
}

export async function approveRule(ruleId: string): Promise<Rule> {
  const res = await fetch(`${API}/rules/${ruleId}/approve`, {
    method: 'POST',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`approveRule: ${res.status}`);
  return res.json();
}

export async function rejectRule(ruleId: string): Promise<Rule> {
  const res = await fetch(`${API}/rules/${ruleId}/reject`, {
    method: 'POST',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`rejectRule: ${res.status}`);
  return res.json();
}

export async function deleteRule(ruleId: string): Promise<void> {
  const res = await fetch(`${API}/rules/${ruleId}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`deleteRule: ${res.status}`);
}

export async function startExtraction(documentId: string): Promise<ExtractionJobResponse> {
  const res = await fetch(`${API}/extract`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ documentId }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `startExtraction: ${res.status}`);
  }
  return res.json();
}
