import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { getSummary } from '../services/analytics';
import type { AnalyticsSummary } from '../types/analytics';

type StatTone = 'info' | 'accent' | 'success' | 'warning';

const Analytics: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSummary()
      .then(setSummary)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout title="Analytics">
      {loading ? (
        <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
          Loading analytics…
        </div>
      ) : error ? (
        <div className="card">
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📡</div>
            <p className="font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Backend not connected
            </p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{error}</p>
            <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
              Start the backend with{' '}
              <code
                className="px-1 rounded"
                style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text)' }}
              >
                docker compose up
              </code>{' '}
              to see live stats.
            </p>
          </div>
        </div>
      ) : summary ? (
        <AnalyticsView summary={summary} />
      ) : null}
    </AppLayout>
  );
};

const AnalyticsView: React.FC<{ summary: AnalyticsSummary }> = ({ summary }) => {
  const score = summary.complianceScore;
  const scoreColor =
    score >= 95 ? 'var(--success)' : score >= 80 ? 'var(--warning)' : 'var(--error)';

  const rulePercents = summary.rules.total > 0
    ? {
        approved: Math.round((summary.rules.approved / summary.rules.total) * 100),
        draft: Math.round((summary.rules.draft / summary.rules.total) * 100),
        rejected: Math.round((summary.rules.rejected / summary.rules.total) * 100),
      }
    : { approved: 0, draft: 0, rejected: 0 };

  return (
    <div className="space-y-6">
      {/* Top stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Documents Ingested" value={summary.documents} icon="📄" tone="info" />
        <StatCard label="Total Rules" value={summary.rules.total} icon="⚖️" tone="accent" />
        <StatCard label="Validations Run" value={summary.validations.total} icon="✅" tone="success" />
        <StatCard label="Today's Validations" value={summary.validations.today} icon="📅" tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance score */}
        <div className="card flex items-center gap-6">
          <div className="relative w-28 h-28 shrink-0" style={{ color: scoreColor }}>
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="var(--border)"
                strokeWidth="12"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40 * score / 100} ${2 * Math.PI * 40 * (1 - score / 100)}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold" style={{ color: scoreColor }}>
                {score}%
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>
              Compliance Score
            </h3>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Based on validation runs in the last 30 days.
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              Avg violations per run:{' '}
              <span
                style={{
                  color:
                    summary.validations.violationsRate > 0
                      ? 'var(--error)'
                      : 'var(--success)',
                }}
              >
                {summary.validations.violationsRate.toFixed(1)}
              </span>
            </p>
          </div>
        </div>

        {/* Rules breakdown */}
        <div className="card">
          <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text)' }}>
            Rules by Status
          </h3>
          {summary.rules.total === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: 'var(--muted)' }}>
              No rules yet — ingest a document and run RuleMiner to extract rules.
            </p>
          ) : (
            <div className="space-y-3">
              <BarRow
                label="Approved"
                count={summary.rules.approved}
                pct={rulePercents.approved}
                color="var(--success)"
              />
              <BarRow
                label="Draft"
                count={summary.rules.draft}
                pct={rulePercents.draft}
                color="var(--warning)"
              />
              <BarRow
                label="Rejected"
                count={summary.rules.rejected}
                pct={rulePercents.rejected}
                color="var(--error)"
              />
            </div>
          )}
        </div>
      </div>

      {/* Pipeline flow */}
      <div className="card">
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Regulatory Pipeline
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-center">
          {[
            { step: '1', label: 'Discover', sublabel: 'RegScout', icon: '🔍' },
            { step: '2', label: 'Ingest', sublabel: 'RegIngest', icon: '📄' },
            { step: '3', label: 'Extract Rules', sublabel: 'RuleMiner', icon: '⛏️' },
            { step: '4', label: 'Chat & Search', sublabel: 'RuleSense', icon: '🧠' },
            { step: '5', label: 'Validate', sublabel: 'RegValidate', icon: '✅' },
          ].map((item, idx, arr) => (
            <div key={item.step} className="flex flex-col items-center relative">
              <div
                className="w-12 h-12 rounded-full border flex items-center justify-center text-2xl mb-2"
                style={{
                  backgroundColor: 'var(--accent-bg)',
                  borderColor: 'rgb(var(--color-accent-primary))',
                }}
              >
                {item.icon}
              </div>
              <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                {item.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {item.sublabel}
              </p>
              {idx < arr.length - 1 && (
                <div
                  className="hidden lg:block absolute top-5 left-[calc(100%-8px)] w-full h-0.5"
                  style={{ backgroundColor: 'var(--border)' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/** Background colour for the StatCard icon chip, by semantic tone. */
const TONE_BG: Record<StatTone, string> = {
  info: 'var(--info-bg)',
  accent: 'var(--accent-bg)',
  success: 'var(--success-bg)',
  warning: 'var(--warning-bg)',
};

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: string;
  tone: StatTone;
}> = ({ label, value, icon, tone }) => (
  <div className="card hover:shadow-2xl transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
        <p className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
          {value.toLocaleString()}
        </p>
      </div>
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
        style={{ backgroundColor: TONE_BG[tone] }}
      >
        {icon}
      </div>
    </div>
  </div>
);

const BarRow: React.FC<{
  label: string;
  count: number;
  pct: number;
  color: string;
}> = ({ label, count, pct, color }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ color }}>
        {count} ({pct}%)
      </span>
    </div>
    <div
      className="h-2 rounded-full overflow-hidden"
      style={{ backgroundColor: 'var(--surface-2)' }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

export { Analytics };
