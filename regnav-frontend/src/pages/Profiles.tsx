/**
 * Profiles - Discovery Profile Management
 *
 * Allows users to view, edit, and manage their saved discovery profiles.
 * Profiles can be loaded into RegScout or used for rule mining.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { ProfileDetailsModal } from '../components/ProfileDetailsModal';
import { DuplicateProfileModal } from '../components/DuplicateProfileModal';
import {
  createProfile as apiCreateProfile,
  deleteProfile as apiDeleteProfile,
  listProfiles as apiListProfiles,
  updateProfile as apiUpdateProfile,
} from '../services/profiles';
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
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { PROFILE_STATUS_OPTIONS } from '../lib/constants';
import { formatDate } from '../lib/format';

export const Profiles: React.FC = () => {
  const {
    discoveryProfiles: rawProfiles,
    setDiscoveryProfiles,
    upsertDiscoveryProfile,
    deleteProfile,
    loadProfileForEditing,
  } = useAppStore();
  const navigate = useNavigate();

  // On mount, fetch the persisted profiles from the API. The local store
  // is treated as a cache so RegScout's `loadProfileForEditing` keeps
  // working without changes. If the API is unreachable (dev without
  // backend, etc.) the local store remains as a fallback.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profiles = await apiListProfiles();
        if (!cancelled) setDiscoveryProfiles(profiles);
      } catch {
        /* leave local store untouched — the toast surface elsewhere will
         * tell the user when a write fails. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setDiscoveryProfiles]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'finalized' | 'used_for_rules'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated'>('updated');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<DiscoveryProfile | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsMode, setDetailsMode] = useState<'view' | 'edit'>('view');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastTone, setToastTone] = useState<'success' | 'error'>('success');
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

  const handleDelete = async (profileId: string) => {
    setShowDeleteConfirm(null);
    try {
      await apiDeleteProfile(profileId);
      deleteProfile(profileId);
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Failed to delete profile');
      setToastTone('error');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
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

  const handleSaveProfile = async (profileId: string, updates: Partial<DiscoveryProfile>) => {
    try {
      const saved = await apiUpdateProfile(profileId, {
        name: updates.name,
        description: updates.description ?? null,
        status: updates.status,
        configuration: updates.configuration,
        sources: updates.sources,
        metadata: updates.metadata,
        tags: updates.tags,
      });
      upsertDiscoveryProfile(saved);
      if (selectedProfile && selectedProfile.id === profileId) {
        setSelectedProfile(JSON.parse(JSON.stringify(saved)));
      }
      setToastMessage(`Successfully saved "${saved.name}"`);
      setToastTone('success');
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Failed to save profile');
      setToastTone('error');
    }
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

  const handleConfirmDuplicate = async (newName: string, newDescription?: string) => {
    if (!profileToDuplicate) return;

    try {
      const created = await apiCreateProfile({
        name: newName,
        description: newDescription || profileToDuplicate.description,
        configuration: JSON.parse(JSON.stringify(profileToDuplicate.configuration)),
        sources: JSON.parse(JSON.stringify(profileToDuplicate.sources)),
        metadata: JSON.parse(JSON.stringify(profileToDuplicate.metadata)),
        status: 'draft',
        tags: profileToDuplicate.tags ? JSON.parse(JSON.stringify(profileToDuplicate.tags)) : [],
      });
      upsertDiscoveryProfile(created);
      setToastMessage(`Profile "${created.name}" created successfully!`);
      setToastTone('success');
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Failed to duplicate profile');
      setToastTone('error');
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    setProfileToDuplicate(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Badge tone="info">
            <span className="inline-flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              Draft
            </span>
          </Badge>
        );
      case 'finalized':
        return (
          <Badge tone="success">
            <span className="inline-flex items-center gap-1">
              <CheckCircleIcon className="w-3 h-3" />
              Finalized
            </span>
          </Badge>
        );
      case 'used_for_rules':
        return (
          <Badge tone="accent">
            <span className="inline-flex items-center gap-1">
              <BeakerIcon className="w-3 h-3" />
              Used for Rules
            </span>
          </Badge>
        );
      default:
        return null;
    }
  };

  const activeSortStyle: React.CSSProperties = {
    backgroundColor: 'rgb(var(--color-accent-primary))',
    color: '#fff',
  };

  return (
    <AppLayout title="Regulatory Portfolios">
      <div>
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-2xl sm:text-3xl font-bold flex items-center gap-3"
            style={{ color: 'var(--text)' }}
          >
            <FolderIcon
              className="w-8 h-8"
              style={{ color: 'rgb(var(--color-accent-primary))' }}
            />
            Regulatory Portfolios
          </h1>
          <p className="mt-2" style={{ color: 'var(--muted)' }}>
            Manage your saved discovery configurations and curated regulatory source portfolios
          </p>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <MagnifyingGlassIcon
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                  style={{ color: 'var(--muted)' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search profiles by name, description, or tags..."
                  className="input pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Select
                options={PROFILE_STATUS_OPTIONS}
                allLabel="All statuses"
                value={filterStatus === 'all' ? '' : filterStatus}
                onChange={(e) =>
                  setFilterStatus((e.target.value || 'all') as
                    | 'all'
                    | 'draft'
                    | 'finalized'
                    | 'used_for_rules')
                }
              />
            </div>
          </div>

          {/* Sort */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm" style={{ color: 'var(--muted)' }}>Sort by:</span>
            <button
              onClick={() => setSortBy('updated')}
              className={
                sortBy === 'updated'
                  ? 'px-3 py-1 rounded text-sm transition-colors'
                  : 'btn-secondary px-3 py-1 text-sm'
              }
              style={sortBy === 'updated' ? activeSortStyle : undefined}
            >
              Last Updated
            </button>
            <button
              onClick={() => setSortBy('created')}
              className={
                sortBy === 'created'
                  ? 'px-3 py-1 rounded text-sm transition-colors'
                  : 'btn-secondary px-3 py-1 text-sm'
              }
              style={sortBy === 'created' ? activeSortStyle : undefined}
            >
              Date Created
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={
                sortBy === 'name'
                  ? 'px-3 py-1 rounded text-sm transition-colors'
                  : 'btn-secondary px-3 py-1 text-sm'
              }
              style={sortBy === 'name' ? activeSortStyle : undefined}
            >
              Name
            </button>
          </div>
        </div>

        {/* Profiles Count */}
        <div className="mb-4 text-sm" style={{ color: 'var(--muted)' }}>
          Showing {filteredProfiles.length} of {discoveryProfiles.length} profiles
        </div>

        {/* Profiles Grid */}
        {filteredProfiles.length === 0 ? (
          searchQuery || filterStatus !== 'all' ? (
            <EmptyState
              icon={<FolderIcon className="w-12 h-12" />}
              title="No profiles found"
              description="Try adjusting your filters or search query"
            />
          ) : (
            <EmptyState
              icon={<FolderIcon className="w-12 h-12" />}
              title="No profiles yet"
              description="Save your first discovery result as a profile from RegScout"
              action={
                <Link to="/regscout" className="btn-primary">
                  Go to RegScout
                </Link>
              }
            />
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                className="rounded-lg border p-6 transition-all"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgb(var(--color-accent-primary))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3
                      className="text-lg font-semibold mb-1 line-clamp-2"
                      style={{ color: 'var(--text)' }}
                    >
                      {profile.name}
                    </h3>
                    {getStatusBadge(profile.status)}
                  </div>
                </div>

                {/* Description */}
                {profile.description && (
                  <p
                    className="text-sm mb-4 line-clamp-2"
                    style={{ color: 'var(--muted)' }}
                  >
                    {profile.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div>
                    <div style={{ color: 'var(--muted)' }}>Sources</div>
                    <div className="font-semibold" style={{ color: 'var(--text)' }}>
                      {profile.metadata.totalSources}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>Gov Auto</div>
                    <div className="font-semibold" style={{ color: 'var(--text)' }}>
                      {profile.metadata.govAutoSources}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>Confidence</div>
                    <div className="font-semibold" style={{ color: 'var(--text)' }}>
                      {(profile.metadata.avgConfidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--muted)' }}>LOB</div>
                    <div
                      className="font-semibold truncate"
                      style={{ color: 'var(--text)' }}
                    >
                      {profile.configuration.linesOfBusiness || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {profile.tags && profile.tags.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <TagIcon className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                    {profile.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 text-xs rounded"
                        style={{
                          backgroundColor: 'var(--surface-2)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                    {profile.tags.length > 3 && (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        +{profile.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Date */}
                <div
                  className="flex items-center gap-2 text-xs mb-4"
                  style={{ color: 'var(--muted)' }}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Updated {formatDate(profile.updatedAt)}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleView(profile)}
                    className="btn-primary flex-1 text-sm py-2 px-3 flex items-center justify-center gap-1"
                  >
                    <EyeIcon className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(profile)}
                    className="btn-secondary px-3 py-2"
                    title="Edit"
                  >
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(profile)}
                    className="btn-secondary px-3 py-2"
                    title="Duplicate"
                  >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(profile.id)}
                    className="btn-secondary px-3 py-2"
                    title="Delete"
                    style={{ color: 'var(--error)' }}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          open={showDeleteConfirm !== null}
          onClose={() => setShowDeleteConfirm(null)}
          title="Delete Profile?"
          size="md"
          footer={
            <>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
                className="btn-danger"
              >
                Delete
              </button>
            </>
          }
        >
          <p style={{ color: 'var(--text-secondary)' }}>
            This action cannot be undone. The profile and all its data will be permanently deleted.
          </p>
        </Modal>

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
            <div
              className="border px-6 py-3 rounded-lg shadow-lg flex items-center gap-2"
              style={
                toastTone === 'error'
                  ? {
                      backgroundColor: 'var(--error-bg)',
                      borderColor: 'var(--error)',
                      color: 'var(--error)',
                    }
                  : {
                      backgroundColor: 'var(--accent-bg)',
                      borderColor: 'rgb(var(--color-accent-primary))',
                      color: 'rgb(var(--color-accent-primary))',
                    }
              }
            >
              <CheckCircleIcon className="w-5 h-5" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
