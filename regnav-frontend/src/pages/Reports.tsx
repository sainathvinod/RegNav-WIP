import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
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
          <h2 className="text-xl font-semibold text-gray-100">Validation Reports</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Export validation run results as CSV for audit and compliance evidence.
          </p>
        </div>
        {runs.length > 0 && (
          <button
            onClick={handleExportAll}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors"
          >
            Export Summary CSV
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error}
          <p className="text-xs mt-1 text-red-400/70">Start the backend to view reports.</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading reports…</div>
      ) : runs.length === 0 ? (
        <div className="card">
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📑</div>
            <p className="text-gray-400">No validation runs yet.</p>
            <p className="text-sm text-gray-500 mt-1">
              Run a file validation in RegValidate to generate reports here.
            </p>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="pb-3 text-gray-400 font-medium">File</th>
                <th className="pb-3 text-gray-400 font-medium">Type</th>
                <th className="pb-3 text-gray-400 font-medium">Status</th>
                <th className="pb-3 text-gray-400 font-medium text-right">Rules</th>
                <th className="pb-3 text-gray-400 font-medium text-right">Errors</th>
                <th className="pb-3 text-gray-400 font-medium text-right">Warnings</th>
                <th className="pb-3 text-gray-400 font-medium">Completed</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {runs.map(run => (
                <tr key={run.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 text-gray-200 font-medium max-w-xs truncate">
                    {run.filename}
                  </td>
                  <td className="py-3">
                    <span className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                      {run.fileType.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3">
                    <RunStatusBadge run={run} />
                  </td>
                  <td className="py-3 text-gray-400 text-right">{run.totalRulesChecked}</td>
                  <td className="py-3 text-right">
                    <span className={run.violationsFound > 0 ? 'text-red-400 font-medium' : 'text-gray-500'}>
                      {run.violationsFound}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className={run.warningsFound > 0 ? 'text-yellow-400' : 'text-gray-500'}>
                      {run.warningsFound}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500 text-xs">
                    {run.completedAt ? new Date(run.completedAt).toLocaleString() : '—'}
                  </td>
                  <td className="py-3 text-right">
                    {run.status === 'completed' && (
                      <button
                        onClick={() => handleExportCsv(run)}
                        disabled={exporting === run.id}
                        className="text-xs text-purple-400 hover:text-purple-300 disabled:text-gray-600 transition-colors"
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
      )}

      {/* SOC 2 note */}
      {runs.length > 0 && (
        <div className="mt-4 p-4 rounded-lg bg-blue-900/20 border border-blue-800">
          <p className="text-sm text-blue-300 font-medium mb-1">SOC 2 Evidence Collection</p>
          <p className="text-xs text-blue-400/70">
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
    return <span className="text-xs text-green-400 font-medium">✓ Compliant</span>;
  }
  if (run.status === 'completed' && run.violationsFound > 0) {
    return <span className="text-xs text-red-400 font-medium">✗ Violations</span>;
  }
  if (run.status === 'failed') {
    return <span className="text-xs text-red-500">Failed</span>;
  }
  return <span className="text-xs text-yellow-400">{run.status}</span>;
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
