const API = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/config`;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('auth_token') ?? 'dev-bypass';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export interface ConfigEntry {
  key: string;
  value: string;
  default: string;
  isOverridden: boolean;
}

export interface ConfigResponse {
  entries: ConfigEntry[];
}

export async function getConfig(): Promise<ConfigResponse> {
  const res = await fetch(API, { headers: authHeader() });
  if (!res.ok) throw new Error(`getConfig: ${res.status}`);
  return res.json();
}

export async function updateConfig(updates: Record<string, string>): Promise<ConfigResponse> {
  const res = await fetch(API, {
    method: 'PATCH',
    headers: authHeader(),
    body: JSON.stringify({ updates }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `updateConfig: ${res.status}`);
  }
  return res.json();
}

export async function resetConfigKey(key: string): Promise<void> {
  const res = await fetch(`${API}/${key}`, { method: 'DELETE', headers: authHeader() });
  if (!res.ok) throw new Error(`resetConfig: ${res.status}`);
}
