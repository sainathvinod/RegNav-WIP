// JobProgressModal — shows live progress for a backend job via SSE.

import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { streamJobEvents } from '../services/jobs';
import type { JobProgressEvent, JobStatus } from '../types/jobs';
import { Modal } from './ui/Modal';
import { Badge, BadgeTone } from './ui/Badge';

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

  const modalTitle = (
    <div className="flex items-center gap-3">
      <span style={{ color: 'var(--text)' }}>{title}</span>
      <StatusBadge status={status} />
    </div>
  );

  const footer = (
    <button type="button" onClick={onClose} className="btn-secondary">
      {isTerminal ? 'Close' : 'Close (job keeps running)'}
    </button>
  );

  return (
    <Modal open={true} onClose={onClose} title={modalTitle} footer={footer} size="lg">
      <div className="space-y-4">
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
                    ? 'var(--error)'
                    : status === 'completed'
                      ? 'var(--success)'
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
              borderColor: 'var(--error)',
              backgroundColor: 'var(--error-bg)',
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
              borderColor: 'var(--error)',
              backgroundColor: 'var(--error-bg)',
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
              borderColor: 'var(--success)',
              backgroundColor: 'var(--success-bg)',
              color: 'var(--text-secondary)',
            }}
          >
            <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>
              Result
            </p>
            <pre className="whitespace-pre-wrap break-words font-mono max-h-64 overflow-y-auto">
              {JSON.stringify(progress.output, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
};

const STATUS_TONE: Record<JobStatus, BadgeTone> = {
  queued: 'neutral',
  running: 'accent',
  completed: 'success',
  failed: 'danger',
  cancelled: 'neutral',
};

const STATUS_LABEL: Record<JobStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  completed: 'Done',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const StatusBadge: React.FC<{ status: JobStatus }> = ({ status }) => (
  <Badge tone={STATUS_TONE[status]}>
    <span className="inline-flex items-center gap-1">
      {status === 'completed' && <CheckCircleIcon className="h-3 w-3" />}
      {status === 'failed' && <XCircleIcon className="h-3 w-3" />}
      {STATUS_LABEL[status]}
    </span>
  </Badge>
);

export default JobProgressModal;
