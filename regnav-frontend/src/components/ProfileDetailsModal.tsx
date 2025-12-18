/**
 * Profile Details Modal
 * 
 * Full-featured modal for viewing and editing discovery profiles.
 * Shows all configuration, sources, and metadata with edit capabilities.
 */

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
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
} from '@heroicons/react/24/outline';
import { DiscoveryProfile, RegulatorySource } from '../types';

interface ProfileDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: DiscoveryProfile | null;
  onSave: (profileId: string, updates: Partial<DiscoveryProfile>) => void;
  mode: 'view' | 'edit';
}

export const ProfileDetailsModal: React.FC<ProfileDetailsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
  mode: initialMode,
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'draft' | 'finalized' | 'used_for_rules'>('draft');
  const [sources, setSources] = useState<RegulatorySource[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'sources' | 'metadata'>('overview');
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setDescription(profile.description || '');
      setTags(profile.tags?.join(', ') || '');
      setStatus(profile.status);
      setSources(profile.sources);
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
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const updates: Partial<DiscoveryProfile> = {
      name: name.trim(),
      description: description.trim() || undefined,
      tags: tagArray.length > 0 ? tagArray : undefined,
      status,
      sources,
      metadata: {
        totalSources: sources.length,
        govAutoSources: sources.filter(s => s.trustLevel === 'gov-auto').length,
        userAddedSources: sources.filter(s => s.trustLevel === 'user-added').length,
        avgConfidence: sources.length > 0
          ? sources.reduce((sum, s) => sum + s.confidenceScore, 0) / sources.length
          : 0,
      },
    };

    onSave(profile.id, updates);
    setMode('view');
    setError('');
  };

  const handleCancel = () => {
    // Reset to original values
    setName(profile.name);
    setDescription(profile.description || '');
    setTags(profile.tags?.join(', ') || '');
    setStatus(profile.status);
    setSources(profile.sources);
    setMode('view');
    setError('');
  };

  const handleRemoveSource = (sourceId: string) => {
    setSources(sources.filter(s => s.id !== sourceId));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="px-3 py-1 bg-blue-900/30 border border-blue-500/30 text-blue-300 text-sm rounded-full flex items-center gap-1">
            <ClockIcon className="w-4 h-4" />
            Draft
          </span>
        );
      case 'finalized':
        return (
          <span className="px-3 py-1 bg-green-900/30 border border-green-500/30 text-green-300 text-sm rounded-full flex items-center gap-1">
            <CheckCircleIcon className="w-4 h-4" />
            Finalized
          </span>
        );
      case 'used_for_rules':
        return (
          <span className="px-3 py-1 bg-purple-900/30 border border-purple-500/30 text-purple-300 text-sm rounded-full flex items-center gap-1">
            <BeakerIcon className="w-4 h-4" />
            Used for Rules
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-5xl w-full shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <FolderIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              {mode === 'edit' ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  className="text-xl font-semibold bg-gray-800 border border-gray-700 rounded px-3 py-1 text-white w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              ) : (
                <h2 className="text-xl font-semibold text-white">{name}</h2>
              )}
              {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
            </div>
            {mode === 'view' && getStatusBadge(status)}
          </div>
          <div className="flex items-center gap-2 ml-4">
            {mode === 'view' ? (
              <button
                onClick={() => setMode('edit')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors flex items-center gap-2"
              >
                <PencilSquareIcon className="w-4 h-4" />
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors flex items-center gap-2"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Save Changes
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors ml-2"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-800">
          <div className="flex gap-1 px-6">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`px-4 py-3 font-medium transition-all relative ${
                selectedTab === 'overview'
                  ? 'text-purple-400 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab('sources')}
              className={`px-4 py-3 font-medium transition-all relative ${
                selectedTab === 'sources'
                  ? 'text-purple-400 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Sources ({sources.length})
            </button>
            <button
              onClick={() => setSelectedTab('metadata')}
              className={`px-4 py-3 font-medium transition-all relative ${
                selectedTab === 'metadata'
                  ? 'text-purple-400 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Configuration
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[600px] overflow-y-auto">
          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                {mode === 'edit' ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description for this profile..."
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                ) : (
                  <p className="text-gray-400">
                    {description || 'No description provided'}
                  </p>
                )}
              </div>

              {/* Status */}
              {mode === 'edit' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Status
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setStatus('draft')}
                      className={`p-3 rounded-lg border transition-all text-left ${
                        status === 'draft'
                          ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-medium">Draft</div>
                      <div className="text-xs mt-1 opacity-75">Work in progress</div>
                    </button>
                    <button
                      onClick={() => setStatus('finalized')}
                      className={`p-3 rounded-lg border transition-all text-left ${
                        status === 'finalized'
                          ? 'bg-green-500/20 border-green-500 text-green-300'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-medium">Finalized</div>
                      <div className="text-xs mt-1 opacity-75">Ready for rules</div>
                    </button>
                    <button
                      onClick={() => setStatus('used_for_rules')}
                      className={`p-3 rounded-lg border transition-all text-left ${
                        status === 'used_for_rules'
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-medium">Used for Rules</div>
                      <div className="text-xs mt-1 opacity-75">Already mined</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tags
                </label>
                {mode === 'edit' ? (
                  <>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g., workers-comp, 2024, priority"
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
                  </>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {profile.tags && profile.tags.length > 0 ? (
                      profile.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-800 text-gray-300 text-sm rounded-full flex items-center gap-1"
                        >
                          <TagIcon className="w-3 h-3" />
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">No tags</span>
                    )}
                  </div>
                )}
              </div>

              {/* Statistics */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Statistics
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="text-gray-400 text-sm mb-1">Total Sources</div>
                    <div className="text-2xl font-semibold text-white">
                      {sources.length}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="text-gray-400 text-sm mb-1">Gov Auto</div>
                    <div className="text-2xl font-semibold text-green-400">
                      {sources.filter(s => s.trustLevel === 'gov-auto').length}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="text-gray-400 text-sm mb-1">User Added</div>
                    <div className="text-2xl font-semibold text-blue-400">
                      {sources.filter(s => s.trustLevel === 'user-added').length}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="text-gray-400 text-sm mb-1">Avg Confidence</div>
                    <div className="text-2xl font-semibold text-purple-400">
                      {sources.length > 0
                        ? ((sources.reduce((sum, s) => sum + s.confidenceScore, 0) / sources.length) * 100).toFixed(0)
                        : 0}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 mb-1 flex items-center gap-1">
                    <CalendarIcon className="w-4 h-4" />
                    Created
                  </div>
                  <div className="text-white">
                    {new Date(profile.createdAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1 flex items-center gap-1">
                    <ArrowPathIcon className="w-4 h-4" />
                    Last Updated
                  </div>
                  <div className="text-white">
                    {new Date(profile.updatedAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sources Tab */}
          {selectedTab === 'sources' && (
            <div className="space-y-4">
              {sources.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No sources in this profile
                </div>
              ) : (
                <div className="space-y-3">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-purple-500 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-white">{source.sourceName}</h4>
                            {source.trustLevel === 'gov-auto' ? (
                              <span className="px-2 py-0.5 bg-green-900/30 border border-green-500/30 text-green-300 text-xs rounded">
                                Gov Auto
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-blue-900/30 border border-blue-500/30 text-blue-300 text-xs rounded">
                                User Added
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                              {(source.confidenceScore * 100).toFixed(0)}% confidence
                            </span>
                          </div>
                          {source.agencyName && (
                            <p className="text-sm text-gray-400 mb-1">{source.agencyName}</p>
                          )}
                          <a
                            href={source.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                          >
                            <LinkIcon className="w-4 h-4" />
                            {source.sourceUrl}
                          </a>
                        </div>
                        {mode === 'edit' && (
                          <button
                            onClick={() => handleRemoveSource(source.id)}
                            className="ml-4 p-2 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Configuration Tab */}
          {selectedTab === 'metadata' && (
            <div className="space-y-6">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                  <ChartBarIcon className="w-5 h-5 text-purple-400" />
                  Discovery Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500 mb-1">Countries</div>
                    <div className="text-white">{profile.configuration.countries.join(', ')}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">States</div>
                    <div className="text-white">{profile.configuration.states.join(', ') || 'None'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Line of Business</div>
                    <div className="text-white">{profile.configuration.linesOfBusiness || 'None'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Document Types</div>
                    <div className="text-white">{profile.configuration.documentTypes.length} selected</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Search Depth</div>
                    <div className="text-white capitalize">{profile.configuration.searchDepth}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 mb-1">Confidence Threshold</div>
                    <div className="text-white">{(profile.configuration.confidenceThreshold * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>

              {profile.configuration.documentTypes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Selected Document Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.configuration.documentTypes.map((docType) => (
                      <span
                        key={docType}
                        className="px-3 py-1 bg-purple-900/30 border border-purple-500/30 text-purple-300 text-sm rounded-full"
                      >
                        {docType}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.usedInRuleMining && (
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
                    <BeakerIcon className="w-5 h-5" />
                    Rule Mining Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-purple-400/70">Mined At</div>
                      <div className="text-purple-200">
                        {new Date(profile.usedInRuleMining.minedAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-purple-400/70">Rules Generated</div>
                      <div className="text-purple-200">{profile.usedInRuleMining.rulesGenerated}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

