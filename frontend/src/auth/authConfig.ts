import type { Configuration } from "@azure/msal-browser";
import { LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_ENTRA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/common`,
    redirectUri: window.location.origin
  },
  cache: {
    cacheLocation: "sessionStorage"
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Error,
      piiLoggingEnabled: false,
    }
  }
};

export const loginRequest = {
  scopes: [
    "openid",
    "profile",
    `api://${import.meta.env.VITE_ENTRA_API_CLIENT_ID}/access_as_user`
  ]
};
