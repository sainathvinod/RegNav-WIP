import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Badge, type BadgeTone } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { humanLabel } from '../lib/format';
import {
  createOrganization,
  deleteOrganization,
  listOrganizations,
  updateOrganization,
  type Organization,
} from '../services/organizations';

/** Map a tenant status onto a Badge tone. */
function statusTone(status: string): BadgeTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending':
      return 'warning';
    case 'suspended':
      return 'danger';
    default:
      return 'neutral';
  }
}

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

  // Delete confirm modal
  const [deleteOrg, setDeleteOrg] = useState<Organization | null>(null);

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
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Tenant Organizations
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Platform-admin view — manage all tenants in the system.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary text-sm"
        >
          + New Organization
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div
          className="card mb-6"
          style={{ borderColor: 'rgb(var(--color-accent-primary))' }}
        >
          <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text)' }}>
            Create Organization
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="form-label">Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => {
                  setNewName(e.target.value);
                  setNewSlug(slugify(e.target.value));
                }}
                placeholder="Acme Insurance Corp"
                className="input text-sm"
              />
            </div>
            <div>
              <label className="form-label">Slug (URL-safe ID)</label>
              <input
                type="text"
                value={newSlug}
                onChange={e => setNewSlug(e.target.value)}
                placeholder="acme-insurance"
                className="input text-sm font-mono"
              />
            </div>
          </div>
          {createError && (
            <p className="mb-3 text-sm" style={{ color: 'var(--error)' }}>
              {createError}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim() || !newSlug.trim()}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setCreateError(null); }}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          className="mb-4 p-3 rounded-lg border text-sm"
          style={{
            backgroundColor: 'var(--error-bg)',
            borderColor: 'var(--error)',
            color: 'var(--error)',
          }}
        >
          {error}
          <p className="text-xs mt-1" style={{ color: 'var(--error)', opacity: 0.7 }}>
            Start the backend to manage organizations.
          </p>
        </div>
      )}

      {/* Organizations table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
            Loading…
          </div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🏢</div>
            <p style={{ color: 'var(--muted)' }}>No organizations yet.</p>
            <p className="text-sm mt-1" style={{ color: 'var(--disabled)' }}>
              Create the first tenant organization above.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b text-left"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>Organization</th>
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>Slug</th>
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>Status</th>
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>Users</th>
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>Created</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {orgs.map(org => (
                  <tr
                    key={org.id}
                    className="border-b transition-colors"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <td className="py-3 font-medium" style={{ color: 'var(--text)' }}>
                      {org.name}
                    </td>
                    <td className="py-3">
                      <code
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          color: 'rgb(var(--color-accent-primary))',
                          backgroundColor: 'var(--surface-2)',
                        }}
                      >
                        {org.slug}
                      </code>
                    </td>
                    <td className="py-3">
                      <Badge tone={statusTone(org.status)}>{humanLabel(org.status)}</Badge>
                    </td>
                    <td className="py-3" style={{ color: 'var(--muted)' }}>{org.userCount}</td>
                    <td className="py-3 text-xs" style={{ color: 'var(--muted)' }}>
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => {
                          setEditOrg(org);
                          setEditName(org.name);
                          setEditStatus(org.status);
                        }}
                        className="text-xs mr-3 transition-colors"
                        style={{ color: 'rgb(var(--color-accent-primary))' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteOrg(org)}
                        className="text-xs transition-colors"
                        style={{ color: 'var(--error)' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      <Modal
        open={editOrg !== null}
        onClose={() => setEditOrg(null)}
        size="md"
        title="Edit Organization"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditOrg(null)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={saving}
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="form-label">Name</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select
              value={editStatus}
              onChange={e => setEditStatus(e.target.value)}
              className="select text-sm"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={deleteOrg !== null}
        onClose={() => setDeleteOrg(null)}
        size="sm"
        title="Delete organization?"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteOrg(null)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (deleteOrg) {
                  const id = deleteOrg.id;
                  setDeleteOrg(null);
                  void handleDelete(id);
                }
              }}
              className="btn-danger text-sm"
            >
              Delete
            </button>
          </>
        }
      >
        {deleteOrg && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Delete <span style={{ color: 'var(--text)' }}>{deleteOrg.name}</span>? This
            cannot be undone.
          </p>
        )}
      </Modal>
    </AppLayout>
  );
};

export { Organizations };
