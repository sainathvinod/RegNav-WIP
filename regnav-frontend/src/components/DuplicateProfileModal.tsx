/**
 * Duplicate Profile Modal
 *
 * Allows users to duplicate a profile with a custom name,
 * similar to "Copy of [Name]" in Google Docs.
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { DiscoveryProfile } from '../types';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';

interface DuplicateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceProfile: DiscoveryProfile | null;
  onDuplicate: (name: string, description?: string) => void;
}

export const DuplicateProfileModal: React.FC<DuplicateProfileModalProps> = ({
  isOpen,
  onClose,
  sourceProfile,
  onDuplicate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (sourceProfile) {
      // Default name: "Copy of [Original Name]"
      setName(`Copy of ${sourceProfile.name}`);
      // Copy description from original
      setDescription(sourceProfile.description || '');
      setError('');
    }
  }, [sourceProfile, isOpen]);

  if (!isOpen || !sourceProfile) return null;

  const handleDuplicate = () => {
    if (!name.trim()) {
      setError('Profile name is required');
      return;
    }

    onDuplicate(name.trim(), description.trim() || undefined);

    // Reset and close
    setName('');
    setDescription('');
    setError('');
    onClose();
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    setError('');
    onClose();
  };

  const title = (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: 'var(--info-bg)' }}
      >
        <DocumentDuplicateIcon className="w-6 h-6" style={{ color: 'var(--info)' }} />
      </div>
      <div>
        <div className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
          Duplicate Profile
        </div>
        <p className="text-sm font-normal mt-0.5" style={{ color: 'var(--muted)' }}>
          Create a copy of "{sourceProfile.name}"
        </p>
      </div>
    </div>
  );

  const footer = (
    <>
      <button onClick={handleCancel} className="btn-secondary">
        Cancel
      </button>
      <button onClick={handleDuplicate} className="btn-primary inline-flex items-center gap-2">
        <CheckCircleIcon className="w-5 h-5" />
        Create Copy
      </button>
    </>
  );

  return (
    <Modal open={isOpen} onClose={handleCancel} title={title} footer={footer} size="lg">
      <div className="space-y-6">
        {/* Info Banner */}
        <div
          className="rounded-lg p-4 flex items-start gap-3 border"
          style={{ backgroundColor: 'var(--info-bg)', borderColor: 'var(--info)' }}
        >
          <InformationCircleIcon
            className="w-5 h-5 flex-shrink-0 mt-0.5"
            style={{ color: 'var(--info)' }}
          />
          <div className="text-sm" style={{ color: 'var(--text)' }}>
            <strong style={{ color: 'var(--info)' }}>Creating a new profile:</strong> This will
            create an independent copy with all sources and settings. Changes to the copy won't
            affect the original profile.
          </div>
        </div>

        {/* New Profile Name */}
        <div>
          <label
            className="block text-sm font-medium mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            New Profile Name <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder="Copy of [Profile Name]"
            className="input w-full"
            autoFocus
          />
          {error && (
            <p className="text-sm mt-1" style={{ color: 'var(--error)' }}>
              {error}
            </p>
          )}
        </div>

        {/* Description (Optional) */}
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
            placeholder="Add notes about this copy..."
            rows={3}
            className="input w-full resize-none"
          />
        </div>

        {/* Source profile tags */}
        {sourceProfile.tags && sourceProfile.tags.length > 0 && (
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Source Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {sourceProfile.tags.map((tag, idx) => (
                <Badge key={idx} tone="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Original Profile Info */}
        <div
          className="rounded-lg p-4 border"
          style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}
        >
          <h3
            className="text-sm font-semibold mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            What will be copied:
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div style={{ color: 'var(--muted)' }}>Sources</div>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>
                {sourceProfile.metadata.totalSources}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)' }}>Configuration</div>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>
                All settings
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)' }}>Tags</div>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>
                {sourceProfile.tags
                  ? `${sourceProfile.tags.length} tag${sourceProfile.tags.length !== 1 ? 's' : ''}`
                  : 'None'}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--muted)' }}>Status</div>
              <div className="font-semibold" style={{ color: 'var(--text)' }}>
                Reset to Draft
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

