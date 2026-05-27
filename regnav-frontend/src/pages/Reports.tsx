import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Badge } from '../components/ui/Badge';
import { getResults, listRuns } from '../services/regvalidate';
import type { ValidationResult, ValidationRun } from '../types/regvalidate';

const Reports: React.FC = () => {
  const [runs, setRuns] = useState<ValidationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    listRuns()
      .then(setRuns)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleExportCsv = async (run: ValidationRun) => {
    setExporting(run.id);
    try {
      const results = await getResults(run.id);
      const csv = buildCsv(run, results);
      downloadCsv(csv, `validation-report-${run.filename}-${run.id.slice(0, 8)}.csv`);
    } catch {
      /* ignore */
    } finally {
      setExporting(null);
    }
  };

  const handleExportAll = () => {
    const csv = buildSummaryCsv(runs);
    downloadCsv(csv, 'validation-summary.csv');
  };

  return (
    <AppLayout title="Reports">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Validation Reports
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Export validation run results as CSV for audit and compliance evidence.
          </p>
        </div>
        {runs.length > 0 && (
          <button onClick={handleExportAll} className="btn-secondary text-sm">
            Export Summary CSV
          </button>
        )}
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
          <p className="text-xs mt-1" style={{ color: 'var(--error)', opacity: 0.7 }}>
            Start the backend to view reports.
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
          Loading reports…
        </div>
      ) : runs.length === 0 ? (
        <div className="card">
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📑</div>
            <p style={{ color: 'var(--muted)' }}>No validation runs yet.</p>
            <p className="text-sm mt-1" style={{ color: 'var(--disabled)' }}>
              Run a file validation in RegValidate to generate reports here.
            </p>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b text-left"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>File</th>
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>Type</th>
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>Status</th>
                  <th className="pb-3 font-medium text-right" style={{ color: 'var(--muted)' }}>Rules</th>
                  <th className="pb-3 font-medium text-right" style={{ color: 'var(--muted)' }}>Errors</th>
                  <th className="pb-3 font-medium text-right" style={{ color: 'var(--muted)' }}>Warnings</th>
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>Completed</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr
                    key={run.id}
                    className="border-b transition-colors"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <td
                      className="py-3 font-medium max-w-xs truncate"
                      style={{ color: 'var(--text)' }}
                    >
                      {run.filename}
                    </td>
                    <td className="py-3">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: 'var(--surface-2)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {run.fileType.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3">
                      <RunStatusBadge run={run} />
                    </td>
                    <td className="py-3 text-right" style={{ color: 'var(--muted)' }}>
                      {run.totalRulesChecked}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        style={{
                          color: run.violationsFound > 0 ? 'var(--error)' : 'var(--muted)',
                          fontWeight: run.violationsFound > 0 ? 500 : 400,
                        }}
                      >
                        {run.violationsFound}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span
                        style={{
                          color: run.warningsFound > 0 ? 'var(--warning)' : 'var(--muted)',
                        }}
                      >
                        {run.warningsFound}
                      </span>
                    </td>
                    <td className="py-3 text-xs" style={{ color: 'var(--muted)' }}>
                      {run.completedAt ? new Date(run.completedAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 text-right">
                      {run.status === 'completed' && (
                        <button
                          onClick={() => handleExportCsv(run)}
                          disabled={exporting === run.id}
                          className="btn-ghost text-xs px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {exporting === run.id ? 'Exporting…' : 'Export CSV'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SOC 2 note */}
      {runs.length > 0 && (
        <div
          className="mt-4 p-4 rounded-lg border"
          style={{
            backgroundColor: 'var(--info-bg)',
            borderColor: 'var(--info)',
          }}
        >
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--info)' }}>
            SOC 2 Evidence Collection
          </p>
          <p className="text-xs" style={{ color: 'var(--info)', opacity: 0.85 }}>
            Exported CSVs can be attached as evidence artefacts in your SOC 2 audit trail.
            Each report includes rule codes, severity classifications, field-level findings,
            and timestamps for complete regulatory traceability.
          </p>
        </div>
      )}
    </AppLayout>
  );
};

const RunStatusBadge: React.FC<{ run: ValidationRun }> = ({ run }) => {
  if (run.status === 'completed' && run.violationsFound === 0 && run.warningsFound === 0) {
    return <Badge tone="success">Compliant</Badge>;
  }
  if (run.status === 'completed' && run.violationsFound > 0) {
    return <Badge tone="danger">Violations</Badge>;
  }
  if (run.status === 'failed') {
    return <Badge tone="danger">Failed</Badge>;
  }
  return <Badge tone="warning">{run.status}</Badge>;
};

function buildCsv(run: ValidationRun, results: ValidationResult[]): string {
  const header = ['run_id', 'filename', 'file_type', 'severity', 'rule_id', 'field_name', 'field_value', 'line_number', 'message', 'suggestion'];
  const rows = results.map(r => [
    run.id,
    run.filename,
    run.fileType,
    r.severity,
    r.ruleId ?? '',
    r.fieldName ?? '',
    r.fieldValue ?? '',
    r.lineNumber ?? '',
    `"${(r.message ?? '').replace(/"/g, '""')}"`,
    `"${(r.suggestion ?? '').replace(/"/g, '""')}"`,
  ]);
  return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function buildSummaryCsv(runs: ValidationRun[]): string {
  const header = ['run_id', 'filename', 'file_type', 'status', 'rules_checked', 'violations', 'warnings', 'completed_at'];
  const rows = runs.map(r => [
    r.id,
    r.filename,
    r.fileType,
    r.status,
    r.totalRulesChecked,
    r.violationsFound,
    r.warningsFound,
    r.completedAt ?? '',
  ]);
  return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { Reports };
