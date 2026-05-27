import React, { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { deleteRun, getResults, listRuns, runValidation } from '../services/regvalidate';
import type { ValidateRequest, ValidationResult, ValidationRun } from '../types/regvalidate';

const FILE_TYPES = ['wcpols', 'acord', 'csv', 'text'];

const SEVERITY_STYLES = {
  error: 'bg-red-900/40 border-red-700 text-red-300',
  warning: 'bg-yellow-900/40 border-yellow-700 text-yellow-300',
  info: 'bg-blue-900/40 border-blue-700 text-blue-300',
};

const SEVERITY_ICONS = { error: '✗', warning: '⚠', info: 'ℹ' };

const SAMPLE_WCPOLS = `POLICY_NO,STATE,INSURED_NAME,CLASS_CODE,PAYROLL,EFF_DATE,EXP_DATE
WC-2024-001,TX,Acme Corp,8810,250000,2024-01-01,2025-01-01
WC-2024-002,XX,Beta LLC,9999,180000,2024-03-01,2025-03-01
WC-2024-003,CA,Gamma Inc,,95000,2024-06-01,2025-06-01`;

const RegValidate: React.FC = () => {
  const [runs, setRuns] = useState<ValidationRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsError, setRunsError] = useState<string | null>(null);

  // Current run details
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Validate form
  const [filename, setFilename] = useState('policy.wcpols');
  const [fileType, setFileType] = useState('wcpols');
  const [content, setContent] = useState(SAMPLE_WCPOLS);
  const [stateCode, setStateCode] = useState('');
  const [lob, setLob] = useState('');
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setRunsLoading(true);
    setRunsError(null);
    try {
      const data = await listRuns();
      setRuns(data);
    } catch (err) {
      setRunsError(err instanceof Error ? err.message : 'Failed to load runs');
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const fetchResults = async (runId: string) => {
    setResultsLoading(true);
    try {
      const data = await getResults(runId);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setResultsLoading(false);
    }
  };

  const handleSelectRun = (runId: string) => {
    setSelectedRunId(runId);
    fetchResults(runId);
  };

  const handleValidate = async () => {
    if (!content.trim()) return;
    setValidating(true);
    setValidateError(null);
    try {
      const req: ValidateRequest = {
        filename: filename || 'upload.wcpols',
        fileType,
        content,
        stateCode: stateCode || undefined,
        lob: lob || undefined,
      };
      const run = await runValidation(req);
      setRuns(prev => [run, ...prev]);
      setSelectedRunId(run.id);
      await fetchResults(run.id);
    } catch (err) {
      setValidateError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleDeleteRun = async (runId: string) => {
    if (!confirm('Delete this validation run?')) return;
    try {
      await deleteRun(runId);
      setRuns(prev => prev.filter(r => r.id !== runId));
      if (selectedRunId === runId) {
        setSelectedRunId(null);
        setResults([]);
      }
    } catch {
      /* ignore */
    }
  };

  const selectedRun = runs.find(r => r.id === selectedRunId);

  return (
    <AppLayout title="RegValidate — File Validation">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Validate Panel */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-50 mb-4">Validate a File</h3>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">Filename</label>
                  <input
                    type="text"
                    value={filename}
                    onChange={e => setFilename(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs text-gray-400 mb-1">File Type</label>
                  <select
                    value={fileType}
                    onChange={e => setFileType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:border-purple-500"
                  >
                    {FILE_TYPES.map(t => (
                      <option key={t} value={t}>{t.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">State (optional)</label>
                  <input
                    type="text"
                    value={stateCode}
                    onChange={e => setStateCode(e.target.value.toUpperCase())}
                    maxLength={2}
                    placeholder="TX"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">LOB (optional)</label>
                  <input
                    type="text"
                    value={lob}
                    onChange={e => setLob(e.target.value)}
                    placeholder="Workers Compensation"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  File Content
                  <span className="ml-2 text-gray-600">(paste or edit the data)</span>
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 text-sm font-mono focus:outline-none focus:border-purple-500 resize-y"
                  placeholder="Paste WCPOLS, ACORD, CSV or plain text…"
                />
              </div>

              {validateError && (
                <div className="p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
                  {validateError}
                </div>
              )}

              <button
                onClick={handleValidate}
                disabled={validating || !content.trim()}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {validating ? 'Validating…' : 'Run Validation'}
              </button>
            </div>
          </div>

          {/* History */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-50">Validation History</h3>
              <button
                onClick={fetchRuns}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                Refresh
              </button>
            </div>
            {runsLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : runsError ? (
              <p className="text-sm text-red-400">{runsError}</p>
            ) : runs.length === 0 ? (
              <p className="text-sm text-gray-500">No validation runs yet.</p>
            ) : (
              <div className="space-y-2">
                {runs.map(run => (
                  <RunCard
                    key={run.id}
                    run={run}
                    selected={selectedRunId === run.id}
                    onSelect={() => handleSelectRun(run.id)}
                    onDelete={() => handleDeleteRun(run.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Results Panel */}
        <div className="card">
          {!selectedRun ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-400">Select a validation run to see results</p>
            </div>
          ) : (
            <ResultsPanel
              run={selectedRun}
              results={results}
              loading={resultsLoading}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
};

const RunCard: React.FC<{
  run: ValidationRun;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}> = ({ run, selected, onSelect, onDelete }) => {
  const statusColor =
    run.status === 'completed' && run.violationsFound === 0
      ? 'text-green-400'
      : run.status === 'completed' && run.violationsFound > 0
      ? 'text-red-400'
      : run.status === 'failed'
      ? 'text-red-400'
      : 'text-yellow-400';

  return (
    <div
      onClick={onSelect}
      className={`px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
        selected
          ? 'border-purple-600 bg-purple-900/20'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-200 font-medium truncate">{run.filename}</p>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={`text-xs font-medium ${statusColor}`}>{run.status}</span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="text-gray-600 hover:text-red-400 text-xs transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex gap-3 mt-1 text-xs text-gray-400">
        <span className="bg-gray-700 px-1.5 rounded">{run.fileType.toUpperCase()}</span>
        {run.status === 'completed' && (
          <>
            <span>{run.totalRulesChecked} rules</span>
            {run.violationsFound > 0 && (
              <span className="text-red-400">{run.violationsFound} errors</span>
            )}
            {run.warningsFound > 0 && (
              <span className="text-yellow-400">{run.warningsFound} warnings</span>
            )}
            {run.violationsFound === 0 && run.warningsFound === 0 && (
              <span className="text-green-400">Clean</span>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ResultsPanel: React.FC<{
  run: ValidationRun;
  results: ValidationResult[];
  loading: boolean;
}> = ({ run, results, loading }) => {
  const errors = results.filter(r => r.severity === 'error');
  const warnings = results.filter(r => r.severity === 'warning');
  const infos = results.filter(r => r.severity === 'info');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-100">{run.filename}</h3>
          <p className="text-xs text-gray-400">
            {run.fileType.toUpperCase()} · {run.totalRulesChecked} rules checked
            {run.completedAt && ` · ${new Date(run.completedAt).toLocaleString()}`}
          </p>
        </div>
        <div className="text-right">
          {run.violationsFound === 0 && run.warningsFound === 0 ? (
            <span className="text-green-400 font-semibold">✓ Compliant</span>
          ) : (
            <span className="text-red-400 font-semibold">
              {run.violationsFound} error{run.violationsFound !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Loading results…</p>
      ) : results.length === 0 ? (
        run.status === 'completed' ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-green-400 font-medium">No violations found</p>
            <p className="text-sm text-gray-400 mt-1">
              All {run.totalRulesChecked} rules passed
            </p>
          </div>
        ) : run.status === 'failed' ? (
          <div className="p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
            {run.errorMessage ?? 'Validation failed with an unknown error.'}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No results yet.</p>
        )
      ) : (
        <div className="space-y-2">
          {[...errors, ...warnings, ...infos].map(result => (
            <FindingCard key={result.id} result={result} />
          ))}
        </div>
      )}
    </div>
  );
};

const FindingCard: React.FC<{ result: ValidationResult }> = ({ result }) => {
  const style = SEVERITY_STYLES[result.severity] ?? SEVERITY_STYLES.error;
  const icon = SEVERITY_ICONS[result.severity] ?? '✗';

  return (
    <div className={`p-3 rounded-lg border text-sm ${style}`}>
      <div className="flex items-start gap-2">
        <span className="font-bold shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{result.message}</p>
          {(result.fieldName || result.fieldValue) && (
            <p className="mt-1 text-xs opacity-80">
              {result.fieldName && <span>Field: <code className="font-mono">{result.fieldName}</code></span>}
              {result.fieldName && result.fieldValue && ' = '}
              {result.fieldValue && <code className="font-mono">{result.fieldValue}</code>}
              {result.lineNumber && <span className="ml-2">Line {result.lineNumber}</span>}
            </p>
          )}
          {result.suggestion && (
            <p className="mt-1.5 text-xs opacity-75 italic">{result.suggestion}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export { RegValidate };
