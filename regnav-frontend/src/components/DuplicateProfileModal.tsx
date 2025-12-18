/**
 * Duplicate Profile Modal
 * 
 * Allows users to duplicate a profile with a custom name,
 * similar to "Copy of [Name]" in Google Docs.
 */

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { DiscoveryProfile } from '../types';

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

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <DocumentDuplicateIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Duplicate Profile</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Create a copy of "{sourceProfile.name}"
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300">
              <strong className="text-blue-400">Creating a new profile:</strong> This will create an independent copy with all sources and settings. 
              Changes to the copy won't affect the original profile.
            </div>
          </div>

          {/* New Profile Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Profile Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Copy of [Profile Name]"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
          </div>

          {/* Description (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this copy..."
              rows={3}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Original Profile Info */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              What will be copied:
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Sources</div>
                <div className="text-white font-semibold">{sourceProfile.metadata.totalSources}</div>
              </div>
              <div>
                <div className="text-gray-400">Configuration</div>
                <div className="text-white font-semibold">All settings</div>
              </div>
              <div>
                <div className="text-gray-400">Tags</div>
                <div className="text-white font-semibold">
                  {sourceProfile.tags ? `${sourceProfile.tags.length} tag${sourceProfile.tags.length !== 1 ? 's' : ''}` : 'None'}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Status</div>
                <div className="text-white font-semibold">Reset to Draft</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDuplicate}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2 font-semibold"
          >
            <CheckCircleIcon className="w-5 h-5" />
            Create Copy
          </button>
        </div>
      </div>
    </div>
  );
};

