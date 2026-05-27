// RegIngest — server-side document ingestion (URL, text, PDF upload) + documents tab.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { JobProgressModal } from '../components/JobProgressModal';
import {
  ArrowUpTrayIcon,
  DocumentTextIcon,
  EyeIcon,
  LinkIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  deleteIngestedDocument,
  ingestFromFile,
  ingestFromText,
  ingestFromUrl,
  listIngestedDocuments,
} from '../services/regingest';
import type { IngestedDocument } from '../types/regscout';

type Tab = 'url' | 'text' | 'file' | 'documents';

interface UrlDraft {
  url: string;
  title: string;
  stateCode: string;
  lob: string;
}

interface TextDraft {
  title: string;
  text: string;
  stateCode: string;
  lob: string;
}

interface FileDraft {
  file: File | null;
  title: string;
  stateCode: string;
  lob: string;
}

const EMPTY_URL: UrlDraft = { url: '', title: '', stateCode: '', lob: '' };
const EMPTY_TEXT: TextDraft = { title: '', text: '', stateCode: '', lob: '' };
const EMPTY_FILE: FileDraft = { file: null, title: '', stateCode: '', lob: '' };

export const RegIngest: React.FC = () => {
  const [tab, setTab] = useState<Tab>('url');
  const [urlDraft, setUrlDraft] = useState<UrlDraft>(EMPTY_URL);
  const [textDraft, setTextDraft] = useState<TextDraft>(EMPTY_TEXT);
  const [fileDraft, setFileDraft] = useState<FileDraft>(EMPTY_FILE);
  const [submitting, setSubmitting] = useState(false);
  const [documents, setDocuments] = useState<IngestedDocument[]>([]);
  const [activeJob, setActiveJob] = useState<{ id: string; title: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewerDoc, setViewerDoc] = useState<IngestedDocument | null>(null);

  const refreshDocs = useCallback(async () => {
    try {
      const data = await listIngestedDocuments();
      setDocuments(data);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load documents');
    }
  }, []);

  useEffect(() => {
    void refreshDocs();
  }, [refreshDocs]);

  const handleSubmitUrl = useCallback(async () => {
    if (!urlDraft.url.trim()) return;
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const { jobId } = await ingestFromUrl({
        url: urlDraft.url.trim(),
        title: urlDraft.title.trim() || null,
        stateCode: urlDraft.stateCode.trim() || null,
        lob: urlDraft.lob.trim() || null,
      });
      setActiveJob({ id: jobId, title: `Ingesting URL — ${urlDraft.url}` });
      setUrlDraft(EMPTY_URL);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start ingestion');
    } finally {
      setSubmitting(false);
    }
  }, [urlDraft]);

  const handleSubmitText = useCallback(async () => {
    if (!textDraft.title.trim() || !textDraft.text.trim()) return;
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const { jobId } = await ingestFromText({
        title: textDraft.title.trim(),
        text: textDraft.text,
        stateCode: textDraft.stateCode.trim() || null,
        lob: textDraft.lob.trim() || null,
      });
      setActiveJob({ id: jobId, title: `Ingesting text — ${textDraft.title}` });
      setTextDraft(EMPTY_TEXT);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start ingestion');
    } finally {
      setSubmitting(false);
    }
  }, [textDraft]);

  const handleSubmitFile = useCallback(async () => {
    if (!fileDraft.file) return;
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const { jobId } = await ingestFromFile({
        file: fileDraft.file,
        title: fileDraft.title.trim() || null,
        stateCode: fileDraft.stateCode.trim() || null,
        lob: fileDraft.lob.trim() || null,
      });
      const label = fileDraft.title.trim() || fileDraft.file.name;
      setActiveJob({ id: jobId, title: `Ingesting PDF — ${label}` });
      setFileDraft(EMPTY_FILE);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to start ingestion');
    } finally {
      setSubmitting(false);
    }
  }, [fileDraft]);

  const handleDelete = useCallback(
    async (doc: IngestedDocument) => {
      if (!window.confirm(`Delete "${doc.title}"? This removes its chunks too.`)) return;
      try {
        await deleteIngestedDocument(doc.id);
        await refreshDocs();
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to delete document');
      }
    },
    [refreshDocs],
  );

  const handleJobClosed = useCallback(() => {
    setActiveJob(null);
    void refreshDocs();
  }, [refreshDocs]);

  return (
    <AppLayout title="RegIngest — Document Repository">
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

        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: 'var(--color-bg-panel, var(--surface))',
            borderColor: 'var(--color-border-subtle, var(--border))',
          }}
        >
          <nav
            className="flex border-b"
            style={{ borderColor: 'var(--border)' }}
            role="tablist"
          >
            <TabButton
              active={tab === 'url'}
              onClick={() => setTab('url')}
              icon={<LinkIcon className="h-4 w-4" />}
              label="Ingest from URL"
            />
            <TabButton
              active={tab === 'text'}
              onClick={() => setTab('text')}
              icon={<DocumentTextIcon className="h-4 w-4" />}
              label="Ingest from text"
            />
            <TabButton
              active={tab === 'file'}
              onClick={() => setTab('file')}
              icon={<ArrowUpTrayIcon className="h-4 w-4" />}
              label="Upload PDF"
            />
            <TabButton
              active={tab === 'documents'}
              onClick={() => setTab('documents')}
              icon={<DocumentTextIcon className="h-4 w-4" />}
              label={`Documents (${documents.length})`}
            />
          </nav>

          <div className="p-6">
            {tab === 'url' && (
              <UrlForm
                draft={urlDraft}
                onChange={setUrlDraft}
                onSubmit={() => void handleSubmitUrl()}
                submitting={submitting}
              />
            )}
            {tab === 'text' && (
              <TextForm
                draft={textDraft}
                onChange={setTextDraft}
                onSubmit={() => void handleSubmitText()}
                submitting={submitting}
              />
            )}
            {tab === 'file' && (
              <FileForm
                draft={fileDraft}
                onChange={setFileDraft}
                onSubmit={() => void handleSubmitFile()}
                submitting={submitting}
              />
            )}
            {tab === 'documents' && (
              <DocumentsTable
                documents={documents}
                onDelete={handleDelete}
                onView={setViewerDoc}
              />
            )}
          </div>
        </div>
      </div>

      {activeJob && (
        <JobProgressModal
          jobId={activeJob.id}
          title={activeJob.title}
          onClose={handleJobClosed}
        />
      )}

      {viewerDoc && (
        <DocumentViewerModal document={viewerDoc} onClose={() => setViewerDoc(null)} />
      )}
    </AppLayout>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    role="tab"
    aria-selected={active}
    className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors"
    style={{
      borderColor: active ? 'rgb(var(--color-accent-primary))' : 'transparent',
      color: active ? 'rgb(var(--color-accent-primary))' : 'var(--text-secondary)',
    }}
  >
    {icon}
    {label}
  </button>
);

