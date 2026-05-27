// Discovery-profile API client.
//
// Returns shapes that match the existing `DiscoveryProfile` UI type, so the
// Profiles page and modals can render results without local transformations.

import type { DiscoveryProfile, RegulatorySource } from '../types';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
).replace(/\/$/, '');

const BASE = `${API_BASE_URL}/api/v1/profiles`;

function authHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return { Authorization: `Bearer ${token ?? 'dev-bypass'}` };
}

function jsonHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', ...authHeaders() };
}

interface ProfileApiShape {
  id: string;
  name: string;
  description: string | null;
  status: DiscoveryProfile['status'];
  configuration: DiscoveryProfile['configuration'];
  sources: RegulatorySource[];
  profileMetadata: DiscoveryProfile['metadata'];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

function fromApi(p: ProfileApiShape): DiscoveryProfile {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? undefined,
    configuration: p.configuration,
    sources: p.sources,
    metadata: p.profileMetadata,
    status: p.status,
    tags: p.tags,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

async function handleJson<T>(resp: Response): Promise<T> {
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Profiles API ${resp.status}: ${text || resp.statusText}`);
  }
  if (resp.status === 204) return undefined as T;
  return (await resp.json()) as T;
}

export async function listProfiles(): Promise<DiscoveryProfile[]> {
  const resp = await fetch(BASE, { headers: authHeaders() });
  const rows = await handleJson<ProfileApiShape[]>(resp);
  return rows.map(fromApi);
}

export interface CreateProfileBody {
  name: string;
  description?: string;
  status?: DiscoveryProfile['status'];
  configuration?: DiscoveryProfile['configuration'];
  sources?: RegulatorySource[];
  metadata?: DiscoveryProfile['metadata'];
  tags?: string[];
}

export async function createProfile(body: CreateProfileBody): Promise<DiscoveryProfile> {
  const resp = await fetch(BASE, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  return fromApi(await handleJson<ProfileApiShape>(resp));
}

export interface UpdateProfileBody {
  name?: string;
  description?: string | null;
  status?: DiscoveryProfile['status'];
  configuration?: DiscoveryProfile['configuration'];
  sources?: RegulatorySource[];
  metadata?: DiscoveryProfile['metadata'];
  tags?: string[];
}

export async function updateProfile(
  id: string,
  body: UpdateProfileBody,
): Promise<DiscoveryProfile> {
  const resp = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  return fromApi(await handleJson<ProfileApiShape>(resp));
}

export async function deleteProfile(id: string): Promise<void> {
  const resp = await fetch(`${BASE}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!resp.ok) {
    throw new Error(`Failed to delete profile: ${resp.status}`);
  }
}
