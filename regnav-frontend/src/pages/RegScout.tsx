// RegScout — server-side regulatory document discovery.
//
// Replaces the legacy 1,600-line client-side mock. Now thin glue around
// the FastAPI backend: sources management, run discovery via job queue,
// browse + ingest discovered documents.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { JobProgressModal } from '../components/JobProgressModal';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  createSource,
  deleteSource,
  ingestDiscoveredDoc,
  listDiscoveredDocs,
  listSources,
  startDiscovery,
  updateSource,
} from '../services/regscout';
import type {
  DiscoveredDocStatus,
  DiscoveredDocument,
  RegulatorySource,
  SourceType,
} from '../types/regscout';

interface SourceDraft {
  name: string;
  url: string;
  sourceType: SourceType;
  stateCode: string;
  lob: string;
}

const EMPTY_SOURCE: SourceDraft = {
  name: '',
  url: '',
  sourceType: 'state_dept',
  stateCode: '',
  lob: '',
};

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'state_dept', label: 'State Department' },
  { value: 'bulletin_index', label: 'Bulletin Index' },
  { value: 'naic', label: 'NAIC' },
  { value: 'federal_register', label: 'Federal Register' },
  { value: 'custom', label: 'Custom' },
];

export const RegScout: React.FC = () => {
  const [sources, setSources] = useState<RegulatorySource[]>([]);
  const [discoveredDocs, setDiscoveredDocs] = useState<DiscoveredDocument[]>([]);

  const [stateFilter, setStateFilter] = useState('');
  const [lobFilter, setLobFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<DiscoveredDocStatus | ''>('');
  const [sourceFilter, setSourceFilter] = useState('');

  const [showAddSource, setShowAddSource] = useState(false);
  const [sourceDraft, setSourceDraft] = useState<SourceDraft>(EMPTY_SOURCE);
  const [savingSource, setSavingSource] = useState(false);

  const [activeJob, setActiveJob] = useState<{ id: string; title: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Loaders
  // -------------------------------------------------------------------------

  const refreshSources = useCallback(async () => {
    try {
      const data = await listSources();
      setSources(data);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load sources');
    }
  }, []);

  const refreshDiscoveredDocs = useCallback(async () => {
    try {
      const data = await listDiscoveredDocs({
        sourceId: sourceFilter || undefined,
        status: statusFilter || undefined,
      });
      setDiscoveredDocs(data);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load discovered docs');
    }
  }, [sourceFilter, statusFilter]);

  useEffect(() => {
    void refreshSources();
  }, [refreshSources]);

  useEffect(() => {
    void refreshDiscoveredDocs();
  }, [refreshDiscoveredDocs]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleCreateSource = useCallback(async () => {
    if (!sourceDraft.name.trim() || !sourceDraft.url.trim()) return;
    setSavingSource(true);
    setErrorMessage(null);
    try {
      await createSource({
        name: sourceDraft.name.trim(),
        url: sourceDraft.url.trim(),
        sourceType: sourceDraft.sourceType,
        stateCode: sourceDraft.stateCode.trim() || null,
        lob: sourceDraft.lob.trim() || null,
      });
      setSourceDraft(EMPTY_SOURCE);
      setShowAddSource(false);
      await refreshSources();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save source');
    } finally {
      setSavingSource(false);
    }
  }, [sourceDraft, refreshSources]);

  const handleToggleSource = useCallback(
    async (source: RegulatorySource) => {
      try {
        await updateSource(source.id, { enabled: !source.enabled });
        await refreshSources();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to toggle source');
      }
    },
    [refreshSources],
  );

  const handleDeleteSource = useCallback(
    async (source: RegulatorySource) => {
      if (!window.confirm(`Delete "${source.name}"? Discovered docs will remain.`)) return;
      try {
        await deleteSource(source.id);
        await refreshSources();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to delete source');
      }
    },
    [refreshSources],
  );

  const handleRunDiscovery = useCallback(async () => {
    setErrorMessage(null);
    try {
      const enabledSources = sources.filter((s) => s.enabled);
      if (enabledSources.length === 0) {
        setErrorMessage('Enable at least one source before running discovery.');
        return;
      }
      const { jobId } = await startDiscovery({ all: true });
      setActiveJob({ id: jobId, title: `Discovery — ${enabledSources.length} sources` });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start discovery');
    }
  }, [sources]);

  const handleIngestDoc = useCallback(async (doc: DiscoveredDocument) => {
    setErrorMessage(null);
    try {
      const { jobId } = await ingestDiscoveredDoc(doc.id);
      setActiveJob({ id: jobId, title: `Ingesting — ${doc.title ?? doc.url}` });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start ingestion');
    }
  }, []);

  const handleJobClosed = useCallback(() => {
    setActiveJob(null);
    void refreshSources();
    void refreshDiscoveredDocs();
  }, [refreshSources, refreshDiscoveredDocs]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      if (stateFilter && s.stateCode !== stateFilter) return false;
      if (lobFilter && s.lob !== lobFilter) return false;
      return true;
    });
  }, [sources, stateFilter, lobFilter]);

  const sourceById = useMemo(
    () => new Map(sources.map((s) => [s.id, s])),
    [sources],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <AppLayout title="RegScout — Regulatory Discovery">
      <div className="space-y-6">
        {errorMessage && (
          <div
            className="rounded-lg border p-3 text-sm flex items-start gap-2"
            style={{
              borderColor: 'rgba(220,38,38,0.4)',
              backgroundColor: 'rgba(220,38,38,0.08)',
              color: 'var(--error)',
            }}
          >
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* --- Sources --- */}
        <section
          className="rounded-xl border"
          style={{
            backgroundColor: 'var(--color-bg-panel, var(--surface))',
            borderColor: 'var(--color-border-subtle, var(--border))',
          }}
        >
          <header
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                Regulatory sources
              </h2>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Public regulator index pages that RegScout scans for new documents.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddSource(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                <PlusIcon className="h-4 w-4" />
                Add source
              </button>
              <button
                type="button"
                onClick={() => void handleRunDiscovery()}
                disabled={sources.filter((s) => s.enabled).length === 0}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
                Run discovery
              </button>
            </div>
          </header>

          <div
            className="flex items-center gap-3 px-6 py-3 border-b text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <label className="flex items-center gap-1">
              State
              <input
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="All"
                className="ml-1 px-2 py-1 rounded border text-xs w-20"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text)',
                }}
              />
            </label>
            <label className="flex items-center gap-1">
              LOB
              <input
                value={lobFilter}
                onChange={(e) => setLobFilter(e.target.value)}
                placeholder="All"
                className="ml-1 px-2 py-1 rounded border text-xs w-32"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text)',
                }}
              />
            </label>
            <div className="ml-auto" style={{ color: 'var(--muted)' }}>
              {filteredSources.length} of {sources.length} source
              {sources.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left text-xs uppercase tracking-wide"
                  style={{ color: 'var(--muted)' }}
                >
                  <th className="px-6 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 font-medium">State</th>
                  <th className="px-3 py-3 font-medium">LOB</th>
                  <th className="px-3 py-3 font-medium">Last check</th>
                  <th className="px-3 py-3 font-medium">Docs</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filteredSources.map((source) => (
                  <tr
                    key={source.id}
                    className="border-t"
                    style={{
                      borderColor: 'var(--border)',
                      color: source.enabled ? 'var(--text)' : 'var(--muted)',
                    }}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={source.enabled}
                          onChange={() => void handleToggleSource(source)}
                          aria-label={source.enabled ? 'Disable source' : 'Enable source'}
                          className="cursor-pointer"
                        />
                        <div>
                          <p className="font-medium">{source.name}</p>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs underline"
                            style={{ color: 'var(--muted)' }}
                          >
                            {source.url}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">{source.sourceType}</td>
                    <td className="px-3 py-3 text-xs">{source.stateCode ?? '—'}</td>
                    <td className="px-3 py-3 text-xs">{source.lob ?? '—'}</td>
                    <td className="px-3 py-3 text-xs">
                      {source.lastCheckedAt
                        ? new Date(source.lastCheckedAt).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-xs">{source.discoveredDocCount}</td>
                    <td className="px-3 py-3 text-xs">
                      <SourceStatusBadge status={source.lastStatus} />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void handleDeleteSource(source)}
                        aria-label="Delete source"
                        style={{ color: 'var(--muted)' }}
                        className="p-1 rounded hover:bg-red-500/20"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSources.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-xs" style={{ color: 'var(--muted)' }}>
                      No sources yet. Click <strong>Add source</strong> to register a regulator
                      page, or run{' '}
                      <code className="font-mono text-xs">
                        python -m app.cli seed-regscout-sources
                      </code>{' '}
                      from the backend to seed a default set.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* --- Discovered documents --- */}
        <section
          className="rounded-xl border"
          style={{
            backgroundColor: 'var(--color-bg-panel, var(--surface))',
            borderColor: 'var(--color-border-subtle, var(--border))',
          }}
        >
          <header
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                Discovered documents
              </h2>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                Candidate URLs surfaced by recent discovery runs.
              </p>
            </div>
          </header>

          <div
            className="flex items-center gap-3 px-6 py-3 border-b text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <label className="flex items-center gap-1">
              Source
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="ml-1 px-2 py-1 rounded border text-xs"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text)',
                }}
              >
                <option value="">All</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1">
              Status
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as DiscoveredDocStatus | '')}
                className="ml-1 px-2 py-1 rounded border text-xs"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text)',
                }}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="ingested">Ingested</option>
                <option value="skipped">Skipped</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <div className="ml-auto" style={{ color: 'var(--muted)' }}>
              {discoveredDocs.length} document{discoveredDocs.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left text-xs uppercase tracking-wide"
                  style={{ color: 'var(--muted)' }}
                >
                  <th className="px-6 py-3 font-medium">Title / URL</th>
                  <th className="px-3 py-3 font-medium">Source</th>
                  <th className="px-3 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Discovered</th>
                  <th className="px-6 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {discoveredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-t"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <td className="px-6 py-3 max-w-xl">
                      <p className="font-medium truncate">{doc.title ?? doc.url}</p>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline truncate block"
                        style={{ color: 'var(--muted)' }}
                      >
                        {doc.url}
                      </a>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {sourceById.get(doc.sourceId)?.name ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-xs">{doc.contentType ?? '—'}</td>
                    <td className="px-3 py-3 text-xs">
                      <DocStatusBadge status={doc.status} />
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {new Date(doc.discoveredAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void handleIngestDoc(doc)}
                        disabled={doc.status === 'ingested'}
                        className="text-xs px-2 py-1 rounded-md border disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          borderColor: 'rgb(var(--color-accent-primary))',
                          color: 'rgb(var(--color-accent-primary))',
                        }}
                      >
                        {doc.status === 'ingested' ? 'Ingested' : 'Ingest'}
                      </button>
                    </td>
                  </tr>
                ))}
                {discoveredDocs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-xs" style={{ color: 'var(--muted)' }}>
                      No discovered documents yet — run discovery to populate this list.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showAddSource && (
        <AddSourceModal
          draft={sourceDraft}
          onDraftChange={setSourceDraft}
          onSubmit={() => void handleCreateSource()}
          onClose={() => {
            setShowAddSource(false);
            setSourceDraft(EMPTY_SOURCE);
          }}
          submitting={savingSource}
        />
      )}

      {activeJob && (
        <JobProgressModal
          jobId={activeJob.id}
          title={activeJob.title}
          onClose={handleJobClosed}
        />
      )}
    </AppLayout>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SourceStatusBadge: React.FC<{ status: string | null }> = ({ status }) => {
  if (status === null) {
    return <span style={{ color: 'var(--muted)' }}>never</span>;
  }
  const ok = status === 'ok';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium"
      style={{
        backgroundColor: ok ? 'rgba(34,197,94,0.15)' : 'rgba(220,38,38,0.15)',
        color: ok ? '#16a34a' : '#dc2626',
      }}
    >
      {ok ? <CheckCircleIcon className="h-3 w-3" /> : null}
      {status}
    </span>
  );
};