const UrlForm: React.FC<{
  draft: UrlDraft;
  onChange: (next: UrlDraft) => void;
  onSubmit: () => void;
  submitting: boolean;
}> = ({ draft, onChange, onSubmit, submitting }) => (
  <div className="space-y-4 max-w-2xl">
    <Field label="URL *">
      <input
        type="url"
        value={draft.url}
        onChange={(e) => onChange({ ...draft, url: e.target.value })}
        placeholder="https://www.tdi.texas.gov/bulletins/2026/b-2026-04.html"
        className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
        style={{
          backgroundColor: 'var(--surface-2)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      />
    </Field>
    <Field label="Title">
      <input
        type="text"
        value={draft.title}
        onChange={(e) => onChange({ ...draft, title: e.target.value })}
        placeholder="Auto-fetched from <title> if empty"
        className="w-full px-3 py-2 rounded-lg border text-sm"
        style={{
          backgroundColor: 'var(--surface-2)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      />
    </Field>
    <div className="grid grid-cols-2 gap-3">
      <Field label="State">
        <input
          type="text"
          maxLength={4}
          value={draft.stateCode}
          onChange={(e) => onChange({ ...draft, stateCode: e.target.value.toUpperCase() })}
          placeholder="TX"
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: 'var(--surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
          }}
        />
      </Field>
      <Field label="Line of business">
        <input
          type="text"
          value={draft.lob}
          onChange={(e) => onChange({ ...draft, lob: e.target.value })}
          placeholder="workers_comp"
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: 'var(--surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
          }}
        />
      </Field>
    </div>

    <p className="text-xs" style={{ color: 'var(--muted)' }}>
      PDF support arrives with Azure Document Intelligence in Phase 4. For now, the backend
      handles HTML and plain text.
    </p>

    <div className="flex justify-end">
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !draft.url.trim()}
        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
      >
        {submitting ? 'Queueing…' : 'Ingest URL'}
      </button>
    </div>
  </div>
);

const TextForm: React.FC<{
  draft: TextDraft;
  onChange: (next: TextDraft) => void;
  onSubmit: () => void;
  submitting: boolean;
}> = ({ draft, onChange, onSubmit, submitting }) => (
  <div className="space-y-4 max-w-2xl">
    <Field label="Title *">
      <input
        type="text"
        value={draft.title}
        onChange={(e) => onChange({ ...draft, title: e.target.value })}
        placeholder="e.g., TX WC Notice 2026-12"
        className="w-full px-3 py-2 rounded-lg border text-sm"
        style={{
          backgroundColor: 'var(--surface-2)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      />
    </Field>
    <div className="grid grid-cols-2 gap-3">
      <Field label="State">
        <input
          type="text"
          maxLength={4}
          value={draft.stateCode}
          onChange={(e) => onChange({ ...draft, stateCode: e.target.value.toUpperCase() })}
          placeholder="TX"
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: 'var(--surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
          }}
        />
      </Field>
      <Field label="Line of business">
        <input
          type="text"
          value={draft.lob}
          onChange={(e) => onChange({ ...draft, lob: e.target.value })}
          placeholder="workers_comp"
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: 'var(--surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
          }}
        />
      </Field>
    </div>
    <Field label="Text *">
      <textarea
        value={draft.text}
        onChange={(e) => onChange({ ...draft, text: e.target.value })}
        rows={10}
        placeholder="Paste the regulatory text here…"
        className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
        style={{
          backgroundColor: 'var(--surface-2)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
        }}
      />
    </Field>
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !draft.title.trim() || !draft.text.trim()}
        className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
      >
        {submitting ? 'Queueing…' : 'Ingest text'}
      </button>
    </div>
  </div>
);

