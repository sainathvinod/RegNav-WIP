import React, { useState } from 'react';

const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';
const HAS_BACKEND = !!(import.meta.env.VITE_API_BASE_URL);

export const DemoModeBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (!IS_DEMO || HAS_BACKEND || dismissed) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
      style={{
        backgroundColor: 'var(--warning-bg)',
        color: 'var(--warning)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span>
        <strong>No backend connected</strong> — this is a static demo. API calls will fail until you{' '}
        <a
          href="https://github.com/sainathvinod/regnav-wip#deployment"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-medium"
        >
          deploy the backend
        </a>{' '}
        and set <code className="text-xs font-mono px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--warning-bg)' }}>VITE_API_BASE_URL</code> in repository secrets.
      </span>
      <button
        type="button"
        aria-label="Dismiss banner"
        onClick={() => setDismissed(true)}
        className="shrink-0 text-lg leading-none opacity-60 hover:opacity-100"
      >
        ×
      </button>
    </div>
  );
};
