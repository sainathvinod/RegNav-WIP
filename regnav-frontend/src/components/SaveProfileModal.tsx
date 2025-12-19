/**
 * Save Regulatory Portfolio Modal
 * 
 * Allows users to save their curated discovery results as a named regulatory portfolio
 * for later use in rule mining and validation.
 */

import React, { useState } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  FolderIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { DiscoveryProfile, RegulatorySource } from '../types';

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

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <FolderIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {isEditing ? 'Update Regulatory Portfolio' : 'Save as Regulatory Portfolio'}
              </h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {isEditing ? 'Update your portfolio details' : 'Create a named portfolio for later use'}
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
          {/* Portfolio Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Portfolio Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g., Wisconsin Workers' Comp Q1 2024"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this portfolio..."
              rows={3}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tags (Optional)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., workers-comp, 2024, priority"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setStatus('draft')}
                className={`
                  p-3 rounded-lg border transition-all text-left
                  ${status === 'draft'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                  }
                `}
              >
                <div className="font-medium">Draft</div>
                <div className="text-xs mt-1 opacity-75">
                  Work in progress, can edit anytime
                </div>
              </button>
              <button
                onClick={() => setStatus('finalized')}
                className={`
                  p-3 rounded-lg border transition-all text-left
                  ${status === 'finalized'
                    ? 'bg-green-500/20 border-green-500 text-green-300'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                  }
                `}
              >
                <div className="font-medium">Finalized</div>
                <div className="text-xs mt-1 opacity-75">
                  Ready for rule mining
                </div>
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-3">
              <InformationCircleIcon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-200 font-medium">
                Portfolio Summary
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Total Sources</div>
                <div className="text-white font-semibold">{sources.length}</div>
              </div>
              <div>
                <div className="text-gray-400">Gov Auto</div>
                <div className="text-white font-semibold">{govAutoSources}</div>
              </div>
              <div>
                <div className="text-gray-400">User Added</div>
                <div className="text-white font-semibold">{userAddedSources}</div>
              </div>
              <div>
                <div className="text-gray-400">Avg Confidence</div>
                <div className="text-white font-semibold">{(avgConfidence * 100).toFixed(0)}%</div>
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
            onClick={handleSave}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors flex items-center gap-2 font-semibold"
          >
            <CheckCircleIcon className="w-5 h-5" />
            {isEditing ? 'Update Portfolio' : 'Save Portfolio'}
          </button>
        </div>
      </div>
    </div>
  );
};

