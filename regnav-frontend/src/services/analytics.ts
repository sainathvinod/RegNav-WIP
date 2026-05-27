import type { AnalyticsSummary } from '../types/analytics';

const API = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/analytics`;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('auth_token') ?? 'dev-bypass';
  return { Authorization: `Bearer ${token}` };
}

export async function getSummary(): Promise<AnalyticsSummary> {
  const res = await fetch(`${API}/summary`, { headers: authHeader() });
  if (!res.ok) throw new Error(`analytics: ${res.status}`);
  return res.json();
}
