import { msalInstance } from "./msal";
import { loginRequest } from "./authConfig";

export async function callApi() { // TODO: Check this works with the new JWT auth flow

  const account =
    msalInstance.getActiveAccount() ??
    msalInstance.getAllAccounts()[0];

  if (!account) { // TODO: Redirect to login page if user is not authenticated
    throw new Error("User not authenticated");
  }

  const token = await msalInstance.acquireTokenSilent({
    ...loginRequest,
    account
  });

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/profile`,
    {
      headers: {
        Authorization: `Bearer ${token.accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error("API request failed"); // TODO: Handle API errors more gracefully
  }

  return response.json();
}