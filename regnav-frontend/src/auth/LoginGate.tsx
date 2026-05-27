import React from 'react';
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

  // If auth isn't configured, run in dev-bypass mode without gating
  if (!isConfigured) {
    return <>{children}</>;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md card border-purple-700/40">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🧭</div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-200 bg-clip-text text-transparent">
            RegNav.AI
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            AI-Powered Regulatory Compliance Navigator
          </p>
        </div>

        <p className="text-sm text-gray-300 text-center mb-6">
          Sign in with your organisation account to continue.
        </p>

        <button
          onClick={() => pca?.loginRedirect(loginRequest)}
          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
          </svg>
          Sign in with Microsoft
        </button>

        <p className="text-xs text-gray-600 text-center mt-6">
          Authenticated via Azure AD B2C · SOC 2 Type II target
        </p>
      </div>
    </div>
  );
};
