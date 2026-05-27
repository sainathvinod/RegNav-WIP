import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import {
  createOrganization,
  deleteOrganization,
  listOrganizations,
  updateOrganization,
  type Organization,
} from '../services/organizations';

const Organizations: React.FC = () => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal
  const [editOrg, setEditOrg] = useState<Organization | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listOrganizations()
      .then(setOrgs)
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const org = await createOrganization({ name: newName, slug: newSlug });
      setOrgs(prev => [org, ...prev]);
      setShowCreate(false);
      setNewName('');
      setNewSlug('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editOrg) return;
    setSaving(true);
    try {
      const updated = await updateOrganization(editOrg.id, {
        name: editName || undefined,
        status: editStatus || undefined,
      });
      setOrgs(prev => prev.map(o => (o.id === updated.id ? updated : o)));
      setEditOrg(null);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this organization? This cannot be undone.')) return;
    try {
      await deleteOrganization(id);
      setOrgs(prev => prev.filter(o => o.id !== id));
    } catch {
      /* ignore */
    }
  };

  return (
    <AppLayout title="Organizations">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-100">Tenant Organizations</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Platform-admin view — manage all tenants in the system.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + New Organization
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card mb-6 border-purple-700">
          <h3 className="text-base font-semibold text-gray-100 mb-4">Create Organization</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => {
                  setNewName(e.target.value);
                  setNewSlug(slugify(e.target.value));
                }}
                placeholder="Acme Insurance Corp"
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Slug (URL-safe ID)</label>
              <input
                type="text"
                value={newSlug}
                onChange={e => setNewSlug(e.target.value)}
                placeholder="acme-insurance"
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
          {createError && (
            <p className="mb-3 text-sm text-red-400">{createError}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim() || !newSlug.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setCreateError(null); }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error}
          <p className="text-xs mt-1 text-red-400/70">Start the backend to manage organizations.</p>
        </div>
      )}

      {/* Organizations table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🏢</div>
            <p className="text-gray-400">No organizations yet.</p>
            <p className="text-sm text-gray-500 mt-1">
              Create the first tenant organization above.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="pb-3 text-gray-400 font-medium">Organization</th>
                <th className="pb-3 text-gray-400 font-medium">Slug</th>
                <th className="pb-3 text-gray-400 font-medium">Status</th>
                <th className="pb-3 text-gray-400 font-medium">Users</th>
                <th className="pb-3 text-gray-400 font-medium">Created</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {orgs.map(org => (
                <tr key={org.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 text-gray-100 font-medium">{org.name}</td>
                  <td className="py-3">
                    <code className="text-xs text-purple-400 bg-gray-800 px-1.5 py-0.5 rounded">
                      {org.slug}
                    </code>
                  </td>
                  <td className="py-3">
                    <StatusBadge status={org.status} />
                  </td>
                  <td className="py-3 text-gray-400">{org.userCount}</td>
                  <td className="py-3 text-gray-500 text-xs">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => {
                        setEditOrg(org);
                        setEditName(org.name);
                        setEditStatus(org.status);
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300 mr-3 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(org.id)}
                      className="text-xs text-red-500 hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit modal */}
      {editOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Edit Organization</h3>
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setEditOrg(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    active: 'bg-green-900 text-green-300 border-green-700',
    suspended: 'bg-red-900 text-red-300 border-red-700',
    pending: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${colors[status] ?? 'bg-gray-700 text-gray-300 border-gray-600'}`}>
      {status}
    </span>
  );
};

export { Organizations };
