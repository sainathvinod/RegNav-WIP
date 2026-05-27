const API = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/organizations`;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('auth_token') ?? 'dev-bypass';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string;
  userCount: number;
  createdAt: string;
}

export async function listOrganizations(): Promise<Organization[]> {
  const res = await fetch(API, { headers: authHeader() });
  if (!res.ok) throw new Error(`listOrgs: ${res.status}`);
  return res.json();
}

export async function createOrganization(body: {
  name: string;
  slug: string;
  status?: string;
}): Promise<Organization> {
  const res = await fetch(API, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `createOrg: ${res.status}`);
  }
  return res.json();
}

export async function updateOrganization(
  id: string,
  body: { name?: string; status?: string }
): Promise<Organization> {
  const res = await fetch(`${API}/${id}`, {
    method: 'PATCH',
    headers: authHeader(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`updateOrg: ${res.status}`);
  return res.json();
}

export async function deleteOrganization(id: string): Promise<void> {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: authHeader() });
  if (!res.ok) throw new Error(`deleteOrg: ${res.status}`);
}
