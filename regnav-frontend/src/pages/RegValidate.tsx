import React, { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Select } from '../components/ui/Select';
import { Badge, BadgeTone } from '../components/ui/Badge';
import { US_STATE_OPTIONS, LOB_OPTIONS } from '../lib/constants';
import { deleteRun, getResults, listRuns, runValidation } from '../services/regvalidate';
import type { ValidateRequest, ValidationResult, ValidationRun } from '../types/regvalidate';

const FILE_TYPES = ['wcpols', 'acord', 'csv', 'text'];

const SEVERITY_TONES: Record<string, BadgeTone> = {
  error: 'danger',
  warning: 'warning',
  info: 'info',
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Validate Panel */}
        <div className="space-y-4">
          <div className="card">
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--text)' }}
            >
              Validate a File
            </h3>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <div className="flex-1 min-w-[12rem]">
                  <label
                    className="block text-xs mb-1"
                    style={{ color: 'var(--muted)' }}
                  >
                    Filename
                  </label>
                  <input
                    type="text"
                    value={filename}
                    onChange={e => setFilename(e.target.value)}
                    className="input text-sm"
                  />
                </div>
                <div className="w-32">
                  <label
                    className="block text-xs mb-1"
                    style={{ color: 'var(--muted)' }}
                  >
                    File Type
                  </label>
                  <select
                    value={fileType}
                    onChange={e => setFileType(e.target.value)}
                    className="select text-sm"
                  >
                    {FILE_TYPES.map(t => (
                      <option key={t} value={t}>{t.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                <div className="flex-1 min-w-[12rem]">
                  <label
                    className="block text-xs mb-1"
                    style={{ color: 'var(--muted)' }}
                  >
                    State (optional)
                  </label>
                  <Select
                    options={US_STATE_OPTIONS}
                    value={stateCode}
                    onChange={e => setStateCode(e.target.value)}
                    allLabel="All states"
                    className="text-sm"
                  />
                </div>
                <div className="flex-1 min-w-[12rem]">
                  <label
                    className="block text-xs mb-1"
                    style={{ color: 'var(--muted)' }}
                  >
                    LOB (optional)
                  </label>
                  <Select
                    options={LOB_OPTIONS}
                    value={lob}
                    onChange={e => setLob(e.target.value)}
                    allLabel="All LOBs"
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-xs mb-1"
                  style={{ color: 'var(--muted)' }}
                >
                  File Content
                  <span className="ml-2" style={{ color: 'var(--muted)' }}>
                    (paste or edit the data)
                  </span>
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="input min-h-[12rem] resize-y text-sm font-mono"
                  placeholder="Paste WCPOLS, ACORD, CSV or plain text…"
                />
              </div>

              {validateError && (
                <div
                  className="p-3 rounded-lg border text-sm"
                  style={{
                    backgroundColor: 'var(--error-bg)',
                    borderColor: 'var(--error)',
                    color: 'var(--error)',
                  }}
                >
                  {validateError}
                </div>
              )}

              <button
                onClick={handleValidate}
                disabled={validating || !content.trim()}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {validating ? 'Validating…' : 'Run Validation'}
              </button>
            </div>
          </div>

          {/* History */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-base font-semibold"
                style={{ color: 'var(--text)' }}
              >
                Validation History
              </h3>
              <button
                onClick={fetchRuns}
                className="text-xs"
                style={{ color: 'rgb(var(--color-accent-primary))' }}
              >
                Refresh
              </button>
            </div>
            {runsLoading ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
            ) : runsError ? (
              <p className="text-sm" style={{ color: 'var(--error)' }}>{runsError}</p>
            ) : runs.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No validation runs yet.</p>
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
              <p style={{ color: 'var(--muted)' }}>Select a validation run to see results</p>
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
      ? 'var(--success)'
      : run.status === 'completed' && run.violationsFound > 0
      ? 'var(--error)'
      : run.status === 'failed'
      ? 'var(--error)'
      : 'var(--warning)';

  return (
    <div
      onClick={onSelect}
      className="px-3 py-2.5 rounded-lg border cursor-pointer transition-colors"
      style={{
        borderColor: selected
          ? 'rgb(var(--color-accent-primary))'
          : 'var(--border)',
        backgroundColor: selected ? 'var(--accent-bg)' : 'var(--surface-2)',
      }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-sm font-medium truncate"
          style={{ color: 'var(--text)' }}
        >
          {run.filename}
        </p>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span
            className="text-xs font-medium"
            style={{ color: statusColor }}
          >
            {run.status}
          </span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="text-xs transition-colors"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--error)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--muted)';
            }}
          >
            ✕
          </button>
        </div>
      </div>
      <div
        className="flex flex-wrap gap-2 mt-1 text-xs items-center"
        style={{ color: 'var(--muted)' }}
      >
        <Badge tone="neutral">{run.fileType.toUpperCase()}</Badge>
        {run.status === 'completed' && (
          <>
            <span>{run.totalRulesChecked} rules</span>
            {run.violationsFound > 0 && (
              <span style={{ color: 'var(--error)' }}>{run.violationsFound} errors</span>
            )}
            {run.warningsFound > 0 && (
              <span style={{ color: 'var(--warning)' }}>{run.warningsFound} warnings</span>
            )}
            {run.violationsFound === 0 && run.warningsFound === 0 && (
              <span style={{ color: 'var(--success)' }}>Clean</span>
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
          <h3
            className="text-base font-semibold"
            style={{ color: 'var(--text)' }}
          >
            {run.filename}
          </h3>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {run.fileType.toUpperCase()} · {run.totalRulesChecked} rules checked
            {run.completedAt && ` · ${new Date(run.completedAt).toLocaleString()}`}
          </p>
        </div>
        <div className="text-right">
          {run.violationsFound === 0 && run.warningsFound === 0 ? (
            <span className="font-semibold" style={{ color: 'var(--success)' }}>
              ✓ Compliant
            </span>
          ) : (
            <span className="font-semibold" style={{ color: 'var(--error)' }}>
              {run.violationsFound} error{run.violationsFound !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <p
          className="text-sm py-8 text-center"
          style={{ color: 'var(--muted)' }}
        >
          Loading results…
        </p>
      ) : results.length === 0 ? (
        run.status === 'completed' ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-medium" style={{ color: 'var(--success)' }}>
              No violations found
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              All {run.totalRulesChecked} rules passed
            </p>
          </div>
        ) : run.status === 'failed' ? (
          <div
            className="p-3 rounded-lg border text-sm"
            style={{
              backgroundColor: 'var(--error-bg)',
              borderColor: 'var(--error)',
              color: 'var(--error)',
            }}
          >
            {run.errorMessage ?? 'Validation failed with an unknown error.'}
          </div>
        ) : (
          <p
            className="text-sm text-center py-8"
            style={{ color: 'var(--muted)' }}
          >
            No results yet.
          </p>
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
  const tone = SEVERITY_TONES[result.severity] ?? 'danger';
  const icon = SEVERITY_ICONS[result.severity] ?? '✗';

  return (
    <div className="p-3 rounded-lg border text-sm">
      <div className="flex items-start gap-2">
        <Badge tone={tone} className="shrink-0">
          <span className="font-bold">{icon}</span>
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="font-medium" style={{ color: 'var(--text)' }}>
            {result.message}
          </p>
          {(result.fieldName || result.fieldValue) && (
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              {result.fieldName && <span>Field: <code className="font-mono">{result.fieldName}</code></span>}
              {result.fieldName && result.fieldValue && ' = '}
              {result.fieldValue && <code className="font-mono">{result.fieldValue}</code>}
              {result.lineNumber && <span className="ml-2">Line {result.lineNumber}</span>}
            </p>
          )}
          {result.suggestion && (
            <p
              className="mt-1.5 text-xs italic"
              style={{ color: 'var(--muted)' }}
            >
              {result.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export { RegValidate };
