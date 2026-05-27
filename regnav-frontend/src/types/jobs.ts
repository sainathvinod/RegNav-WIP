// Shared types for the background-job APIs.

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  type: string;
  status: JobStatus;
  priority: number;
  progress: number;
  progressMessage: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  workerId: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

// SSE event envelope emitted by `/api/v1/jobs/{id}/events`.
export interface JobProgressEvent {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  message: string | null;
  error: string | null;
  output: Record<string, unknown> | null;
  attempts: number;
}

export type JobStreamEvent =
  | { event: 'progress'; data: JobProgressEvent }
  | { event: 'done'; data: JobProgressEvent }
  | { event: 'error'; data: { message: string } }
  | { event: 'timeout'; data: { message: string } };
