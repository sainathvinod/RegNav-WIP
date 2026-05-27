// Job-queue API client.
import type { Job, JobProgressEvent, JobStreamEvent } from '../types/jobs';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
).replace(/\/$/, '');

const BASE = `${API_BASE_URL}/api/v1/jobs`;

function authHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return { Authorization: `Bearer ${token ?? 'dev-bypass'}` };
}

async function handleJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Jobs API ${response.status}: ${text || response.statusText}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function listJobs(params?: { status?: string; type?: string }): Promise<Job[]> {
  const q = new URLSearchParams();
  if (params?.status) q.append('status', params.status);
  if (params?.type) q.append('type', params.type);
  const url = q.toString() ? `${BASE}?${q.toString()}` : BASE;
  const resp = await fetch(url, { headers: authHeaders() });
  return handleJson<Job[]>(resp);
}

export async function getJob(jobId: string): Promise<Job> {
  const resp = await fetch(`${BASE}/${jobId}`, { headers: authHeaders() });
  return handleJson<Job>(resp);
}

export async function cancelJob(jobId: string): Promise<void> {
  const resp = await fetch(`${BASE}/${jobId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!resp.ok) {
    throw new Error(`Failed to cancel job: ${resp.status}`);
  }
}

/**
 * Subscribe to a job's SSE event stream. Returns a cancel function.
 *
 * We can't use the browser `EventSource` API directly because it doesn't
 * let us set the Authorization header, so we read the raw response stream
 * and parse `event:`/`data:` blocks by hand.
 */
export function streamJobEvents(
  jobId: string,
  onEvent: (event: JobStreamEvent) => void,
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      const resp = await fetch(`${BASE}/${jobId}/events`, {
        headers: authHeaders(),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        onEvent({
          event: 'error',
          data: { message: `Job stream error: ${resp.status}` },
        });
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let separatorIdx: number;
        while ((separatorIdx = buffer.indexOf('\n\n')) !== -1) {
          const rawBlock = buffer.slice(0, separatorIdx);
          buffer = buffer.slice(separatorIdx + 2);
          const parsed = parseSseBlock(rawBlock);
          if (parsed) {
            onEvent(parsed);
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      onEvent({
        event: 'error',
        data: { message: err instanceof Error ? err.message : 'Unknown stream error' },
      });
    }
  })();

  return () => controller.abort();
}

function parseSseBlock(block: string): JobStreamEvent | null {
  const lines = block.split('\n');
  let eventName: string | null = null;
  let dataLine: string | null = null;
  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      dataLine = line.slice('data:'.length).trim();
    }
  }
  if (!dataLine) return null;
  try {
    const parsed = JSON.parse(dataLine);
    if (eventName === 'progress' || eventName === 'done') {
      return { event: eventName, data: parsed as JobProgressEvent };
    }
    if (eventName === 'error' || eventName === 'timeout') {
      return { event: eventName, data: parsed as { message: string } };
    }
    return null;
  } catch {
    return null;
  }
}
