import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { LoginGate } from './auth/LoginGate';
import { AppLayout } from './components/layout/AppLayout';
import { ThemeProvider } from './components/ThemeProvider';
import { Analytics } from './pages/Analytics';
import { AuditLog } from './pages/AuditLog';
import { Configuration } from './pages/Configuration';
import { Organizations } from './pages/Organizations';
import { Profiles } from './pages/Profiles';
import { RegIngest } from './pages/RegIngest';
import { RegScout } from './pages/RegScout';
import { RegValidate } from './pages/RegValidate';
import { Reports } from './pages/Reports';
import { RuleMiner } from './pages/RuleMiner';
import { RuleSense } from './pages/RuleSense';
import { Users } from './pages/Users';
import { getSummary } from './services/analytics';
import type { AnalyticsSummary } from './types/analytics';

// ---------------------------------------------------------------------------
// Dashboard — live stats from the analytics API
// ---------------------------------------------------------------------------

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSummary()
      .then((data) => {
        setStats(data);
        setError(null);
      })
      .catch(() => setError('Unable to load dashboard metrics.'));
  }, []);

  const s = stats;
  return (
    <AppLayout title="Dashboard">
      <div
        className="rounded-lg shadow-lg p-5 sm:p-6 mb-6 text-white"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(var(--color-accent-primary)), rgb(var(--color-accent-hover)))',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold mb-1.5">Welcome to RegNav.AI</h2>
            <p className="text-white/85 text-sm sm:text-base">
              AI-Powered Regulatory Compliance Navigator
            </p>
          </div>
          <div className="text-5xl sm:text-6xl opacity-25 flex-shrink-0" aria-hidden="true">🧭</div>
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg border p-3 mb-6 text-sm"
          style={{
            backgroundColor: 'var(--error-bg)',
            borderColor: 'var(--error)',
            color: 'var(--error)',
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <StatCard label="Documents"        value={s ? s.documents          : null} icon="📄" tone="info"    />
        <StatCard label="Active Rules"     value={s ? s.rules.approved     : null} icon="⚖️" tone="accent"  />
        <StatCard label="Validations"      value={s ? s.validations.total  : null} icon="✅" tone="success" />
        <StatCard label="Compliance Score" value={s ? `${s.complianceScore}%` : null} icon="📊" tone="warning" />
      </div>

      <div className="card">
        <h3 className="text-base sm:text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
          Regulatory Pipeline
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            { step: 1, label: 'Discover',      sub: 'RegScout',     icon: '🔍', path: '/regscout' },
            { step: 2, label: 'Ingest',        sub: 'RegIngest',    icon: '📄', path: '/regingest' },
            { step: 3, label: 'Extract Rules', sub: 'RuleMiner',    icon: '⛏️', path: '/ruleminer' },
            { step: 4, label: 'Chat & Search', sub: 'RuleSense',    icon: '🧠', path: '/rulesense' },
            { step: 5, label: 'Validate Files', sub: 'RegValidate', icon: '✅', path: '/regvalidate' },
          ].map((item) => (
            <a
              key={item.step}
              href={item.path}
              className="flex flex-col items-center p-3 rounded-lg border transition-all text-center"
              style={{ borderColor: 'var(--border)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgb(var(--color-accent-primary))';
                e.currentTarget.style.backgroundColor = 'var(--accent-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl mb-2"
                style={{
                  backgroundColor: 'var(--accent-bg)',
                  color: 'rgb(var(--color-accent-primary))',
                }}
                aria-hidden="true"
              >
                {item.icon}
              </div>
              <p className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text)' }}>
                {item.label}
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{item.sub}</p>
            </a>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

type StatTone = 'info' | 'accent' | 'success' | 'warning';

const STAT_TONE_STYLES: Record<StatTone, { bg: string; color: string }> = {
  info:    { bg: 'var(--info-bg)',    color: 'var(--info)' },
  accent:  { bg: 'var(--accent-bg)',  color: 'rgb(var(--color-accent-primary))' },
  success: { bg: 'var(--success-bg)', color: 'var(--success)' },
  warning: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
};

const StatCard: React.FC<{
  label: string;
  value: string | number | null;
  icon: string;
  tone: StatTone;
}> = ({ label, value, icon, tone }) => {
  const palette = STAT_TONE_STYLES[tone];
  return (
    <div className="card hover:shadow-xl transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
          <p className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text)' }}>
            {value === null ? (
              <span className="animate-pulse" style={{ color: 'var(--disabled)' }}>—</span>
            ) : (
              value
            )}
          </p>
        </div>
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: palette.bg, color: palette.color }}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// App router
// ---------------------------------------------------------------------------

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LoginGate>
          <Router basename={import.meta.env.BASE_URL}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/organizations" element={<Organizations />} />
              <Route path="/users" element={<Users />} />
              <Route path="/configuration" element={<Configuration />} />
              <Route path="/profiles" element={<Profiles />} />
              <Route path="/regscout" element={<RegScout />} />
              <Route path="/regingest" element={<RegIngest />} />
              <Route path="/ruleminer" element={<RuleMiner />} />
              <Route path="/rulesense" element={<RuleSense />} />
              <Route path="/regvalidate" element={<RegValidate />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/audit" element={<AuditLog />} />
            </Routes>
          </Router>
        </LoginGate>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