const DocStatusBadge: React.FC<{ status: DiscoveredDocStatus }> = ({ status }) => {
  const palette: Record<DiscoveredDocStatus, { bg: string; color: string }> = {
    pending: { bg: 'rgba(148,163,184,0.2)', color: '#64748b' },
    ingested: { bg: 'rgba(34,197,94,0.2)', color: '#16a34a' },
    skipped: { bg: 'rgba(234,179,8,0.2)', color: '#ca8a04' },
    failed: { bg: 'rgba(220,38,38,0.2)', color: '#dc2626' },
  };
  const { bg, color } = palette[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md font-medium capitalize"
      style={{ backgroundColor: bg, color }}
    >
      {status}
    </span>
  );
};

interface AddSourceModalProps {
  draft: SourceDraft;
  onDraftChange: (next: SourceDraft) => void;
  onSubmit: () => void;
  onClose: () => void;
  submitting: boolean;
}

const AddSourceModal: React.FC<AddSourceModalProps> = ({
  draft,
  onDraftChange,
  onSubmit,
  onClose,
  submitting,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
  >
    <div
      className="w-full max-w-lg rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Add regulatory source
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{ color: 'var(--muted)' }}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </header>

      <div className="px-6 py-5 space-y-4">
        <FormField label="Name *">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
            placeholder="e.g., California DOI Bulletins"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          />
        </FormField>
        <FormField label="URL *">
          <input
            type="url"
            value={draft.url}
            onChange={(e) => onDraftChange({ ...draft, url: e.target.value })}
            placeholder="https://www.insurance.ca.gov/bulletins/"
            className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
            style={{
              backgroundColor: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          />
        </FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Type">
            <select
              value={draft.sourceType}
              onChange={(e) =>
                onDraftChange({ ...draft, sourceType: e.target.value as SourceType })
              }
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="State">
            <input
              type="text"
              maxLength={4}
              value={draft.stateCode}
              onChange={(e) =>
                onDraftChange({ ...draft, stateCode: e.target.value.toUpperCase() })
              }
              placeholder="CA"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </FormField>
          <FormField label="LOB">
            <input
              type="text"
              value={draft.lob}
              onChange={(e) => onDraftChange({ ...draft, lob: e.target.value })}
              placeholder="workers_comp"
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </FormField>
        </div>
      </div>

      <footer
        className="flex items-center justify-end gap-2 px-6 py-4 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-3 py-2 text-sm rounded-lg border"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !draft.name.trim() || !draft.url.trim()}
          className="px-3 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
        >
          {submitting ? 'Saving…' : 'Add source'}
        </button>
      </footer>
    </div>
  </div>
);

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label
      className="block text-xs font-medium mb-1"
      style={{ color: 'var(--text-secondary)' }}
    >
      {label}
    </label>
    {children}
  </div>
);

export default RegScout;
