import React, { useCallback, useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Badge, type BadgeTone } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { ROLE_OPTIONS } from '../lib/constants';
import { humanLabel } from '../lib/format';
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

/** Map a user status onto a Badge tone. */
function statusTone(status: string): BadgeTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'invited':
      return 'warning';
    case 'suspended':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** Map a role onto a Badge tone for visual differentiation. */
function roleTone(role: string): BadgeTone {
  switch (role) {
    case 'platform_admin':
      return 'accent';
    case 'tenant_owner':
    case 'tenant_admin':
      return 'info';
    case 'compliance_admin':
    case 'compliance_lead':
    case 'compliance_officer':
      return 'success';
    case 'analyst':
      return 'info';
    case 'auditor':
      return 'warning';
    case 'viewer':
    default:
      return 'neutral';
  }
}

type ConfirmKind = 'suspend' | 'remove';

interface ConfirmState {
  kind: ConfirmKind;
  user: User;
}

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

  // Destructive-action confirmation modal
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

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

  const runConfirm = async () => {
    if (!confirm) return;
    const target = confirm.user;
    const kind = confirm.kind;
    setConfirm(null);
    if (kind === 'suspend') {
      await handleStatusToggle(target);
    } else if (kind === 'remove') {
      await handleRemove(target);
    }
  };

  return (
    <AppLayout title="Users">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Tenant Users
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Invite team members and manage their roles. Audit-logged for SOC 2.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="btn-primary text-sm"
        >
          + Invite User
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div
          className="card mb-6"
          style={{ borderColor: 'rgb(var(--color-accent-primary))' }}
        >
          <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--text)' }}>
            Invite User
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                className="input text-sm"
              />
            </div>
            <div>
              <label className="form-label">Display Name</label>
              <input
                type="text"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                placeholder="Jane Doe"
                className="input text-sm"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="form-label">Roles</label>
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
                    className="px-2.5 py-1 rounded text-xs transition-colors border"
                    style={
                      checked
                        ? {
                            backgroundColor: 'rgb(var(--color-accent-primary))',
                            color: '#fff',
                            borderColor: 'rgb(var(--color-accent-primary))',
                          }
                        : {
                            backgroundColor: 'var(--surface-2)',
                            color: 'var(--text-secondary)',
                            borderColor: 'var(--border)',
                          }
                    }
                  >
                    {humanLabel(r)}
                  </button>
                );
              })}
            </div>
          </div>
          {inviteError && (
            <p className="mb-3 text-sm" style={{ color: 'var(--error)' }}>
              {inviteError}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleInvite}
              disabled={
                inviting ||
                !inviteEmail.trim() ||
                !inviteName.trim() ||
                inviteRoles.length === 0
              }
              className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inviting ? 'Inviting…' : 'Send Invite'}
            </button>
            <button
              onClick={() => { setShowInvite(false); setInviteError(null); }}
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
            Start the backend to manage users.
          </p>
        </div>
      )}

      {/* Users table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">👥</div>
            <p style={{ color: 'var(--muted)' }}>No users yet.</p>
            <p className="text-sm mt-1" style={{ color: 'var(--disabled)' }}>
              Invite your first team member above.
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
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>User</th>
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>Status</th>
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>Roles</th>
                  <th className="pb-3 font-medium" style={{ color: 'var(--muted)' }}>Joined</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr
                    key={u.id}
                    className="align-top border-b transition-colors"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <td className="py-3">
                      <p className="font-medium" style={{ color: 'var(--text)' }}>
                        {u.displayName}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {u.email}
                      </p>
                    </td>
                    <td className="py-3">
                      <Badge tone={statusTone(u.status)}>{humanLabel(u.status)}</Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1 items-center">
                        {u.roles.map(r => (
                          <span key={r} className="inline-flex items-center gap-1">
                            <Badge tone={roleTone(r)}>{humanLabel(r)}</Badge>
                            <button
                              onClick={() => handleRevokeRole(u.id, r)}
                              className="opacity-60 hover:opacity-100 text-xs"
                              style={{ color: 'var(--muted)' }}
                              title="Revoke role"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {addingRoleFor === u.id ? (
                          <Select
                            autoFocus
                            options={ROLE_OPTIONS.filter(r => !u.roles.includes(r.value))}
                            placeholder="Add role…"
                            defaultValue=""
                            onChange={e =>
                              e.target.value && handleAddRole(u.id, e.target.value)
                            }
                            onBlur={() => setAddingRoleFor(null)}
                            className="text-xs py-1"
                          />
                        ) : (
                          <button
                            onClick={() => setAddingRoleFor(u.id)}
                            className="text-xs px-1.5"
                            style={{ color: 'rgb(var(--color-accent-primary))' }}
                          >
                            + add
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setConfirm({ kind: 'suspend', user: u })}
                        className="text-xs mr-3"
                        style={{ color: 'rgb(var(--color-accent-primary))' }}
                      >
                        {u.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setConfirm({ kind: 'remove', user: u })}
                        className="text-xs"
                        style={{ color: 'var(--error)' }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm modal for destructive actions */}
      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        size="sm"
        title={
          confirm?.kind === 'remove'
            ? 'Remove user?'
            : confirm?.user.status === 'active'
              ? 'Suspend user?'
              : 'Activate user?'
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirm(null)}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={runConfirm}
              className={confirm?.kind === 'remove' ? 'btn-danger text-sm' : 'btn-primary text-sm'}
            >
              {confirm?.kind === 'remove'
                ? 'Remove'
                : confirm?.user.status === 'active'
                  ? 'Suspend'
                  : 'Activate'}
            </button>
          </>
        }
      >
        {confirm && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {confirm.kind === 'remove' ? (
              <>
                Remove <span style={{ color: 'var(--text)' }}>{confirm.user.email}</span>?
                They will lose access immediately.
              </>
            ) : confirm.user.status === 'active' ? (
              <>
                Suspend <span style={{ color: 'var(--text)' }}>{confirm.user.email}</span>?
                They will be unable to sign in until reactivated.
              </>
            ) : (
              <>
                Reactivate <span style={{ color: 'var(--text)' }}>{confirm.user.email}</span>?
                They will regain access immediately.
              </>
            )}
          </p>
        )}
      </Modal>
    </AppLayout>
  );
};

export { Users };
