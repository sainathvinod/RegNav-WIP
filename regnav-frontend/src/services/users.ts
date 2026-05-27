const API = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/users`;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('auth_token') ?? 'dev-bypass';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  status: string;
  roles: string[];
  createdAt: string;
}

export interface CurrentUser {
  id: string;
  tenantId: string;
  email: string | null;
  roles: string[];
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const res = await fetch(`${API}/me`, { headers: authHeader() });
  if (!res.ok) throw new Error(`getCurrentUser: ${res.status}`);
  return res.json();
}

export async function listUsers(): Promise<User[]> {
  const res = await fetch(API, { headers: authHeader() });
  if (!res.ok) throw new Error(`listUsers: ${res.status}`);
  return res.json();
}

export async function inviteUser(body: {
  email: string;
  displayName: string;
  roles: string[];
}): Promise<User> {
  const res = await fetch(`${API}/invite`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `inviteUser: ${res.status}`);
  }
  return res.json();
}

export async function updateUser(
  id: string,
  body: { displayName?: string; status?: string },
): Promise<User> {
  const res = await fetch(`${API}/${id}`, {
    method: 'PATCH',
    headers: authHeader(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`updateUser: ${res.status}`);
  return res.json();
}

export async function removeUser(id: string): Promise<void> {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: authHeader() });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `removeUser: ${res.status}`);
  }
}

export async function assignRole(userId: string, role: string): Promise<User> {
  const res = await fetch(`${API}/${userId}/roles`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error(`assignRole: ${res.status}`);
  return res.json();
}

export async function revokeRole(userId: string, role: string): Promise<User> {
  const res = await fetch(`${API}/${userId}/roles/${role}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error(`revokeRole: ${res.status}`);
  return res.json();
}

export async function listAvailableRoles(): Promise<string[]> {
  const res = await fetch(`${API}/roles/available`, { headers: authHeader() });
  if (!res.ok) throw new Error(`listAvailableRoles: ${res.status}`);
  return res.json();
}
