/**
 * Health-check service. Backs the live status badges in the TopBar so
 * users see actual provider connectivity instead of a static "OK" pill.
 */

const API = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/health`;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('auth_token') ?? 'dev-bypass';
  return { Authorization: `Bearer ${token}` };
}

export interface ProviderHealth {
  ok: boolean;
  latency_ms?: number;
  dimensions?: number | null;
  error?: string;
}

export interface LLMHealth {
  overall: boolean;
  providers: {
    anthropic: ProviderHealth;
    openai: ProviderHealth;
  };
}

export async function getLLMHealth(): Promise<LLMHealth> {
  const res = await fetch(`${API}/llm`, { headers: authHeader() });
  if (!res.ok) throw new Error(`health/llm: ${res.status}`);
  return res.json();
}
