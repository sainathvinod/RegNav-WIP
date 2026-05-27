// RuleSense - Regulatory compliance chatbot (RAG over ingested documents).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import {
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  PaperAirplaneIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type {
  ChatMessage,
  ChatSession,
  Citation,
  RuleSenseDocument,
  RuleSenseStreamEvent,
} from '../types';
import {
  createDocument,
  createSession,
  deleteDocument,
  deleteSession,
  getSession,
  listDocuments,
  listSessions,
  sendMessage,
} from '../services/rulesense';

const SAMPLE_PROMPTS = [
  'What are the workers compensation disclosure requirements in California?',
  'Summarize the recent NCCI rate changes for Texas.',
  'Which states require electronic policy filings for auto insurance?',
];

interface UploadDraft {
  title: string;
  text: string;
  stateCode: string;
  lob: string;
}

const EMPTY_DRAFT: UploadDraft = { title: '', text: '', stateCode: '', lob: '' };

export const RuleSense: React.FC = () => {
  // ----- sessions / messages -----
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ----- documents -----
  const [documents, setDocuments] = useState<RuleSenseDocument[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>(EMPTY_DRAFT);
  const [isUploading, setIsUploading] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(true);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  const scrollAnchor = useRef<HTMLDivElement | null>(null);

  // -------------------------------------------------------------------------
  // Initial load
  // -------------------------------------------------------------------------

  const refreshSessions = useCallback(async () => {
    try {
      const data = await listSessions();
      setSessions(data);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.debug('[rulesense] listSessions failed', err);
      }
    }
  }, []);

  const refreshDocuments = useCallback(async () => {
    try {
      const data = await listDocuments();
      setDocuments(data);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.debug('[rulesense] listDocuments failed', err);
      }
    }
  }, []);

  useEffect(() => {
    void refreshSessions();
    void refreshDocuments();
  }, [refreshSessions, refreshDocuments]);

  // -------------------------------------------------------------------------
  // Session selection
  // -------------------------------------------------------------------------

  const handleSelectSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setMessages([]);
    setStreamingText('');
    setStreamingCitations([]);
    setErrorMessage(null);
    setSidebarMobileOpen(false);
    try {
      const { messages: msgs } = await getSession(sessionId);
      setMessages(msgs);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to load session messages',
      );
    }
  }, []);

  const handleNewSession = useCallback(async () => {
    try {
      const session = await createSession();
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
      setStreamingText('');
      setStreamingCitations([]);
      setErrorMessage(null);
      setSidebarMobileOpen(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to create new chat',
      );
    }
  }, []);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await deleteSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (sessionId === activeSessionId) {
          setActiveSessionId(null);
          setMessages([]);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.debug('[rulesense] deleteSession failed', err);
        }
      }
    },
    [activeSessionId],
  );

  // -------------------------------------------------------------------------
  // Sending a message
  // -------------------------------------------------------------------------

  const ensureSession = useCallback(async (): Promise<string> => {
    if (activeSessionId) return activeSessionId;
    const session = await createSession();
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    return session.id;
  }, [activeSessionId]);

  const handleSend = useCallback(async () => {
    const text = draftMessage.trim();
    if (!text || isStreaming) return;

    setErrorMessage(null);
    setIsStreaming(true);
    setStreamingText('');
    setStreamingCitations([]);
    const userTurnId = `tmp-user-${Date.now()}`;
    const optimisticUserMessage: ChatMessage = {
      id: userTurnId,
      sessionId: activeSessionId ?? '',
      role: 'user',
      content: text,
      citations: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);
    setDraftMessage('');

    let buffered = '';
    let citationsForTurn: Citation[] = [];

    try {
      const sessionId = await ensureSession();
      await sendMessage(sessionId, text, (event: RuleSenseStreamEvent) => {
        if (event.type === 'citations') {
          citationsForTurn = event.citations ?? [];
          setStreamingCitations(citationsForTurn);
        } else if (event.type === 'token') {
          buffered += event.text;
          setStreamingText(buffered);
        } else if (event.type === 'done') {
          const assistantMessage: ChatMessage = {
            id: `tmp-asst-${Date.now()}`,
            sessionId,
            role: 'assistant',
            content: buffered,
            citations: citationsForTurn,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setStreamingText('');
          setStreamingCitations([]);
        } else if (event.type === 'error') {
          setErrorMessage(event.message);
        }
      });
      await refreshSessions();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Streaming failed',
      );
    } finally {
      setIsStreaming(false);
    }
  }, [activeSessionId, draftMessage, ensureSession, isStreaming, refreshSessions]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleSend();
    }
  };

  // Autoscroll on new messages / streamed tokens
  useEffect(() => {
    scrollAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streamingText]);

  // -------------------------------------------------------------------------
  // Documents
  // -------------------------------------------------------------------------

  const handleUploadDocument = useCallback(async () => {
    if (!uploadDraft.title.trim() || !uploadDraft.text.trim()) return;
    setIsUploading(true);
    try {
      await createDocument({
        title: uploadDraft.title.trim(),
        text: uploadDraft.text.trim(),
        stateCode: uploadDraft.stateCode.trim() || null,
        lob: uploadDraft.lob.trim() || null,
      });
      setUploadDraft(EMPTY_DRAFT);
      setShowUploadModal(false);
      await refreshDocuments();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to ingest document',
      );
    } finally {
      setIsUploading(false);
    }
  }, [uploadDraft, refreshDocuments]);

  const handleDeleteDocument = useCallback(
    async (documentId: string) => {
      try {
        await deleteDocument(documentId);
        await refreshDocuments();
      } catch (err) {
        if (import.meta.env.DEV) {
          console.debug('[rulesense] deleteDocument failed', err);
        }
      }
    },
    [refreshDocuments],
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  return (
    <AppLayout title="RuleSense — AI Insights">
      <div className="flex h-[calc(100vh-9rem)] md:h-[calc(100vh-10rem)] gap-3 md:gap-4 relative">
        {/* Mobile chats-drawer backdrop */}
        {sidebarMobileOpen && (
          <button
            type="button"
            aria-label="Close chat history"
            onClick={() => setSidebarMobileOpen(false)}
            className="md:hidden absolute inset-0 z-10 bg-black/50"
          />
        )}

        {/* Sidebar ------------------------------------------------------ */}
        <aside
          className={`flex-col rounded-xl border overflow-hidden absolute md:relative top-0 left-0 z-20 h-full w-72 md:w-72 md:flex-shrink-0 transition-transform duration-200 ${
            sidebarMobileOpen ? 'flex translate-x-0' : 'hidden md:flex -translate-x-full md:translate-x-0'
          }`}
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={handleNewSession}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              New chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            <p
              className="px-2 pt-1 pb-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--muted)' }}
            >
              Sessions
            </p>
            {sessions.length === 0 ? (
              <p className="px-3 py-4 text-xs" style={{ color: 'var(--muted)' }}>
                No previous chats. Start a new conversation above.
              </p>
            ) : (
              <ul className="space-y-1">
                {sessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  return (
                    <li key={session.id}>
                      <div
                        className="group flex items-center justify-between gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                        style={{
                          backgroundColor: isActive
                            ? 'rgba(var(--color-accent-primary), 0.18)'
                            : 'transparent',
                          color: isActive
                            ? 'rgb(var(--color-accent-primary))'
                            : 'var(--text-secondary)',
                        }}
                        onClick={() => void handleSelectSession(session.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ChatBubbleLeftRightIcon className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate text-sm">{session.title}</span>
                        </div>
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1 py-1 rounded hover:bg-red-500/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteSession(session.id);
                          }}
                          aria-label="Delete session"
                          style={{ color: 'var(--muted)' }}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Documents accordion ------------------------------------ */}
            <div className="mt-6 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setDocumentsOpen((v) => !v)}
                className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--muted)' }}
              >
                <span className="flex items-center gap-2">
                  <DocumentTextIcon className="h-4 w-4" />
                  Documents ({documents.length})
                </span>
                <span>{documentsOpen ? '−' : '+'}</span>
              </button>

              {documentsOpen && (
                <div className="mt-2">
                  <Link
                    to="/regingest"
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Add via RegIngest
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(true)}
                    className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors"
                    style={{
                      borderColor: 'var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <PlusIcon className="h-4 w-4" />
                    Quick add (text)
                  </button>

                  <ul className="mt-2 space-y-1">
                    {documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="group flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs"
                        style={{
                          backgroundColor: 'var(--surface-2)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm" style={{ color: 'var(--text)' }}>
                            {doc.title}
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                            {doc.stateCode ?? '—'} · {doc.chunkCount} chunks · {doc.status}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Delete document"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20"
                          style={{ color: 'var(--muted)' }}
                          onClick={() => void handleDeleteDocument(doc.id)}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Chat pane --------------------------------------------------- */}
        <section
          className="flex-1 flex flex-col rounded-xl border overflow-hidden min-w-0"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          {/* Header */}
          <header
            className="px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between gap-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setSidebarMobileOpen(true)}
                className="md:hidden p-1.5 rounded-lg"
                aria-label="Open chat history"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
              </button>
              <div
                className="p-2 rounded-lg flex-shrink-0"
                style={{ backgroundColor: 'rgb(var(--color-accent-primary))' }}
              >
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-semibold truncate" style={{ color: 'var(--text)' }}>
                  RuleSense
                </h1>
                <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                  {activeSession?.title ?? 'Regulatory compliance assistant'}
                </p>
              </div>
            </div>
          </header>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {messages.length === 0 && !isStreaming ? (
              <EmptyState
                onPromptSelect={(p) => setDraftMessage(p)}
                disabled={isStreaming}
              />
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {isStreaming && (
                  <StreamingBubble text={streamingText} citations={streamingCitations} />
                )}
                <div ref={scrollAnchor} />
              </div>
            )}
          </div>

          {/* Composer */}
          {errorMessage && (
            <div
              className="px-6 py-2 text-xs border-t"
              style={{
                backgroundColor: 'rgba(220, 38, 38, 0.08)',
                color: 'var(--error)',
                borderColor: 'var(--border)',
              }}
            >
              {errorMessage}
            </div>
          )}

          <div className="border-t px-4 sm:px-6 py-3 sm:py-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-end gap-2 sm:gap-3 max-w-3xl mx-auto">
              <textarea
                value={draftMessage}
                onChange={(e) => setDraftMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a regulatory question… (Cmd/Ctrl+Enter to send)"
                rows={2}
                className="input flex-1 resize-none text-sm"
                disabled={isStreaming}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!draftMessage.trim() || isStreaming}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {showUploadModal && (
        <UploadDocumentModal
          draft={uploadDraft}
          onDraftChange={setUploadDraft}
          onSubmit={() => void handleUploadDocument()}
          onClose={() => {
            setShowUploadModal(false);
            setUploadDraft(EMPTY_DRAFT);
          }}
          isSubmitting={isUploading}
        />
      )}
    </AppLayout>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  onPromptSelect: (prompt: string) => void;
  disabled: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onPromptSelect, disabled }) => (
  <div className="max-w-2xl mx-auto text-center py-12">
    <div
      className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
      style={{ backgroundColor: 'rgba(var(--color-accent-primary), 0.15)' }}
    >
      <SparklesIcon
        className="h-8 w-8"
        style={{ color: 'rgb(var(--color-accent-primary))' }}
      />
    </div>
    <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text)' }}>
      Welcome to RuleSense
    </h2>
    <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
      Ask grounded questions about your ingested regulatory documents. Each
      answer cites the source chunks it relied on.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {SAMPLE_PROMPTS.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onPromptSelect(prompt)}
          className="text-left text-sm px-4 py-3 rounded-lg border transition-colors hover:border-purple-500"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--surface)',
            color: 'var(--text-secondary)',
          }}
        >
          {prompt}
        </button>
      ))}
    </div>
  </div>
);

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap"
        style={{
          backgroundColor: isUser
            ? 'rgb(var(--color-accent-primary))'
            : 'var(--surface-2)',
          color: isUser ? '#FFFFFF' : 'var(--text)',
        }}
      >
        <div>{message.content}</div>
        {!isUser && message.citations && message.citations.length > 0 && (
          <CitationsRow citations={message.citations} />
        )}
      </div>
    </div>
  );
};

