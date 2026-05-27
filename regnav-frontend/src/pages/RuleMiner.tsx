import React, { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { JobProgressModal } from '../components/JobProgressModal';
import {
  approveRule,
  deleteRule,
  listRules,
  rejectRule,
  startExtraction,
} from '../services/ruleminer';
import type { Rule, RuleStatus } from '../types/ruleminer';

const STATUS_COLORS: Record<RuleStatus, string> = {
  draft: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  approved: 'bg-green-900 text-green-300 border-green-700',
  rejected: 'bg-red-900 text-red-300 border-red-700',
  superseded: 'bg-gray-700 text-gray-400 border-gray-600',
};

const RULE_TYPE_COLORS: Record<string, string> = {
  filing: 'bg-blue-900 text-blue-300',
  underwriting: 'bg-purple-900 text-purple-300',
  rating: 'bg-orange-900 text-orange-300',
  claims: 'bg-red-900 text-red-300',
  compliance: 'bg-teal-900 text-teal-300',
  general: 'bg-gray-700 text-gray-300',
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

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Delete this rule?')) return;
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

  return (
    <AppLayout title="RuleMiner — Rule Extraction">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Rules', value: stats.total, color: 'bg-purple-600' },
          { label: 'Draft', value: stats.draft, color: 'bg-yellow-600' },
          { label: 'Approved', value: stats.approved, color: 'bg-green-600' },
          { label: 'Rejected', value: stats.rejected, color: 'bg-red-600' },
        ].map(s => (
          <div key={s.label} className="card hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{s.label}</p>
                <p className="text-3xl font-bold text-gray-50">{s.value}</p>
              </div>
              <div className={`w-10 h-10 ${s.color} rounded-lg`} />
            </div>
          </div>
        ))}
      </div>

      {/* Extract Panel */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold text-gray-50 mb-3">Extract Rules from Document</h3>
        <p className="text-sm text-gray-400 mb-4">
          Paste the UUID of an indexed document (from RegIngest) to trigger LLM-based rule
          extraction. Rules land as <span className="text-yellow-400">draft</span> and require
          approval before use in validation.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={documentId}
            onChange={e => setDocumentId(e.target.value)}
            placeholder="Document UUID (e.g. 3f5c…)"
            className="flex-1 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleExtract}
            disabled={!documentId.trim()}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Extract Rules
          </button>
        </div>
        {extractError && (
          <p className="mt-2 text-sm text-red-400">{extractError}</p>
        )}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <input
            type="text"
            value={filterState}
            onChange={e => setFilterState(e.target.value)}
            placeholder="State (e.g. TX)"
            className="w-28 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:border-purple-500"
          />
          <input
            type="text"
            value={filterLob}
            onChange={e => setFilterLob(e.target.value)}
            placeholder="Line of Business"
            className="w-48 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={fetchRules}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Rules Table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading rules…</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">⚖️</div>
            <p className="text-gray-400">No rules found.</p>
            <p className="text-sm text-gray-500 mt-1">
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
  const statusClass = STATUS_COLORS[rule.status] ?? STATUS_COLORS.draft;
  const typeClass = RULE_TYPE_COLORS[rule.ruleType] ?? RULE_TYPE_COLORS.general;
  const confidence = rule.confidenceScore != null
    ? Math.round(rule.confidenceScore * 100)
    : null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-700/30 transition-colors"
        onClick={onToggle}
      >
        <span className="text-gray-500 text-xs w-4">{expanded ? '▼' : '▶'}</span>
        <code className="text-xs text-purple-400 font-mono w-28 shrink-0">{rule.ruleCode}</code>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-100 truncate">{rule.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${typeClass}`}>
              {rule.ruleType}
            </span>
            {rule.stateCode && (
              <span className="text-xs text-gray-400">{rule.stateCode}</span>
            )}
            {rule.lineOfBusiness && (
              <span className="text-xs text-gray-500 truncate">{rule.lineOfBusiness}</span>
            )}
          </div>
        </div>

        {confidence != null && (
          <div className="text-xs text-gray-400 shrink-0">
            <span className={confidence >= 80 ? 'text-green-400' : 'text-yellow-400'}>
              {confidence}%
            </span>
          </div>
        )}

        <span
          className={`px-2 py-0.5 rounded border text-xs font-medium shrink-0 ${statusClass}`}
        >
          {rule.status}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-700 pt-3">
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Rule Text</p>
            <p className="text-sm text-gray-200 leading-relaxed">{rule.text}</p>
          </div>
          {rule.rationale && (
            <div className="mb-3">
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Rationale</p>
              <p className="text-sm text-gray-300">{rule.rationale}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-3">
            {rule.effectiveDate && (
              <span>Effective: <span className="text-gray-300">{rule.effectiveDate}</span></span>
            )}
            {rule.reviewedAt && (
              <span>Reviewed: <span className="text-gray-300">{new Date(rule.reviewedAt).toLocaleDateString()}</span></span>
            )}
            <span>Created: <span className="text-gray-300">{new Date(rule.createdAt).toLocaleDateString()}</span></span>
          </div>

          {rule.status !== 'superseded' && (
            <div className="flex gap-2">
              {rule.status !== 'approved' && (
                <button
                  onClick={onApprove}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
                >
                  Approve
                </button>
              )}
              {rule.status !== 'rejected' && (
                <button
                  onClick={onReject}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-700 text-white rounded text-xs font-medium transition-colors"
                >
                  Reject
                </button>
              )}
              <button
                onClick={onDelete}
                disabled={actionLoading}
                className="px-3 py-1.5 bg-red-800 hover:bg-red-700 disabled:bg-gray-700 text-white rounded text-xs font-medium transition-colors ml-auto"
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
