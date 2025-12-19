/**
 * Profiles - Discovery Profile Management
 * 
 * Allows users to view, edit, and manage their saved discovery profiles.
 * Profiles can be loaded into RegScout or used for rule mining.
 */

import React, { useState, useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { ProfileDetailsModal } from '../components/ProfileDetailsModal';
import { DuplicateProfileModal } from '../components/DuplicateProfileModal';
import { useAppStore } from '../store/appStore';
import {
  FolderIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  TagIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  BeakerIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { DiscoveryProfile } from '../types';
import { useNavigate } from 'react-router-dom';

export const Profiles: React.FC = () => {
  const { discoveryProfiles: rawProfiles, deleteProfile, updateProfile, createProfile, loadProfileForEditing } = useAppStore();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'finalized' | 'used_for_rules'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated'>('updated');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<DiscoveryProfile | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsMode, setDetailsMode] = useState<'view' | 'edit'>('view');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [profileToDuplicate, setProfileToDuplicate] = useState<DiscoveryProfile | null>(null);

  // CRITICAL: Deep clone all profiles from store to prevent reference sharing
  const discoveryProfiles = useMemo(
    () => JSON.parse(JSON.stringify(rawProfiles)) as DiscoveryProfile[],
    [rawProfiles]
  );

  // Filter and sort profiles
  const filteredProfiles = discoveryProfiles
    .filter(profile => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = profile.name.toLowerCase().includes(query);
        const matchesDescription = profile.description?.toLowerCase().includes(query);
        const matchesTags = profile.tags?.some(tag => tag.toLowerCase().includes(query));
        if (!matchesName && !matchesDescription && !matchesTags) return false;
      }
      
      // Status filter
      if (filterStatus !== 'all' && profile.status !== filterStatus) return false;
      
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  const handleDelete = (profileId: string) => {
    deleteProfile(profileId);
    setShowDeleteConfirm(null);
  };

  const handleView = (profile: DiscoveryProfile) => {
    // Deep clone to prevent external mutations
    setSelectedProfile(JSON.parse(JSON.stringify(profile)));
    setDetailsMode('view');
    setShowDetailsModal(true);
  };

  const handleEdit = (profile: DiscoveryProfile) => {
    // Load profile for editing and navigate to RegScout
    loadProfileForEditing(profile.id);
    navigate('/regscout');
  };

  const handleSaveProfile = (profileId: string, updates: Partial<DiscoveryProfile>) => {
    updateProfile(profileId, updates);
    // Update selectedProfile with deep cloning to prevent reference sharing
    if (selectedProfile && selectedProfile.id === profileId) {
      const updatedProfile = JSON.parse(JSON.stringify({ ...selectedProfile, ...updates }));
      setSelectedProfile(updatedProfile);
    }
    
    // Show success toast with profile name
    const profileName = updates.name || selectedProfile?.name || 'Profile';
    setToastMessage(`Successfully saved "${profileName}"`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedProfile(null);
  };

  const handleDuplicate = (profile: DiscoveryProfile) => {
    // Open duplicate modal for user to name the copy
    setProfileToDuplicate(profile);
    setShowDuplicateModal(true);
  };

  const handleConfirmDuplicate = (newName: string, newDescription?: string) => {
    if (!profileToDuplicate) return;

    // Deep copy to ensure complete isolation from original
    // Insert copy BEFORE original (copy on left, original on right)
    const copiedProfile = createProfile({
      name: newName,
      description: newDescription || profileToDuplicate.description,
      // Deep copy configuration
      configuration: JSON.parse(JSON.stringify(profileToDuplicate.configuration)),
      // Deep copy sources
      sources: JSON.parse(JSON.stringify(profileToDuplicate.sources)),
      // Deep copy metadata
      metadata: JSON.parse(JSON.stringify(profileToDuplicate.metadata)),
      status: 'draft', // Reset status to draft for new copy
      tags: profileToDuplicate.tags ? JSON.parse(JSON.stringify(profileToDuplicate.tags)) : [],
    }, profileToDuplicate.id); // Insert before original

    // Show toast notification
    setToastMessage(`Profile "${copiedProfile.name}" created successfully!`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);

    // Reset duplicate modal state
    setProfileToDuplicate(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="px-2 py-1 bg-blue-900/30 border border-blue-500/30 text-blue-300 text-xs rounded-full flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            Draft
          </span>
        );
      case 'finalized':
        return (
          <span className="px-2 py-1 bg-green-900/30 border border-green-500/30 text-green-300 text-xs rounded-full flex items-center gap-1">
            <CheckCircleIcon className="w-3 h-3" />
            Finalized
          </span>
        );
      case 'used_for_rules':
        return (
          <span className="px-2 py-1 bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs rounded-full flex items-center gap-1">
            <BeakerIcon className="w-3 h-3" />
            Used for Rules
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <AppLayout title="Regulatory Portfolios">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FolderIcon className="w-8 h-8 text-purple-500" />
            Regulatory Portfolios
          </h1>
          <p className="mt-2" style={{ color: 'var(--muted)' }}>
            Manage your saved discovery configurations and curated regulatory source portfolios
          </p>
        </div>

        {/* Filters */}
        <div className="rounded-lg border p-6 mb-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search profiles by name, description, or tags..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg transition-all"
                  style={{ 
                    backgroundColor: 'var(--surface-2)', 
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--border)', 
                    color: 'var(--text)' 
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgb(var(--color-accent-primary))';
                    e.currentTarget.style.boxShadow = `0 0 0 3px rgba(var(--color-accent-primary), 0.1)`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-4 py-2 rounded-lg transition-all"
                style={{ 
                  backgroundColor: 'var(--surface-2)', 
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--border)', 
                  color: 'var(--text)' 
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgb(var(--color-accent-primary))';
                  e.currentTarget.style.boxShadow = `0 0 0 3px rgba(var(--color-accent-primary), 0.1)`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="finalized">Finalized</option>
                <option value="used_for_rules">Used for Rules</option>
              </select>
            </div>
          </div>

          {/* Sort */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--muted)' }}>Sort by:</span>
            <button
              onClick={() => setSortBy('updated')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                sortBy === 'updated'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Last Updated
            </button>
            <button
              onClick={() => setSortBy('created')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                sortBy === 'created'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Date Created
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                sortBy === 'name'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Name
            </button>
          </div>
        </div>

        {/* Profiles Count */}
        <div className="mb-4 text-sm text-gray-400">
          Showing {filteredProfiles.length} of {discoveryProfiles.length} profiles
        </div>

        {/* Profiles Grid */}
        {filteredProfiles.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
            <FolderIcon className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-400 mb-2">
              {searchQuery || filterStatus !== 'all' ? 'No profiles found' : 'No profiles yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || filterStatus !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Save your first discovery result as a profile from RegScout'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <button
                onClick={() => navigate('/regscout')}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
              >
                Go to RegScout
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-purple-500 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2">
                      {profile.name}
                    </h3>
                    {getStatusBadge(profile.status)}
                  </div>
                </div>

                {/* Description */}
                {profile.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {profile.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div>
                    <div className="text-gray-500">Sources</div>
                    <div className="text-white font-semibold">{profile.metadata.totalSources}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Gov Auto</div>
                    <div className="text-white font-semibold">{profile.metadata.govAutoSources}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Confidence</div>
                    <div className="text-white font-semibold">{(profile.metadata.avgConfidence * 100).toFixed(0)}%</div>
                  </div>
                  <div>
                    <div className="text-gray-500">LOB</div>
                    <div className="text-white font-semibold truncate">{profile.configuration.linesOfBusiness || 'N/A'}</div>
                  </div>
                </div>

                {/* Tags */}
                {profile.tags && profile.tags.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <TagIcon className="w-4 h-4 text-gray-500" />
                    {profile.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {profile.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{profile.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Date */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                  <CalendarIcon className="w-4 h-4" />
                  Updated {new Date(profile.updatedAt).toLocaleDateString()}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(profile)}
                    className="flex-1 px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-500 transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <EyeIcon className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(profile)}
                    className="px-3 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
                    title="Edit"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(profile)}
                    className="px-3 py-2 bg-gray-800 text-blue-400 rounded hover:bg-blue-900/30 transition-colors"
                    title="Duplicate"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(profile.id)}
                    className="px-3 py-2 bg-gray-800 text-red-400 rounded hover:bg-red-900/30 transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-lg border border-gray-700 max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Delete Profile?</h3>
              <p className="text-gray-400 mb-6">
                This action cannot be undone. The profile and all its data will be permanently deleted.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Details Modal */}
        <ProfileDetailsModal
          isOpen={showDetailsModal}
          onClose={handleCloseDetails}
          profile={selectedProfile}
          onSave={handleSaveProfile}
          onDuplicate={handleDuplicate}
          mode={detailsMode}
        />

        {/* Duplicate Profile Modal */}
        <DuplicateProfileModal
          isOpen={showDuplicateModal}
          onClose={() => {
            setShowDuplicateModal(false);
            setProfileToDuplicate(null);
          }}
          sourceProfile={profileToDuplicate}
          onDuplicate={handleConfirmDuplicate}
        />

        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
            <div className="bg-purple-900/30 backdrop-blur-sm border border-purple-500/50 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-purple-400" />
              <span className="text-gray-100">{toastMessage}</span>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

