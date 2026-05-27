/**
 * Profile Details Modal
 *
 * Full-featured modal for viewing and editing discovery profiles.
 * Shows all configuration, sources, and metadata with edit capabilities.
 */

import React, { useState, useEffect } from 'react';
import {
  PencilSquareIcon,
  CheckCircleIcon,
  FolderIcon,
  TagIcon,
  CalendarIcon,
  ChartBarIcon,
  LinkIcon,
  TrashIcon,
  ClockIcon,
  BeakerIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { DiscoveryProfile, RegulatorySource } from '../types';
import { Modal } from './ui/Modal';
import { Badge, BadgeTone } from './ui/Badge';
import { formatDateTime } from '../lib/format';

interface ProfileDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: DiscoveryProfile | null;
  onSave: (profileId: string, updates: Partial<DiscoveryProfile>) => void;
  onDuplicate?: (profile: DiscoveryProfile) => void;
  mode: 'view' | 'edit';
}

type Status = 'draft' | 'finalized' | 'used_for_rules';

const STATUS_META: Record<Status, { tone: BadgeTone; icon: React.ReactNode; label: string }> = {
  draft: {
    tone: 'info',
    icon: <ClockIcon className="w-4 h-4" />,
    label: 'Draft',
  },
  finalized: {
    tone: 'success',
    icon: <CheckCircleIcon className="w-4 h-4" />,
    label: 'Finalized',
  },
  used_for_rules: {
    tone: 'accent',
    icon: <BeakerIcon className="w-4 h-4" />,
    label: 'Used for Rules',
  },
};