const StreamingBubble: React.FC<{ text: string; citations: Citation[] }> = ({
  text,
  citations,
}) => (
  <div className="flex justify-start">
    <div
      className="max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap"
      style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text)' }}
    >
      {text ? (
        <div>{text}</div>
      ) : (
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
          <span className="animate-pulse">●</span>
          <span className="animate-pulse [animation-delay:0.2s]">●</span>
          <span className="animate-pulse [animation-delay:0.4s]">●</span>
          <span className="ml-1">Thinking…</span>
        </div>
      )}
      {citations.length > 0 && <CitationsRow citations={citations} />}
    </div>
  </div>
);

const CitationsRow: React.FC<{ citations: Citation[] }> = ({ citations }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
      <p className="text-[10px] uppercase font-semibold mb-2" style={{ color: 'var(--muted)' }}>
        Sources
      </p>
      <div className="flex flex-wrap gap-2">
        {citations.map((citation, idx) => (
          <button
            key={`${citation.documentId}-${citation.chunkIndex}-${idx}`}
            type="button"
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
            className="text-xs px-2 py-1 rounded-md border transition-colors"
            style={{
              borderColor: 'rgb(var(--color-accent-primary))',
              backgroundColor:
                openIdx === idx
                  ? 'rgba(var(--color-accent-primary), 0.18)'
                  : 'transparent',
              color: 'rgb(var(--color-accent-primary))',
            }}
            title={citation.documentTitle}
          >
            [{idx + 1}] {citation.documentTitle.slice(0, 32)}
            {citation.documentTitle.length > 32 ? '…' : ''}
          </button>
        ))}
      </div>
      {openIdx !== null && citations[openIdx] && (
        <div
          className="mt-2 p-2 rounded-md text-xs"
          style={{
            backgroundColor: 'var(--surface)',
            color: 'var(--text-secondary)',
          }}
        >
          <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>
            {citations[openIdx].documentTitle} (chunk {citations[openIdx].chunkIndex})
          </p>
          <p className="whitespace-pre-wrap leading-relaxed">
            {citations[openIdx].snippet}
          </p>
        </div>
      )}
    </div>
  );
};

