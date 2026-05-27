import { LogLevel, type Configuration } from '@azure/msal-browser';

/**
 * MSAL configuration. Reads from Vite env vars:
 *   - VITE_AUTH_CLIENT_ID — the Azure AD B2C application/client ID
 *   - VITE_AUTH_AUTHORITY — full authority URL,
 *     e.g. https://YOUR_TENANT.b2clogin.com/YOUR_TENANT.onmicrosoft.com/B2C_1_signin
 *   - VITE_AUTH_API_SCOPE — API scope, e.g. https://YOUR_TENANT.onmicrosoft.com/api/access_as_user
 *
 * If env vars are missing we fall back to a dev-bypass mode where MSAL is
 * never invoked and the app uses the `Bearer dev-bypass` token.
 */

export const AUTH_CLIENT_ID = import.meta.env.VITE_AUTH_CLIENT_ID ?? '';
export const AUTH_AUTHORITY = import.meta.env.VITE_AUTH_AUTHORITY ?? '';
export const AUTH_API_SCOPE = import.meta.env.VITE_AUTH_API_SCOPE ?? '';

export const isAuthConfigured = Boolean(AUTH_CLIENT_ID && AUTH_AUTHORITY);

export const msalConfig: Configuration = {
  auth: {
    clientId: AUTH_CLIENT_ID,
    authority: AUTH_AUTHORITY,
    knownAuthorities: AUTH_AUTHORITY ? [new URL(AUTH_AUTHORITY).hostname] : [],
    redirectUri: window.location.origin + import.meta.env.BASE_URL,
    postLogoutRedirectUri: window.location.origin + import.meta.env.BASE_URL,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message) => {
        if (level === LogLevel.Error) {
          console.error('[MSAL]', message);
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

export const loginRequest = {
  scopes: AUTH_API_SCOPE ? [AUTH_API_SCOPE, 'openid', 'profile'] : ['openid', 'profile'],
};

export const tokenRequest = {
  scopes: AUTH_API_SCOPE ? [AUTH_API_SCOPE] : [],
};