export const ProfileDetailsModal: React.FC<ProfileDetailsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
  onDuplicate,
  mode: initialMode,
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<Status>('draft');
  const [sources, setSources] = useState<RegulatorySource[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'sources' | 'metadata'>('overview');
  const [error, setError] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setDescription(profile.description || '');
      setTags(profile.tags?.join(', ') || '');
      setStatus(profile.status);
      // DEEP CLONE sources to prevent modifying original profile
      setSources(JSON.parse(JSON.stringify(profile.sources)));
      setMode(initialMode);
    }
  }, [profile, initialMode]);

  if (!isOpen || !profile) return null;

  const handleSave = () => {
    if (!name.trim()) {
      setError('Profile name is required');
      return;
    }

    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updates: Partial<DiscoveryProfile> = {
      name: name.trim(),
      description: description.trim() || undefined,
      tags: tagArray.length > 0 ? tagArray : undefined,
      status,
      sources,
      metadata: {
        totalSources: sources.length,
        govAutoSources: sources.filter((s) => s.trustLevel === 'gov-auto').length,
        userAddedSources: sources.filter((s) => s.trustLevel === 'user-added').length,
        avgConfidence:
          sources.length > 0
            ? sources.reduce((sum, s) => sum + s.confidenceScore, 0) / sources.length
            : 0,
      },
    };

    onSave(profile.id, updates);
    setMode('view');
    setError('');
  };

  const handleCancel = () => {
    // Reset to original values with deep cloning
    setName(profile.name);
    setDescription(profile.description || '');
    setTags(profile.tags?.join(', ') || '');
    setStatus(profile.status);
    // DEEP CLONE sources to prevent modifying original profile
    setSources(JSON.parse(JSON.stringify(profile.sources)));
    setMode('view');
    setError('');
  };

  const handleRemoveSource = (sourceId: string) => {
    setSources(sources.filter((s) => s.id !== sourceId));
    setConfirmRemoveId(null);
  };

  const renderStatusBadge = (s: Status) => {
    const meta = STATUS_META[s];
    return (
      <Badge tone={meta.tone}>
        <span className="inline-flex items-center gap-1">
          {meta.icon}
          {meta.label}
        </span>
      </Badge>
    );
  };

  const title = (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: 'var(--accent-bg)' }}
      >
        <FolderIcon
          className="w-6 h-6"
          style={{ color: 'rgb(var(--color-accent-primary))' }}
        />
      </div>
      <div className="flex-1 min-w-0">
        {mode === 'edit' ? (
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            className="input text-xl font-semibold w-full"
          />
        ) : (
          <h2
            className="text-xl font-semibold truncate"
            style={{ color: 'var(--text)' }}
          >
            {name}
          </h2>
        )}
        {error && (
          <p className="text-sm mt-1" style={{ color: 'var(--error)' }}>
            {error}
          </p>
        )}
      </div>
      {mode === 'view' && renderStatusBadge(status)}
    </div>
  );

  const footer =
    mode === 'view' ? (
      <>
        {onDuplicate && (
          <button
            onClick={() => {
              onDuplicate(profile);
              onClose();
            }}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
            Duplicate
          </button>
        )}
        <button
          onClick={() => setMode('edit')}
          className="btn-primary inline-flex items-center gap-2"
        >
          <PencilSquareIcon className="w-4 h-4" />
          Edit
        </button>
      </>
    ) : (
      <>
        <button onClick={handleCancel} className="btn-secondary">
          Cancel
        </button>
        <button onClick={handleSave} className="btn-success inline-flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4" />
          Save Changes
        </button>
      </>
    );

  const tabClass = (active: boolean) =>
    `px-4 py-3 font-medium transition-all relative whitespace-nowrap ${
      active ? '' : ''
    }`;

  return (
    <>
      <Modal open={isOpen} onClose={onClose} title={title} footer={footer} size="xl">
        {/* Tabs (scrollable on mobile) */}
        <div
          className="border-b -mx-5 px-5 mb-4 overflow-x-auto table-wrap"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex gap-1">
            {(['overview', 'sources', 'metadata'] as const).map((tab) => {
              const active = selectedTab === tab;
              const labels: Record<typeof tab, string> = {
                overview: 'Overview',
                sources: `Sources (${sources.length})`,
                metadata: 'Configuration',
              };
              return (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={tabClass(active)}
                  style={{
                    color: active
                      ? 'rgb(var(--color-accent-primary))'
                      : 'var(--muted)',
                    borderBottom: active
                      ? '2px solid rgb(var(--color-accent-primary))'
                      : '2px solid transparent',
                  }}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div>
          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Description
                </label>
                {mode === 'edit' ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description for this profile..."
                    rows={3}
                    className="input w-full resize-none"
                  />
                ) : (
                  <p style={{ color: 'var(--muted)' }}>
                    {description || 'No description provided'}
                  </p>
                )}
              </div>

              {/* Status */}
              {mode === 'edit' && (
                <fieldset>
                  <legend
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Status
                  </legend>
                  <div
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3"
                    role="radiogroup"
                  >
                    {(['draft', 'finalized', 'used_for_rules'] as Status[]).map((s) => {
                      const selected = status === s;
                      const captions: Record<Status, string> = {
                        draft: 'Work in progress',
                        finalized: 'Ready for rules',
                        used_for_rules: 'Already mined',
                      };
                      const labels: Record<Status, string> = {
                        draft: 'Draft',
                        finalized: 'Finalized',
                        used_for_rules: 'Used for Rules',
                      };
                      return (
                        <label
                          key={s}
                          className="p-3 rounded-lg border transition-all text-left cursor-pointer"
                          style={{
                            backgroundColor: selected
                              ? 'var(--accent-bg)'
                              : 'var(--surface-2)',
                            borderColor: selected
                              ? 'rgb(var(--color-accent-primary))'
                              : 'var(--border)',
                            color: selected
                              ? 'rgb(var(--color-accent-primary))'
                              : 'var(--muted)',
                          }}
                        >
                          <input
                            type="radio"
                            name="profile-status"
                            value={s}
                            checked={selected}
                            onChange={() => setStatus(s)}
                            className="sr-only"
                          />
                          <div className="font-medium">{labels[s]}</div>
                          <div className="text-xs mt-1 opacity-75">{captions[s]}</div>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {/* Tags */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Tags
                </label>
                {mode === 'edit' ? (
                  <>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g., workers-comp, 2024, priority"
                      className="input w-full"
                    />
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                      Separate tags with commas
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {profile.tags && profile.tags.length > 0 ? (
                      profile.tags.map((tag, idx) => (
                        <Badge key={idx} tone="neutral">
                          <span className="inline-flex items-center gap-1">
                            <TagIcon className="w-3 h-3" />
                            {tag}
                          </span>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--muted)' }}>
                        No tags
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Statistics */}
              <div>
                <label
                  className="block text-sm font-medium mb-3"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Statistics
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div
                    className="rounded-lg p-4 border"
                    style={{
                      backgroundColor: 'var(--surface-2)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
                      Total Sources
                    </div>
                    <div
                      className="text-2xl font-semibold"
                      style={{ color: 'var(--text)' }}
                    >
                      {sources.length}
                    </div>
                  </div>
                  <div
                    className="rounded-lg p-4 border"
                    style={{
                      backgroundColor: 'var(--surface-2)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
                      Gov Auto
                    </div>
                    <div
                      className="text-2xl font-semibold"
                      style={{ color: 'var(--success)' }}
                    >
                      {sources.filter((s) => s.trustLevel === 'gov-auto').length}
                    </div>
                  </div>
                  <div
                    className="rounded-lg p-4 border"
                    style={{
                      backgroundColor: 'var(--surface-2)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
                      User Added
                    </div>
                    <div
                      className="text-2xl font-semibold"
                      style={{ color: 'var(--info)' }}
                    >
                      {sources.filter((s) => s.trustLevel === 'user-added').length}
                    </div>
                  </div>
                  <div
                    className="rounded-lg p-4 border"
                    style={{
                      backgroundColor: 'var(--surface-2)',
                      borderColor: 'var(--border)',
                    }}
                  >
                    <div className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
                      Avg Confidence
                    </div>
                    <div
                      className="text-2xl font-semibold"
                      style={{ color: 'rgb(var(--color-accent-primary))' }}
                    >
                      {sources.length > 0
                        ? (
                            (sources.reduce((sum, s) => sum + s.confidenceScore, 0) /
                              sources.length) *
                            100
                          ).toFixed(0)
                        : 0}
                      %
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div
                    className="mb-1 flex items-center gap-1"
                    style={{ color: 'var(--muted)' }}
                  >
                    <CalendarIcon className="w-4 h-4" />
                    Created
                  </div>
                  <div style={{ color: 'var(--text)' }}>
                    {formatDateTime(profile.createdAt)}
                  </div>
                </div>
                <div>
                  <div
                    className="mb-1 flex items-center gap-1"
                    style={{ color: 'var(--muted)' }}
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    Last Updated
                  </div>
                  <div style={{ color: 'var(--text)' }}>
                    {formatDateTime(profile.updatedAt)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sources Tab */}
          {selectedTab === 'sources' && (
            <div className="space-y-4">
              {sources.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
                  No sources in this profile
                </div>
              ) : (
                <div className="space-y-3">
                  {sources.map((source) => (
                    <SourceCard
                      key={source.id}
                      source={source}
                      canRemove={mode === 'edit'}
                      onRemove={() => setConfirmRemoveId(source.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Configuration Tab */}
          {selectedTab === 'metadata' && (
            <div className="space-y-6">
              <div
                className="rounded-lg p-4 border"
                style={{
                  backgroundColor: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                }}
              >
                <h3
                  className="text-sm font-semibold mb-3 flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ChartBarIcon
                    className="w-5 h-5"
                    style={{ color: 'rgb(var(--color-accent-primary))' }}
                  />
                  Discovery Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="mb-1" style={{ color: 'var(--muted)' }}>
                      Countries
                    </div>
                    <div style={{ color: 'var(--text)' }}>
                      {profile.configuration.countries.join(', ')}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1" style={{ color: 'var(--muted)' }}>
                      States
                    </div>
                    <div style={{ color: 'var(--text)' }}>
                      {profile.configuration.states.join(', ') || 'None'}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1" style={{ color: 'var(--muted)' }}>
                      Line of Business
                    </div>
                    <div style={{ color: 'var(--text)' }}>
                      {profile.configuration.linesOfBusiness || 'None'}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1" style={{ color: 'var(--muted)' }}>
                      Document Types
                    </div>
                    <div style={{ color: 'var(--text)' }}>
                      {profile.configuration.documentTypes.length} selected
                    </div>
                  </div>
                  <div>
                    <div className="mb-1" style={{ color: 'var(--muted)' }}>
                      Search Depth
                    </div>
                    <div className="capitalize" style={{ color: 'var(--text)' }}>
                      {profile.configuration.searchDepth}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1" style={{ color: 'var(--muted)' }}>
                      Confidence Threshold
                    </div>
                    <div style={{ color: 'var(--text)' }}>
                      {(profile.configuration.confidenceThreshold * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>

              {profile.configuration.documentTypes.length > 0 && (
                <div>
                  <h4
                    className="text-sm font-medium mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Selected Document Types
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.configuration.documentTypes.map((docType) => (
                      <Badge key={docType} tone="accent">
                        {docType}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {profile.usedInRuleMining && (
                <div
                  className="rounded-lg p-4 border"
                  style={{
                    backgroundColor: 'var(--accent-bg)',
                    borderColor: 'rgb(var(--color-accent-primary))',
                  }}
                >
                  <h4
                    className="text-sm font-semibold mb-2 flex items-center gap-2"
                    style={{ color: 'rgb(var(--color-accent-primary))' }}
                  >
                    <BeakerIcon className="w-5 h-5" />
                    Rule Mining Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div
                        style={{ color: 'rgb(var(--color-accent-primary))', opacity: 0.7 }}
                      >
                        Mined At
                      </div>
                      <div style={{ color: 'var(--text)' }}>
                        {formatDateTime(profile.usedInRuleMining.minedAt)}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{ color: 'rgb(var(--color-accent-primary))', opacity: 0.7 }}
                      >
                        Rules Generated
                      </div>
                      <div style={{ color: 'var(--text)' }}>
                        {profile.usedInRuleMining.rulesGenerated}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Confirm remove source */}
      {confirmRemoveId && (
        <Modal
          open={true}
          onClose={() => setConfirmRemoveId(null)}
          title="Remove source?"
          size="sm"
          footer={
            <>
              <button onClick={() => setConfirmRemoveId(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => handleRemoveSource(confirmRemoveId)}
                className="btn-danger"
              >
                Remove
              </button>
            </>
          }
        >
          <p style={{ color: 'var(--text)' }}>
            This source will be removed from the profile. You can still re-add it later.
          </p>
        </Modal>
      )}
    </>
  );
};

interface SourceCardProps {
  source: RegulatorySource;
  canRemove: boolean;
  onRemove: () => void;
}

const SourceCard: React.FC<SourceCardProps> = ({ source, canRemove, onRemove }) => {
  const [hover, setHover] = useState(false);
  const accent = 'rgb(var(--color-accent-primary))';
  return (
    <div
      className="rounded-lg p-4 transition-all border"
      style={{
        backgroundColor: 'var(--surface-2)',
        borderColor: hover ? accent : 'var(--border)',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h4 className="font-medium" style={{ color: 'var(--text)' }}>
              {source.sourceName}
            </h4>
            {source.trustLevel === 'gov-auto' ? (
              <Badge tone="success">Gov Auto</Badge>
            ) : (
              <Badge tone="info">User Added</Badge>
            )}
            <Badge tone="neutral">
              {(source.confidenceScore * 100).toFixed(0)}% confidence
            </Badge>
          </div>
          {source.agencyName && (
            <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>
              {source.agencyName}
            </p>
          )}
          <a
            href={source.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm flex items-center gap-1 break-all"
            style={{ color: accent }}
          >
            <LinkIcon className="w-4 h-4 flex-shrink-0" />
            {source.sourceUrl}
          </a>
        </div>
        {canRemove && (
          <button
            type="button"
            aria-label="Remove source"
            onClick={onRemove}
            className="ml-4 p-2 rounded transition-colors"
            style={{ color: 'var(--error)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--error-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