const FileForm: React.FC<{
  draft: FileDraft;
  onChange: (next: FileDraft) => void;
  onSubmit: () => void;
  submitting: boolean;
}> = ({ draft, onChange, onSubmit, submitting }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className="space-y-4 max-w-2xl">
      <Field label="PDF file *">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => onChange({ ...draft, file: e.target.files?.[0] ?? null })}
          className="block w-full text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-purple-700 file:text-white file:cursor-pointer"
          style={{ color: 'var(--text)' }}
        />
        {draft.file && (
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            {draft.file.name} · {(draft.file.size / 1024).toFixed(1)} KB
          </p>
        )}
      </Field>
      <Field label="Title (optional)">
        <input
          type="text"
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          placeholder="Defaults to the filename"
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: 'var(--surface-2)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
          }}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="State">
          <input
            type="text"
            maxLength={4}
            value={draft.stateCode}
            onChange={(e) => onChange({ ...draft, stateCode: e.target.value.toUpperCase() })}
            placeholder="TX"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          />
        </Field>
        <Field label="Line of business">
          <input
            type="text"
            value={draft.lob}
            onChange={(e) => onChange({ ...draft, lob: e.target.value })}
            placeholder="workers_comp"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          />
        </Field>
      </div>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        Tables and headings are preserved via the Docling parser. The original PDF is stored
        alongside the extracted text and can be re-opened from the Documents tab.
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !draft.file}
          className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
        >
          {submitting ? 'Uploading…' : 'Ingest PDF'}
        </button>
      </div>
    </div>
  );
};

const DocumentsTable: React.FC<{
  documents: IngestedDocument[];
  onDelete: (doc: IngestedDocument) => void;
  onView: (doc: IngestedDocument) => void;
}> = ({ documents, onDelete, onView }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr
          className="text-left text-xs uppercase tracking-wide"
          style={{ color: 'var(--muted)' }}
        >
          <th className="px-3 py-3 font-medium">Title</th>
          <th className="px-3 py-3 font-medium">Source</th>
          <th className="px-3 py-3 font-medium">State</th>
          <th className="px-3 py-3 font-medium">LOB</th>
          <th className="px-3 py-3 font-medium">Status</th>
          <th className="px-3 py-3 font-medium">Chunks</th>
          <th className="px-3 py-3 font-medium">Created</th>
          <th className="px-3 py-3 font-medium" />
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => (
          <tr
            key={doc.id}
            className="border-t"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <td className="px-3 py-3 max-w-md">
              <p className="font-medium truncate">{doc.title}</p>
              {doc.sourceUrl && (
                <a
                  href={doc.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline truncate block"
                  style={{ color: 'var(--muted)' }}
                >
                  {doc.sourceUrl}
                </a>
              )}
            </td>
            <td className="px-3 py-3 text-xs">{doc.sourceType}</td>
            <td className="px-3 py-3 text-xs">{doc.stateCode ?? '—'}</td>
            <td className="px-3 py-3 text-xs">{doc.lob ?? '—'}</td>
            <td className="px-3 py-3 text-xs">{doc.status}</td>
            <td className="px-3 py-3 text-xs">{doc.chunkCount}</td>
            <td className="px-3 py-3 text-xs">
              {new Date(doc.createdAt).toLocaleString()}
            </td>
            <td className="px-3 py-3 text-right">
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => onView(doc)}
                  disabled={!doc.archiveContentType}
                  aria-label="View document"
                  title={doc.archiveContentType ? 'View archive' : 'No archive stored'}
                  style={{ color: 'var(--muted)' }}
                  className="p-1 rounded hover:bg-purple-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(doc)}
                  aria-label="Delete document"
                  style={{ color: 'var(--muted)' }}
                  className="p-1 rounded hover:bg-red-500/20"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        ))}
        {documents.length === 0 && (
          <tr>
            <td colSpan={8} className="px-3 py-10 text-center text-xs" style={{ color: 'var(--muted)' }}>
              No documents ingested yet. Use the URL or Text tab to get started.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
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

export default RegIngest;
