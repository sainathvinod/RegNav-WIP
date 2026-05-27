import React, { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { listAuditEntries, type AuditEntry } from '../services/audit';

const ACTION_COLORS: Record<string, string> = {
  approve: 'bg-green-900 text-green-300 border-green-700',
  reject: 'bg-red-900 text-red-300 border-red-700',
  create: 'bg-blue-900 text-blue-300 border-blue-700',
  update: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  delete: 'bg-red-900 text-red-300 border-red-700',
};

function actionColorClass(action: string): string {
  const verb = action.split('.').pop() ?? '';
  return ACTION_COLORS[verb] ?? 'bg-gray-700 text-gray-300 border-gray-600';
}

const AuditLog: React.FC = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState('');
  const [filterType, setFilterType] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listAuditEntries({
      action: filterAction || undefined,
      resourceType: filterType || undefined,
    })
      .then(setEntries)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [filterAction, filterType]);

  useEffect(load, [load]);

  return (
    <AppLayout title="Audit Log">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-100">Audit Trail</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Immutable record of all mutations. SOC 2 evidence artefact.
          </p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="card mb-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            placeholder="Action (e.g. rule.approve)"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm font-mono focus:outline-none focus:border-purple-500"
          />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="">All Resource Types</option>
            <option value="rule">Rule</option>
            <option value="tenant">Tenant</option>
            <option value="tenant_config">Tenant Config</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading audit trail…</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📜</div>
            <p className="text-gray-400">No audit entries yet.</p>
            <p className="text-sm text-gray-500 mt-1">
              Entries appear here as users approve rules, edit organisations, or change config.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="pb-3 text-gray-400 font-medium">Timestamp</th>
                <th className="pb-3 text-gray-400 font-medium">Action</th>
                <th className="pb-3 text-gray-400 font-medium">Resource</th>
                <th className="pb-3 text-gray-400 font-medium">User</th>
                <th className="pb-3 text-gray-400 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${actionColorClass(e.action)}`}>
                      {e.action}
                    </span>
                  </td>
                  <td className="py-3 text-gray-300">
                    <span className="text-xs text-gray-500">{e.resourceType}</span>
                    {e.resourceId && (
                      <code className="ml-2 text-xs text-purple-400 bg-gray-800 px-1 py-0.5 rounded">
                        {e.resourceId.slice(0, 8)}
                      </code>
                    )}
                  </td>
                  <td className="py-3 text-xs text-gray-500 font-mono">
                    {e.userId ? e.userId.slice(0, 8) : '—'}
                  </td>
                  <td className="py-3 text-xs text-gray-500 font-mono">
                    {e.ipAddress ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
};

export { AuditLog };
