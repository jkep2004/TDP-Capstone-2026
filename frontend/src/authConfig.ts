import type { Configuration } from "@azure/msal-browser";
import { LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID,
    authority:
      `https://login.microsoftonline.com/${
        import.meta.env.VITE_ENTRA_TENANT_ID
      }`,
    redirectUri: window.location.origin
  },
  cache: {
    cacheLocation: "sessionStorage"
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Info, // TODO: Change to LogLevel.Error in production
    }
  }
};

export const loginRequest = {
  scopes: [
    "openid",
    "profile",
    "api://e4ef5f81-5c39-41d1-af84-742d6f27029e/access_as_user"
  ]
};