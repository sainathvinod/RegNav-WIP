// JobProgressModal — shows live progress for a backend job via SSE.

import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { streamJobEvents } from '../services/jobs';
import type { JobProgressEvent, JobStatus } from '../types/jobs';

interface JobProgressModalProps {
  jobId: string;
  title: string;
  onClose: () => void;
  onComplete?: (result: JobProgressEvent) => void;
}

export const JobProgressModal: React.FC<JobProgressModalProps> = ({
  jobId,
  title,
  onClose,
  onComplete,
}) => {
  const [progress, setProgress] = useState<JobProgressEvent | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);

  useEffect(() => {
    const cancel = streamJobEvents(jobId, (event) => {
      if (event.event === 'progress' || event.event === 'done') {
        setProgress(event.data);
        if (event.event === 'done') {
          onComplete?.(event.data);
        }
      } else if (event.event === 'error') {
        setStreamError(event.data.message);
      } else if (event.event === 'timeout') {
        setStreamError(event.data.message);
      }
    });
    return cancel;
  }, [jobId, onComplete]);

  const status: JobStatus = progress?.status ?? 'queued';
  const isTerminal = ['completed', 'failed', 'cancelled'].includes(status);
  const pct = progress?.progress ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="w-full max-w-lg rounded-xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        <header
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
              {title}
            </h3>
            <StatusBadge status={status} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ color: 'var(--muted)' }}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="px-6 py-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                Progress
              </span>
              <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                {pct}%
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--surface-2)' }}
            >
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor:
                    status === 'failed'
                      ? '#dc2626'
                      : status === 'completed'
                        ? '#16a34a'
                        : 'rgb(var(--color-accent-primary))',
                }}
              />
            </div>
          </div>

          <div>
            <p className="text-sm" style={{ color: 'var(--text)' }}>
              {progress?.message ?? 'Waiting for worker to pick up job…'}
            </p>
            {progress?.attempts !== undefined && progress.attempts > 1 && (
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                Attempt {progress.attempts}
              </p>
            )}
          </div>

          {streamError && (
            <div
              className="rounded-lg border p-3 text-sm"
              style={{
                borderColor: 'rgba(220,38,38,0.4)',
                backgroundColor: 'rgba(220,38,38,0.08)',
                color: 'var(--error)',
              }}
            >
              {streamError}
            </div>
          )}

          {progress?.error && (
            <div
              className="rounded-lg border p-3 text-sm whitespace-pre-wrap"
              style={{
                borderColor: 'rgba(220,38,38,0.4)',
                backgroundColor: 'rgba(220,38,38,0.08)',
                color: 'var(--error)',
              }}
            >
              {progress.error}
            </div>
          )}

          {status === 'completed' && progress?.output && (
            <div
              className="rounded-lg border p-3 text-xs"
              style={{
                borderColor: 'rgba(34,197,94,0.4)',
                backgroundColor: 'rgba(34,197,94,0.08)',
                color: 'var(--text-secondary)',
              }}
            >
              <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>
                Result
              </p>
              <pre className="whitespace-pre-wrap break-words font-mono">
                {JSON.stringify(progress.output, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <footer
          className="flex items-center justify-end gap-2 px-6 py-4 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-lg border transition-colors"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            {isTerminal ? 'Close' : 'Close (job keeps running)'}
          </button>
        </footer>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => {
  const styles: Record<JobStatus, { bg: string; color: string; label: string }> = {
    queued: { bg: 'rgba(148,163,184,0.2)', color: '#64748b', label: 'Queued' },
    running: { bg: 'rgba(99,102,241,0.2)', color: '#6366f1', label: 'Running' },
    completed: { bg: 'rgba(34,197,94,0.2)', color: '#16a34a', label: 'Done' },
    failed: { bg: 'rgba(220,38,38,0.2)', color: '#dc2626', label: 'Failed' },
    cancelled: { bg: 'rgba(148,163,184,0.2)', color: '#64748b', label: 'Cancelled' },
  };
  const { bg, color, label } = styles[status];

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ backgroundColor: bg, color }}
    >
      {status === 'completed' && <CheckCircleIcon className="h-3 w-3" />}
      {status === 'failed' && <XCircleIcon className="h-3 w-3" />}
      {label}
    </span>
  );
};

export default JobProgressModal;
