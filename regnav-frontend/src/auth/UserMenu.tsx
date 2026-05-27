import React, { useState } from 'react';
import { useAuth } from './AuthProvider';

/**
 * Compact user identity + sign-out menu. Renders nothing when auth isn't
 * configured (dev-bypass mode).
 */
export const UserMenu: React.FC = () => {
  const { isAuthenticated, isConfigured, account, pca } = useAuth();
  const [open, setOpen] = useState(false);

  if (!isConfigured) {
    return (
      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
        dev-bypass
      </span>
    );
  }

  if (!isAuthenticated || !account) return null;

  const initials = (account.name ?? account.username ?? '?')
    .split(/\s+/)
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-purple-700 text-white flex items-center justify-center text-xs font-medium">
          {initials}
        </div>
        <span className="text-sm text-gray-200 hidden md:inline">
          {account.name ?? account.username}
        </span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-gray-700 bg-gray-900 shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-800">
              <p className="text-sm text-gray-100 font-medium truncate">
                {account.name ?? '—'}
              </p>
              <p className="text-xs text-gray-500 truncate">{account.username}</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('auth_token');
                pca?.logoutRedirect();
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
};
