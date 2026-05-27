import {
  EventType,
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
} from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import React, { useEffect, useMemo, useState } from 'react';
import { isAuthConfigured, msalConfig, tokenRequest } from './msalConfig';

interface AuthContextValue {
  isAuthenticated: boolean;
  isConfigured: boolean;
  account: AccountInfo | null;
  pca: PublicClientApplication | null;
}

export const AuthContext = React.createContext<AuthContextValue>({
  isAuthenticated: false,
  isConfigured: false,
  account: null,
  pca: null,
});

interface Props {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const pca = useMemo(() => {
    if (!isAuthConfigured) return null;
    return new PublicClientApplication(msalConfig);
  }, []);

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [ready, setReady] = useState(!isAuthConfigured);

  useEffect(() => {
    if (!pca) return;

    let mounted = true;

    pca
      .initialize()
      .then(async () => {
        const accounts = pca.getAllAccounts();
        if (accounts.length > 0) {
          pca.setActiveAccount(accounts[0]);
          if (mounted) setAccount(accounts[0]);
          await refreshToken(pca, accounts[0]);
        }
        if (mounted) setReady(true);
      })
      .catch(err => {
        console.error('MSAL initialize failed:', err);
        if (mounted) setReady(true);
      });

    const callbackId = pca.addEventCallback(event => {
      if (
        event.eventType === EventType.LOGIN_SUCCESS &&
        event.payload &&
        'account' in event.payload &&
        (event.payload as AuthenticationResult).account
      ) {
        const acct = (event.payload as AuthenticationResult).account!;
        pca.setActiveAccount(acct);
        setAccount(acct);
        refreshToken(pca, acct);
      }
      if (event.eventType === EventType.LOGOUT_SUCCESS) {
        setAccount(null);
        localStorage.removeItem('auth_token');
      }
    });

    return () => {
      mounted = false;
      if (callbackId) pca.removeEventCallback(callbackId);
    };
  }, [pca]);

  const value: AuthContextValue = {
    isAuthenticated: Boolean(account),
    isConfigured: isAuthConfigured,
    account,
    pca,
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-300">
        <div className="text-center">
          <div className="text-4xl mb-3">🧭</div>
          <p className="text-sm">Initialising authentication…</p>
        </div>
      </div>
    );
  }

  if (!pca) {
    // Not configured — pass through with dev-bypass mode
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  return (
    <MsalProvider instance={pca}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </MsalProvider>
  );
};

async function refreshToken(
  pca: PublicClientApplication,
  account: AccountInfo,
): Promise<void> {
  try {
    const result = await pca.acquireTokenSilent({ ...tokenRequest, account });
    localStorage.setItem('auth_token', result.accessToken);
  } catch (err) {
    console.warn('Silent token refresh failed:', err);
  }
}

export const useAuth = (): AuthContextValue => React.useContext(AuthContext);
