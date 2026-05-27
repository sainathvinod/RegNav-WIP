const API = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/notifications`;

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('auth_token') ?? 'dev-bypass';
  return { Authorization: `Bearer ${token}` };
}

export type Severity = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  eventType: string;
  title: string;
  body: string | null;
  link: string | null;
  severity: Severity;
  readAt: string | null;
  createdAt: string;
}

export async function listNotifications(unreadOnly = false): Promise<Notification[]> {
  const qs = unreadOnly ? '?unreadOnly=true' : '';
  const res = await fetch(`${API}${qs}`, { headers: authHeader() });
  if (!res.ok) throw new Error(`listNotifications: ${res.status}`);
  return res.json();
}

export async function getUnreadCount(): Promise<number> {
  const res = await fetch(`${API}/unread-count`, { headers: authHeader() });
  if (!res.ok) throw new Error(`unreadCount: ${res.status}`);
  return (await res.json()).unread as number;
}

export async function markRead(id: string): Promise<Notification> {
  const res = await fetch(`${API}/${id}/read`, { method: 'POST', headers: authHeader() });
  if (!res.ok) throw new Error(`markRead: ${res.status}`);
  return res.json();
}

export async function markAllRead(): Promise<void> {
  const res = await fetch(`${API}/read-all`, { method: 'POST', headers: authHeader() });
  if (!res.ok) throw new Error(`markAllRead: ${res.status}`);
}
