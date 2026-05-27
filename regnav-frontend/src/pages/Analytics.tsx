import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { getSummary } from '../services/analytics';
import type { AnalyticsSummary } from '../types/analytics';

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
        <div className="text-center py-16 text-gray-400">Loading analytics…</div>
      ) : error ? (
        <div className="card">
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📡</div>
            <p className="text-gray-300 font-medium mb-1">Backend not connected</p>
            <p className="text-sm text-gray-500">{error}</p>
            <p className="text-sm text-gray-500 mt-2">
              Start the backend with <code className="bg-gray-800 px-1 rounded">docker compose up</code> to see live stats.
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
    score >= 95 ? 'text-green-400' : score >= 80 ? 'text-yellow-400' : 'text-red-400';
  const scoreRing =
    score >= 95 ? 'stroke-green-500' : score >= 80 ? 'stroke-yellow-500' : 'stroke-red-500';

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
        <StatCard label="Documents Ingested" value={summary.documents} icon="📄" color="bg-blue-600" />
        <StatCard label="Total Rules" value={summary.rules.total} icon="⚖️" color="bg-purple-600" />
        <StatCard label="Validations Run" value={summary.validations.total} icon="✅" color="bg-green-600" />
        <StatCard label="Today's Validations" value={summary.validations.today} icon="📅" color="bg-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance score */}
        <div className="card flex items-center gap-6">
          <div className="relative w-28 h-28 shrink-0">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#374151" strokeWidth="12" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                className={scoreRing}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40 * score / 100} ${2 * Math.PI * 40 * (1 - score / 100)}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor}`}>{score}%</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-50 mb-1">Compliance Score</h3>
            <p className="text-sm text-gray-400">
              Based on validation runs in the last 30 days.
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Avg violations per run:{' '}
              <span className={summary.validations.violationsRate > 0 ? 'text-red-400' : 'text-green-400'}>
                {summary.validations.violationsRate.toFixed(1)}
              </span>
            </p>
          </div>
        </div>

        {/* Rules breakdown */}
        <div className="card">
          <h3 className="text-base font-semibold text-gray-50 mb-4">Rules by Status</h3>
          {summary.rules.total === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No rules yet — ingest a document and run RuleMiner to extract rules.
            </p>
          ) : (
            <div className="space-y-3">
              <BarRow
                label="Approved"
                count={summary.rules.approved}
                pct={rulePercents.approved}
                barClass="bg-green-600"
                textClass="text-green-400"
              />
              <BarRow
                label="Draft"
                count={summary.rules.draft}
                pct={rulePercents.draft}
                barClass="bg-yellow-600"
                textClass="text-yellow-400"
              />
              <BarRow
                label="Rejected"
                count={summary.rules.rejected}
                pct={rulePercents.rejected}
                barClass="bg-red-700"
                textClass="text-red-400"
              />
            </div>
          )}
        </div>
      </div>

      {/* Pipeline flow */}
      <div className="card">
        <h3 className="text-base font-semibold text-gray-50 mb-4">Regulatory Pipeline</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          {[
            { step: '1', label: 'Discover', sublabel: 'RegScout', icon: '🔍' },
            { step: '2', label: 'Ingest', sublabel: 'RegIngest', icon: '📄' },
            { step: '3', label: 'Extract Rules', sublabel: 'RuleMiner', icon: '⛏️' },
            { step: '4', label: 'Chat & Search', sublabel: 'RuleSense', icon: '🧠' },
            { step: '5', label: 'Validate', sublabel: 'RegValidate', icon: '✅' },
          ].map((item, idx, arr) => (
            <div key={item.step} className="flex flex-col items-center relative">
              <div className="w-12 h-12 rounded-full bg-purple-900 border border-purple-600 flex items-center justify-center text-2xl mb-2">
                {item.icon}
              </div>
              <p className="text-xs font-medium text-gray-200">{item.label}</p>
              <p className="text-xs text-gray-500">{item.sublabel}</p>
              {idx < arr.length - 1 && (
                <div className="hidden md:block absolute top-5 left-[calc(100%-8px)] w-full h-0.5 bg-gray-700" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: string;
  color: string;
}> = ({ label, value, icon, color }) => (
  <div className="card hover:shadow-2xl hover:border-gray-700 transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-400 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-50">{value.toLocaleString()}</p>
      </div>
      <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-2xl`}>
        {icon}
      </div>
    </div>
  </div>
);

const BarRow: React.FC<{
  label: string;
  count: number;
  pct: number;
  barClass: string;
  textClass: string;
}> = ({ label, count, pct, barClass, textClass }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="text-gray-300">{label}</span>
      <span className={textClass}>{count} ({pct}%)</span>
    </div>
    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
      <div className={`h-full ${barClass} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  </div>
);

export { Analytics };
