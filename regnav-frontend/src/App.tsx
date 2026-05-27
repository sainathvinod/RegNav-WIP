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
import { Settings } from './pages/Settings';
import { getSummary } from './services/analytics';
import type { AnalyticsSummary } from './types/analytics';

// ---------------------------------------------------------------------------
// Dashboard — live stats from the analytics API
// ---------------------------------------------------------------------------

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    getSummary().then(setStats).catch(() => null);
  }, []);

  const s = stats;
  return (
    <AppLayout title="Dashboard">
      <div className="card mb-6 bg-gradient-to-r from-purple-600 to-purple-800 text-white border-purple-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome to RegNav.AI</h2>
            <p className="text-purple-100">AI-Powered Regulatory Compliance Navigator</p>
          </div>
          <div className="text-6xl opacity-20">🧭</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          label="Documents"
          value={s ? s.documents : null}
          icon="📄"
          color="bg-blue-600"
        />
        <StatCard
          label="Active Rules"
          value={s ? s.rules.approved : null}
          icon="⚖️"
          color="bg-purple-600"
        />
        <StatCard
          label="Validations"
          value={s ? s.validations.total : null}
          icon="✅"
          color="bg-green-600"
        />
        <StatCard
          label="Compliance Score"
          value={s ? `${s.complianceScore}%` : null}
          icon="📊"
          color="bg-yellow-600"
        />
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-50 mb-4">Regulatory Pipeline</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { step: 1, label: 'Discover', sub: 'RegScout', icon: '🔍', path: '/regscout' },
            { step: 2, label: 'Ingest', sub: 'RegIngest', icon: '📄', path: '/regingest' },
            { step: 3, label: 'Extract Rules', sub: 'RuleMiner', icon: '⛏️', path: '/ruleminer' },
            { step: 4, label: 'Chat & Search', sub: 'RuleSense', icon: '🧠', path: '/rulesense' },
            { step: 5, label: 'Validate Files', sub: 'RegValidate', icon: '✅', path: '/regvalidate' },
          ].map((item) => (
            <a key={item.step} href={item.path} className="flex flex-col items-center p-3 rounded-lg border border-gray-700 hover:border-purple-600 hover:bg-purple-900/10 transition-all text-center">
              <div className="w-10 h-10 bg-purple-900 rounded-full flex items-center justify-center text-xl mb-2">
                {item.icon}
              </div>
              <p className="text-xs font-medium text-gray-200">{item.label}</p>
              <p className="text-xs text-gray-500">{item.sub}</p>
            </a>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string | number | null;
  icon: string;
  color: string;
}> = ({ label, value, icon, color }) => (
  <div className="card hover:shadow-2xl hover:border-gray-700 transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-400 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-50">
          {value === null ? (
            <span className="text-gray-600 animate-pulse">—</span>
          ) : (
            value
          )}
        </p>
      </div>
      <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center text-2xl`}>
        {icon}
      </div>
    </div>
  </div>
);

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
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Router>
        </LoginGate>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
