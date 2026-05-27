import React, { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import {
  assignRole,
  inviteUser,
  listAvailableRoles,
  listUsers,
  removeUser,
  revokeRole,
  updateUser,
  type User,
} from '../services/users';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-900 text-green-300 border-green-700',
  invited: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  suspended: 'bg-red-900 text-red-300 border-red-700',
  removed: 'bg-gray-700 text-gray-400 border-gray-600',
};

const ROLE_COLORS: Record<string, string> = {
  platform_admin: 'bg-purple-900 text-purple-300',
  tenant_owner: 'bg-blue-900 text-blue-300',
  compliance_admin: 'bg-teal-900 text-teal-300',
  compliance_lead: 'bg-cyan-900 text-cyan-300',
  analyst: 'bg-indigo-900 text-indigo-300',
  viewer: 'bg-gray-700 text-gray-300',
};

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRoles, setInviteRoles] = useState<string[]>(['analyst']);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Per-row role-add state
  const [addingRoleFor, setAddingRoleFor] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([listUsers(), listAvailableRoles()])
      .then(([u, r]) => {
        setUsers(u);
        setAvailableRoles(r);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const handleInvite = async () => {
    setInviting(true);
    setInviteError(null);
    try {
      const u = await inviteUser({
        email: inviteEmail,
        displayName: inviteName,
        roles: inviteRoles,
      });
      setUsers(prev => [...prev, u]);
      setShowInvite(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRoles(['analyst']);
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setInviting(false);
    }
  };

  const handleStatusToggle = async (u: User) => {
    const newStatus = u.status === 'active' ? 'suspended' : 'active';
    try {
      const updated = await updateUser(u.id, { status: newStatus });
      setUsers(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    } catch {
      /* ignore */
    }
  };

  const handleRemove = async (u: User) => {
    if (!confirm(`Remove ${u.email}? They will lose access immediately.`)) return;
    try {
      await removeUser(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Remove failed');
    }
  };

  const handleAddRole = async (userId: string, role: string) => {
    try {
      const updated = await assignRole(userId, role);
      setUsers(prev => prev.map(x => (x.id === updated.id ? updated : x)));
      setAddingRoleFor(null);
    } catch {
      /* ignore */
    }
  };

  const handleRevokeRole = async (userId: string, role: string) => {
    try {
      const updated = await revokeRole(userId, role);
      setUsers(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    } catch {
      /* ignore */
    }
  };

  return (
    <AppLayout title="Users">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-100">Tenant Users</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Invite team members and manage their roles. Audit-logged for SOC 2.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Invite User
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="card mb-6 border-purple-700">
          <h3 className="text-base font-semibold text-gray-100 mb-4">Invite User</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Display Name</label>
              <input
                type="text"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs text-gray-400 mb-1">Roles</label>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map(r => {
                const checked = inviteRoles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() =>
                      setInviteRoles(prev =>
                        checked ? prev.filter(x => x !== r) : [...prev, r],
                      )
                    }
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      checked
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
          {inviteError && (
            <p className="mb-3 text-sm text-red-400">{inviteError}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleInvite}
              disabled={
                inviting ||
                !inviteEmail.trim() ||
                !inviteName.trim() ||
                inviteRoles.length === 0
              }
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium"
            >
              {inviting ? 'Inviting…' : 'Send Invite'}
            </button>
            <button
              onClick={() => { setShowInvite(false); setInviteError(null); }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
          {error}
          <p className="text-xs mt-1 text-red-400/70">Start the backend to manage users.</p>
        </div>
      )}

      {/* Users table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-gray-400">No users yet.</p>
            <p className="text-sm text-gray-500 mt-1">Invite your first team member above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left">
                <th className="pb-3 text-gray-400 font-medium">User</th>
                <th className="pb-3 text-gray-400 font-medium">Status</th>
                <th className="pb-3 text-gray-400 font-medium">Roles</th>
                <th className="pb-3 text-gray-400 font-medium">Joined</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-800/30 transition-colors align-top">
                  <td className="py-3">
                    <p className="text-gray-100 font-medium">{u.displayName}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${STATUS_COLORS[u.status] ?? STATUS_COLORS.invited}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1 items-center">
                      {u.roles.map(r => (
                        <span
                          key={r}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${ROLE_COLORS[r] ?? 'bg-gray-700 text-gray-300'}`}
                        >
                          {r}
                          <button
                            onClick={() => handleRevokeRole(u.id, r)}
                            className="text-current opacity-60 hover:opacity-100"
                            title="Revoke role"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {addingRoleFor === u.id ? (
                        <select
                          autoFocus
                          onChange={e => e.target.value && handleAddRole(u.id, e.target.value)}
                          onBlur={() => setAddingRoleFor(null)}
                          className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-200 text-xs"
                          defaultValue=""
                        >
                          <option value="" disabled>Add role…</option>
                          {availableRoles
                            .filter(r => !u.roles.includes(r))
                            .map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setAddingRoleFor(u.id)}
                          className="text-xs text-purple-400 hover:text-purple-300 px-1.5"
                        >
                          + add
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleStatusToggle(u)}
                      className="text-xs text-purple-400 hover:text-purple-300 mr-3"
                    >
                      {u.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleRemove(u)}
                      className="text-xs text-red-500 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
};

export { Users };
