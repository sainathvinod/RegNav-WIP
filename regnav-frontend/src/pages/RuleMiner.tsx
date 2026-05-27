import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { JobProgressModal } from '../components/JobProgressModal';
import { Badge, BadgeTone } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { US_STATE_OPTIONS, LOB_OPTIONS } from '../lib/constants';
import { humanLabel } from '../lib/format';
import {
  approveRule,
  deleteRule,
  listRules,
  rejectRule,
  startExtraction,
} from '../services/ruleminer';
import type { Rule, RuleStatus } from '../types/ruleminer';

const STATUS_TONES: Record<RuleStatus, BadgeTone> = {
  draft: 'warning',
  approved: 'success',
  rejected: 'danger',
  superseded: 'neutral',
};

const RULE_TYPE_TONES: Record<string, BadgeTone> = {
  filing: 'info',
  underwriting: 'accent',
  rating: 'warning',
  claims: 'danger',
  compliance: 'info',
  general: 'neutral',
};

const RuleMiner: React.FC = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterState, setFilterState] = useState<string>('');
  const [filterLob, setFilterLob] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Extraction flow
  const [documentId, setDocumentId] = useState('');
  const [extractJobId, setExtractJobId] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Delete confirmation modal
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listRules({
        status: filterStatus || undefined,
        stateCode: filterState || undefined,
        lob: filterLob || undefined,
      });
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterState, filterLob]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleApprove = async (ruleId: string) => {
    setActionLoading(ruleId);
    try {
      const updated = await approveRule(ruleId);
      setRules(prev => prev.map(r => (r.id === ruleId ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (ruleId: string) => {
    setActionLoading(ruleId);
    try {
      const updated = await rejectRule(ruleId);
      setRules(prev => prev.map(r => (r.id === ruleId ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = (ruleId: string) => {
    setDeleteId(ruleId);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const ruleId = deleteId;
    setDeleteId(null);
    setActionLoading(ruleId);
    try {
      await deleteRule(ruleId);
      setRules(prev => prev.filter(r => r.id !== ruleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtract = async () => {
    if (!documentId.trim()) return;
    setExtractError(null);
    try {
      const { jobId } = await startExtraction(documentId.trim());
      setExtractJobId(jobId);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Extraction failed');
    }
  };

  const stats = {
    total: rules.length,
    draft: rules.filter(r => r.status === 'draft').length,
    approved: rules.filter(r => r.status === 'approved').length,
    rejected: rules.filter(r => r.status === 'rejected').length,
  };

  const STAT_ACCENTS: Record<string, string> = {
    'Total Rules': 'rgb(var(--color-accent-primary))',
    Draft: 'var(--warning)',
    Approved: 'var(--success)',
    Rejected: 'var(--error)',
  };

  return (
    <AppLayout title="RuleMiner — Rule Extraction">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Rules', value: stats.total },
          { label: 'Draft', value: stats.draft },
          { label: 'Approved', value: stats.approved },
          { label: 'Rejected', value: stats.rejected },
        ].map(s => (
          <div key={s.label} className="card hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{s.label}</p>
                <p className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{s.value}</p>
              </div>
              <div
                className="w-10 h-10 rounded-lg"
                style={{ backgroundColor: STAT_ACCENTS[s.label] }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Extract Panel */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text)' }}>
          Extract Rules from Document
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          Paste the UUID of an indexed document (from RegIngest) to trigger LLM-based rule
          extraction. Rules land as{' '}
          <span style={{ color: 'var(--warning)' }}>draft</span> and require
          approval before use in validation.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={documentId}
            onChange={e => setDocumentId(e.target.value)}
            placeholder="Document UUID (e.g. 3f5c…)"
            className="input flex-1 text-sm"
          />
          <button
            onClick={handleExtract}
            disabled={!documentId.trim()}
            className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Extract Rules
          </button>
        </div>
        <p className="form-help">
          Tip: copy the document ID from{' '}
          <Link to="/regingest" className="underline">
            RegIngest
          </Link>
          .
        </p>
        {extractError && (
          <p className="mt-2 text-sm" style={{ color: 'var(--error)' }}>{extractError}</p>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="select text-sm w-auto"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <div className="w-40">
            <Select
              options={US_STATE_OPTIONS}
              allLabel="All states"
              value={filterState}
              onChange={e => setFilterState(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="w-56">
            <Select
              options={LOB_OPTIONS}
              allLabel="All LOBs"
              value={filterLob}
              onChange={e => setFilterLob(e.target.value)}
              className="text-sm"
            />
          </div>
          <button onClick={fetchRules} className="btn-secondary text-sm">
            Refresh
          </button>
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

      {/* Rules Table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
            Loading rules…
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">⚖️</div>
            <p style={{ color: 'var(--muted)' }}>No rules found.</p>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              Ingest a regulatory document in RegIngest, then extract rules above.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => (
              <RuleRow
                key={rule.id}
                rule={rule}
                expanded={expandedId === rule.id}
                onToggle={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
                onApprove={() => handleApprove(rule.id)}
                onReject={() => handleReject(rule.id)}
                onDelete={() => handleDelete(rule.id)}
                actionLoading={actionLoading === rule.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Extraction job progress modal */}
      {extractJobId && (
        <JobProgressModal
          jobId={extractJobId}
          title="Extracting Rules"
          onClose={() => {
            setExtractJobId(null);
            setDocumentId('');
            fetchRules();
          }}
        />
      )}

      {/* Delete confirmation */}
      <Modal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Rule?"
        size="md"
        footer={
          <>
            <button onClick={() => setDeleteId(null)} className="btn-secondary">
              Cancel
            </button>
            <button onClick={confirmDelete} className="btn-danger">
              Delete
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-secondary)' }}>
          This action cannot be undone. The rule will be permanently deleted.
        </p>
      </Modal>
    </AppLayout>
  );
};

interface RuleRowProps {
  rule: Rule;
  expanded: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  actionLoading: boolean;
}

const RuleRow: React.FC<RuleRowProps> = ({
  rule,
  expanded,
  onToggle,
  onApprove,
  onReject,
  onDelete,
  actionLoading,
}) => {
  const statusTone = STATUS_TONES[rule.status] ?? 'warning';
  const typeTone = RULE_TYPE_TONES[rule.ruleType] ?? 'neutral';
  const confidence = rule.confidenceScore != null
    ? Math.round(rule.confidenceScore * 100)
    : null;
  const confidenceTone: BadgeTone =
    confidence != null && confidence >= 80 ? 'success' : 'warning';

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--surface-2)',
      }}
    >
      {/* Header row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-center gap-3 px-4 py-3 transition-colors"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span className="text-xs w-4" style={{ color: 'var(--muted)' }}>
          {expanded ? '▼' : '▶'}
        </span>
        <code
          className="text-xs font-mono w-28 shrink-0"
          style={{ color: 'rgb(var(--color-accent-primary))' }}
        >
          {rule.ruleCode}
        </code>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
            {rule.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <Badge tone={typeTone}>{humanLabel(rule.ruleType)}</Badge>
            {rule.stateCode && (
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {rule.stateCode}
              </span>
            )}
            {rule.lineOfBusiness && (
              <span className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                {rule.lineOfBusiness}
              </span>
            )}
          </div>
        </div>

        {confidence != null && (
          <div className="shrink-0">
            <Badge tone={confidenceTone}>{confidence}%</Badge>
          </div>
        )}

        <Badge tone={statusTone} className="shrink-0">
          {rule.status}
        </Badge>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="px-4 pb-4 pt-3 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="mb-3">
            <p
              className="text-xs mb-1 uppercase tracking-wide"
              style={{ color: 'var(--muted)' }}
            >
              Rule Text
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
              {rule.text}
            </p>
          </div>
          {rule.rationale && (
            <div className="mb-3">
              <p
                className="text-xs mb-1 uppercase tracking-wide"
                style={{ color: 'var(--muted)' }}
              >
                Rationale
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {rule.rationale}
              </p>
            </div>
          )}
          <div
            className="flex flex-wrap gap-4 text-xs mb-3"
            style={{ color: 'var(--muted)' }}
          >
            {rule.effectiveDate && (
              <span>
                Effective:{' '}
                <span style={{ color: 'var(--text-secondary)' }}>
                  {rule.effectiveDate}
                </span>
              </span>
            )}
            {rule.reviewedAt && (
              <span>
                Reviewed:{' '}
                <span style={{ color: 'var(--text-secondary)' }}>
                  {new Date(rule.reviewedAt).toLocaleDateString()}
                </span>
              </span>
            )}
            <span>
              Created:{' '}
              <span style={{ color: 'var(--text-secondary)' }}>
                {new Date(rule.createdAt).toLocaleDateString()}
              </span>
            </span>
          </div>

          {rule.status !== 'superseded' && (
            <div className="flex gap-2 flex-wrap">
              {rule.status !== 'approved' && (
                <button
                  onClick={onApprove}
                  disabled={actionLoading}
                  className="btn-success text-xs px-2 py-1 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Approve
                </button>
              )}
              {rule.status !== 'rejected' && (
                <button
                  onClick={onReject}
                  disabled={actionLoading}
                  className="btn-secondary text-xs px-2 py-1 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ color: 'var(--warning)' }}
                >
                  Reject
                </button>
              )}
              <button
                onClick={onDelete}
                disabled={actionLoading}
                className="btn-danger text-xs px-2 py-1 disabled:opacity-60 disabled:cursor-not-allowed ml-auto"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { RuleMiner };
