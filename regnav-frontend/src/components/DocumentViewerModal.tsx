// Document viewer — renders the archived PDF / HTML in a modal overlay.
//
// PDFs are loaded as Blob URLs and shown via the browser's built-in PDF
// viewer (no extra dependency). HTML archives are shown in an <iframe>
// with `sandbox` so the original page's scripts can't execute. If the
// document has no archive, the modal explains why and offers nothing
// more — there is no fallback.

import React, { useEffect, useState } from 'react';
import { fetchArchiveBlobUrl } from '../services/regingest';
import type { IngestedDocument } from '../types/regscout';
import { Modal } from './ui/Modal';
import { formatBytes } from '../lib/format';

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

  const title = (
    <div className="min-w-0">
      <div className="truncate" style={{ color: 'var(--text)' }}>
        {document.title}
      </div>
      <p className="text-xs font-normal" style={{ color: 'var(--muted)' }}>
        {document.archiveContentType ?? 'No archive'}
        {document.archiveSizeBytes != null && <> · {formatBytes(document.archiveSizeBytes)}</>}
        <> · {document.chunkCount} chunks indexed</>
      </p>
    </div>
  );

  return (
    <Modal open={true} onClose={onClose} title={title} size="xl" scrollBody={false}>
      <div className="flex-1 min-h-[400px] h-full flex flex-col">
        {!hasArchive ? (
          <div
            className="flex-1 flex flex-col items-center justify-center text-center px-6 min-h-[400px]"
            style={{ color: 'var(--text)' }}
          >
            <div className="text-5xl mb-3">📄</div>
            <p className="text-sm mb-1" style={{ color: 'var(--text)' }}>
              No archive stored for this document
            </p>
            <p className="text-xs max-w-sm" style={{ color: 'var(--muted)' }}>
              Text-only documents (ingested via the &ldquo;Ingest from text&rdquo; tab) have no
              source file. Re-ingest the document from its URL or upload the original PDF to
              enable the viewer.
            </p>
          </div>
        ) : error ? (
          <div
            className="flex-1 flex items-center justify-center text-sm px-6 text-center min-h-[400px]"
            style={{ color: 'var(--error)' }}
          >
            {error}
          </div>
        ) : !blobUrl ? (
          <div
            className="flex-1 flex items-center justify-center text-sm min-h-[400px]"
            style={{ color: 'var(--muted)' }}
          >
            Loading archive…
          </div>
        ) : isHtml ? (
          <iframe
            src={blobUrl}
            title={`Archive of ${document.title}`}
            sandbox=""
            className="w-full flex-1 min-h-[400px] bg-white"
          />
        ) : (
          <iframe
            src={blobUrl}
            title={`Archive of ${document.title}`}
            className="w-full flex-1 min-h-[400px] bg-white"
          />
        )}
      </div>
    </Modal>
  );
};

export default DocumentViewerModal;
