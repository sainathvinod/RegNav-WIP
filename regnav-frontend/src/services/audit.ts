const API = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/audit`;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('auth_token') ?? 'dev-bypass';
  return { Authorization: `Bearer ${token}` };
}

export interface AuditEntry {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export async function listAuditEntries(params?: {
  action?: string;
  resourceType?: string;
}): Promise<AuditEntry[]> {
  const qs = new URLSearchParams();
  if (params?.action) qs.set('action', params.action);
  if (params?.resourceType) qs.set('resourceType', params.resourceType);
  const res = await fetch(`${API}?${qs}`, { headers: authHeader() });
  if (!res.ok) throw new Error(`listAudit: ${res.status}`);
  return res.json();
}
