import type { ValidateRequest, ValidationResult, ValidationRun } from '../types/regvalidate';

const API = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/regvalidate`;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('auth_token') ?? 'dev-bypass';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function runValidation(body: ValidateRequest): Promise<ValidationRun> {
  const res = await fetch(`${API}/validate`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `validate: ${res.status}`);
  }
  return res.json();
}

export async function listRuns(params?: { status?: string }): Promise<ValidationRun[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  const res = await fetch(`${API}/runs?${qs}`, { headers: authHeader() });
  if (!res.ok) throw new Error(`listRuns: ${res.status}`);
  return res.json();
}

export async function getRun(runId: string): Promise<ValidationRun> {
  const res = await fetch(`${API}/runs/${runId}`, { headers: authHeader() });
  if (!res.ok) throw new Error(`getRun: ${res.status}`);
  return res.json();
}

export async function getResults(runId: string, severity?: string): Promise<ValidationResult[]> {
  const qs = new URLSearchParams();
  if (severity) qs.set('severity', severity);
  const res = await fetch(`${API}/runs/${runId}/results?${qs}`, { headers: authHeader() });
  if (!res.ok) throw new Error(`getResults: ${res.status}`);
  return res.json();
}

export async function deleteRun(runId: string): Promise<void> {
  const res = await fetch(`${API}/runs/${runId}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`deleteRun: ${res.status}`);
}
