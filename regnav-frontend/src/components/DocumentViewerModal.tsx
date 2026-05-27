// Document viewer — renders the archived PDF / HTML in a modal overlay.
//
// PDFs are loaded as Blob URLs and shown via the browser's built-in PDF
// viewer (no extra dependency). HTML archives are shown in an <iframe>
// with `sandbox` so the original page's scripts can't execute. If the
// document has no archive, the modal explains why and offers nothing
// more — there is no fallback.

import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { fetchArchiveBlobUrl } from '../services/regingest';
import type { IngestedDocument } from '../types/regscout';

interface DocumentViewerModalProps {
  document: IngestedDocument;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  onClose,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasArchive = Boolean(document.archiveContentType);
  const isHtml = (document.archiveContentType ?? '').toLowerCase().includes('html');

  useEffect(() => {
    if (!hasArchive) return;
    let cancelled = false;
    let createdUrl: string | null = null;
    (async () => {
      try {
        const url = await fetchArchiveBlobUrl(document.id);
        createdUrl = url;
        if (!cancelled) setBlobUrl(url);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load archive');
      }
    })();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [document.id, hasArchive]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="w-full max-w-5xl h-[85vh] rounded-xl border overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <header
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="min-w-0">
            <h3 className="text-base font-semibold truncate" style={{ color: 'var(--text)' }}>
              {document.title}
            </h3>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {document.archiveContentType ?? 'No archive'}
              {document.archiveSizeBytes != null && (
                <> · {(document.archiveSizeBytes / 1024).toFixed(1)} KB</>
              )}
              <> · {document.chunkCount} chunks indexed</>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close viewer"
            style={{ color: 'var(--muted)' }}
            className="p-1 rounded hover:bg-gray-700/30"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 bg-gray-900">
          {!hasArchive ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="text-5xl mb-3">📄</div>
              <p className="text-sm text-gray-300 mb-1">No archive stored for this document</p>
              <p className="text-xs text-gray-500 max-w-sm">
                Text-only documents (ingested via the &ldquo;Ingest from text&rdquo; tab) have no
                source file. Re-ingest the document from its URL or upload the original PDF to
                enable the viewer.
              </p>
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-sm text-red-300 px-6 text-center">
              {error}
            </div>
          ) : !blobUrl ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              Loading archive…
            </div>
          ) : isHtml ? (
            <iframe
              src={blobUrl}
              title={`Archive of ${document.title}`}
              sandbox=""
              className="w-full h-full bg-white"
            />
          ) : (
            <iframe
              src={blobUrl}
              title={`Archive of ${document.title}`}
              className="w-full h-full bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewerModal;
