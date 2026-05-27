import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Badge, type BadgeTone } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import type { Option } from '../lib/constants';
import { listAuditEntries, type AuditEntry } from '../services/audit';

/** Common audit actions surfaced in the filter dropdown. Free-text actions
 *  still appear in the table — this is just a guided picker. */
const ACTION_OPTIONS: Option[] = [
  { value: 'rule.approve', label: 'Rule Approved' },
  { value: 'rule.reject', label: 'Rule Rejected' },
  { value: 'tenant.create', label: 'Tenant Created' },
  { value: 'user.invite', label: 'User Invited' },
  { value: 'doc.ingest', label: 'Document Ingested' },
  { value: 'config.update', label: 'Config Updated' },
];

const RESOURCE_OPTIONS: Option[] = [
  { value: 'rule', label: 'Rule' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'tenant_config', label: 'Tenant Config' },
];

/** Map an audit action onto a Badge tone based on its verb suffix. */
function actionTone(action: string): BadgeTone {
  const verb = action.split('.').pop() ?? '';
  switch (verb) {
    case 'approve':
    case 'create':
      return 'success';
    case 'reject':
    case 'delete':
      return 'danger';
    case 'update':
    case 'invite':
    case 'ingest':
      return 'info';
    default:
      return 'neutral';
  }
}

const AuditLog: React.FC = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

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

  /** Client-side date-range narrowing on top of server-side action/type filter. */
  const visibleEntries = useMemo(() => {
    const fromMs = filterFrom ? new Date(filterFrom + 'T00:00:00').getTime() : null;
    const toMs = filterTo ? new Date(filterTo + 'T23:59:59.999').getTime() : null;
    return entries.filter(e => {
      const t = new Date(e.createdAt).getTime();
      if (fromMs !== null && t < fromMs) return false;
      if (toMs !== null && t > toMs) return false;
      return true;
    });
  }, [entries, filterFrom, filterTo]);

  return (
    <AppLayout title="Audit Log">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Audit Trail
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Immutable record of all mutations. SOC 2 evidence artefact.
          </p>
        </div>
        <button onClick={load} className="btn-secondary text-sm">
          Refresh
        </button>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="form-label">Action</label>
            <Select
              options={ACTION_OPTIONS}
              allLabel="All actions"
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="form-label">Resource Type</label>
            <Select
              options={RESOURCE_OPTIONS}
              allLabel="All resource types"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="form-label">From</label>
            <input
              type="date"
              value={filterFrom}
              onChange={e => setFilterFrom(e.target.value)}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="form-label">To</label>
            <input
              type="date"
              value={filterTo}
              onChange={e => setFilterTo(e.target.value)}
              className="input text-sm"
            />
          </div>
        </div>
      </div>

      {error && (
        <div
          className="mb-4 p-3 rounded-lg border text-sm"
          style={{
            backgroundColor: 'var(--error-bg)',
            borderColor: 'var(--error)',
            color: 'var(--error)',
          }}
        >
          {error}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
            Loading audit trail…
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📜</div>
            <p style={{ color: 'var(--muted)' }}>No audit entries yet.</p>
            <p className="text-sm mt-1" style={{ color: 'var(--disabled)' }}>
              Entries appear here as users approve rules, edit organisations, or change config.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b text-left"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>Timestamp</th>
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>Action</th>
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>Resource</th>
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>User</th>
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>IP</th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map(e => (
                  <tr
                    key={e.id}
                    className="border-b transition-colors"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <td className="py-3 text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <Badge tone={actionTone(e.action)}>{e.action}</Badge>
                    </td>
                    <td className="py-3" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        {e.resourceType}
                      </span>
                      {e.resourceId && (
                        <code
                          className="ml-2 text-xs px-1 py-0.5 rounded font-mono"
                          style={{
                            color: 'rgb(var(--color-accent-primary))',
                            backgroundColor: 'var(--surface-2)',
                          }}
                          title={e.resourceId}
                        >
                          {e.resourceId.slice(0, 8)}
                        </code>
                      )}
                    </td>
                    <td className="py-3 text-xs font-mono" style={{ color: 'var(--muted)' }}>
                      {e.userId ? (
                        <span title={e.userId} className="font-mono">
                          {e.userId.slice(0, 8)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 text-xs font-mono" style={{ color: 'var(--muted)' }}>
                      {e.ipAddress ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export { AuditLog };
