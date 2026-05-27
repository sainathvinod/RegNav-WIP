import React, { useState } from 'react';
import { loginRequest } from './msalConfig';
import { useAuth } from './AuthProvider';

interface Props {
  children: React.ReactNode;
}

/**
 * Renders the app only when the user is authenticated (or auth is not
 * configured — in which case dev-bypass mode is active). Otherwise shows
 * a sign-in screen that triggers the MSAL redirect flow.
 */
export const LoginGate: React.FC<Props> = ({ children }) => {
  const { isAuthenticated, isConfigured, pca } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isConfigured) return <>{children}</>;
  if (isAuthenticated) return <>{children}</>;

  const handleSignIn = () => {
    setSigningIn(true);
    setError(null);
    pca?.loginRedirect(loginRequest).catch((err) => {
      setSigningIn(false);
      setError(err?.message || 'Sign-in failed. Please try again.');
    });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ backgroundColor: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border shadow-xl p-6 sm:p-8"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="text-center mb-6">
          <div className="text-5xl mb-3" aria-hidden="true">🧭</div>
          <h1
            className="text-2xl font-bold bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgb(var(--color-accent-primary)), rgb(var(--color-accent-hover)))',
            }}
          >
            RegNav.AI
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            AI-Powered Regulatory Compliance Navigator
          </p>
        </div>

        <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
          Sign in with your organisation account to continue.
        </p>

        {error && (
          <div
            className="rounded-lg border p-3 mb-4 text-sm"
            style={{
              backgroundColor: 'var(--error-bg)',
              borderColor: 'var(--error)',
              color: 'var(--error)',
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSignIn}
          disabled={signingIn}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Microsoft">
            <title>Microsoft</title>
            <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
          </svg>
          {signingIn ? 'Redirecting…' : 'Sign in with Microsoft'}
        </button>

        <p className="text-xs text-center mt-6" style={{ color: 'var(--muted)' }}>
          Authenticated via Azure AD B2C · SOC 2 Type II target
        </p>
      </div>
    </div>
  );
};