interface UploadModalProps {
  draft: UploadDraft;
  onDraftChange: (next: UploadDraft) => void;
  onSubmit: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}

const UploadDocumentModal: React.FC<UploadModalProps> = ({
  draft,
  onDraftChange,
  onSubmit,
  onClose,
  isSubmitting,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
  >
    <div
      className="w-full max-w-xl rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
          Add document
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
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Title *
          </label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => onDraftChange({ ...draft, title: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
            placeholder="e.g., Wisconsin OCI Bulletin 2026-04"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              State code
            </label>
            <input
              type="text"
              value={draft.stateCode}
              maxLength={8}
              onChange={(e) =>
                onDraftChange({ ...draft, stateCode: e.target.value.toUpperCase() })
              }
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
              placeholder="CA"
            />
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              Line of business
            </label>
            <input
              type="text"
              value={draft.lob}
              onChange={(e) => onDraftChange({ ...draft, lob: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border text-sm"
              style={{
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
              placeholder="workers_comp"
            />
          </div>
        </div>

        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Text *
          </label>
          <textarea
            value={draft.text}
            onChange={(e) => onDraftChange({ ...draft, text: e.target.value })}
            rows={8}
            className="w-full px-3 py-2 rounded-lg border text-sm font-mono"
            style={{
              backgroundColor: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
            placeholder="Paste the regulatory text here…"
          />
          <p className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>
            Phase 2 accepts plaintext only. PDF parsing lands in Phase 3.
          </p>
        </div>
      </div>
      <footer
        className="flex items-center justify-end gap-2 px-6 py-4 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-3 py-2 text-sm rounded-lg border transition-colors"
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
          disabled={isSubmitting || !draft.title.trim() || !draft.text.trim()}
          className="px-3 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
        >
          {isSubmitting ? 'Ingesting…' : 'Ingest document'}
        </button>
      </footer>
    </div>
  </div>
);

export default RuleSense;
