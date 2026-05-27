/**
 * Save Regulatory Portfolio Modal
 *
 * Allows users to save their curated discovery results as a named regulatory portfolio
 * for later use in rule mining and validation.
 */

import React, { useState } from 'react';
import {
  CheckCircleIcon,
  FolderIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { DiscoveryProfile, RegulatorySource } from '../types';
import { Modal } from './ui/Modal';
import { Select } from './ui/Select';
import { PROFILE_STATUS_OPTIONS } from '../lib/constants';

interface SaveProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Omit<DiscoveryProfile, 'id' | 'createdAt' | 'updatedAt'>) => void;
  configuration: {
    countries: string[];
    states: string[];
    linesOfBusiness: string;
    documentTypes: string[];
    searchDepth: 'shallow' | 'moderate' | 'deep';
    confidenceThreshold: number;
    maxResults: number;
  };
  sources: RegulatorySource[];
  isEditing?: boolean;
}

export const SaveProfileModal: React.FC<SaveProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  configuration,
  sources,
  isEditing = false,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'draft' | 'finalized'>('draft');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const govAutoSources = sources.filter(s => s.trustLevel === 'gov-auto').length;
  const userAddedSources = sources.filter(s => s.trustLevel === 'user-added').length;
  const avgConfidence = sources.length > 0
    ? sources.reduce((sum, s) => sum + s.confidenceScore, 0) / sources.length
    : 0;

  const handleSave = () => {
    if (!name.trim()) {
      setError('Portfolio name is required');
      return;
    }

    const tagArray = tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const profile: Omit<DiscoveryProfile, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      description: description.trim() || undefined,
      configuration,
      sources,
      metadata: {
        totalSources: sources.length,
        govAutoSources,
        userAddedSources,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
      },
      status,
      tags: tagArray.length > 0 ? tagArray : undefined,
    };

    onSave(profile);

    // Reset form
    setName('');
    setDescription('');
    setTags('');
    setStatus('draft');
    setError('');
    onClose();
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    setTags('');
    setStatus('draft');
    setError('');
    onClose();
  };

  const title = (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: 'var(--accent-bg)' }}
      >
        <FolderIcon
          className="w-6 h-6"
          style={{ color: 'rgb(var(--color-accent-primary))' }}
        />
      </div>
      <div>
        <div className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
          {isEditing ? 'Update Regulatory Portfolio' : 'Save as Regulatory Portfolio'}
        </div>
        <p className="text-sm font-normal mt-0.5" style={{ color: 'var(--muted)' }}>
          {isEditing ? 'Update your portfolio details' : 'Create a named portfolio for later use'}
        </p>
      </div>
    </div>
  );

  const footer = (
    <>
      <button onClick={handleCancel} className="btn-secondary">
        Cancel
      </button>
      <button onClick={handleSave} className="btn-primary inline-flex items-center gap-2">
        <CheckCircleIcon className="w-5 h-5" />
        {isEditing ? 'Update Portfolio' : 'Save Portfolio'}
      </button>
    </>
  );

  return (
    <Modal open={isOpen} onClose={handleCancel} title={title} footer={footer} size="lg">
      <div className="space-y-6">
        {/* Portfolio Name */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            Portfolio Name <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="e.g., Wisconsin Workers' Comp Q1 2024"
            className="input w-full"
          />
          {error && (
            <p className="text-sm mt-1" style={{ color: 'var(--error)' }}>
              {error}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes about this portfolio..."
            rows={3}
            className="input w-full resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            Tags (Optional)
          </label>
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
        </div>

        {/* Status */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            Status
          </label>
          <Select
            options={PROFILE_STATUS_OPTIONS.filter(
              (opt) => opt.value === 'draft' || opt.value === 'finalized',
            )}
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'finalized')}
          />
        </div>

        {/* Summary Stats */}
        <div
          className="rounded-lg p-4 border"
          style={{
            backgroundColor: 'var(--accent-bg)',
            borderColor: 'rgb(var(--color-accent-primary))',
          }}
        >
          <div className="flex items-start gap-2 mb-3">
            <InformationCircleIcon
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              style={{ color: 'rgb(var(--color-accent-primary))' }}
            />
            <div
              className="text-sm font-medium"
              style={{ color: 'rgb(var(--color-accent-primary))' }}
            >
              Portfolio Summary
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div style={{ color: 'var(--muted)' }}>Total Sources</div>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>
                {sources.length}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)' }}>Gov Auto</div>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>
                {govAutoSources}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)' }}>User Added</div>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>
                {userAddedSources}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)' }}>Avg Confidence</div>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>
                {(avgConfidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

