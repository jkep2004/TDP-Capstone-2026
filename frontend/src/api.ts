import { msalInstance } from "./msal";
import { loginRequest } from "./authConfig";
import type { AccountInfo } from "@azure/msal-browser";

const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export async function checkHealth(path: "/health/" | "/health/database") {
  const response = await fetch(`${apiUrl}/api/v1${path}`);
  if (!response.ok) {
    throw new Error(`Health check failed (HTTP ${response.status})`);
  }
  return response.json() as Promise<{ status: string; version: string }>;
}

export type SpendingCategory = "travel" | "food" | "utilities";

export async function calculateSpending(spending: {
  CustomerID: number;
  week: number;
  category: SpendingCategory;
  amount: number;
}[]) {
  const response = await fetch(`${apiUrl}/api/v1/calculate/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spending })
  });
  if (!response.ok) {
    throw new Error(`Calculation failed (HTTP ${response.status})`);
  }
  return response.json() as Promise<{
    totalCarbonKg: number;
    breakdown: { category: SpendingCategory; amount: number; carbonKg: number }[];
  }>;
}

export async function callApi(
  account: AccountInfo | undefined =
    msalInstance.getActiveAccount() ??
    msalInstance.getAllAccounts()[0]
) {

  if (!account) {
    throw new Error("User not authenticated");
  }

  const entraToken = await msalInstance.acquireTokenSilent({
    ...loginRequest,
    account
  });

  const authResponse = await fetch(`${apiUrl}/api/v1/auth/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: entraToken.accessToken })
  });

  if (!authResponse.ok) {
    throw new Error(`Token exchange failed (${authResponse.status})`);
  }

  const { access_token: appToken } = await authResponse.json();
  const userResponse = await fetch(`${apiUrl}/api/user`, {
    headers: { Authorization: `Bearer ${appToken}` }
  });

  if (!userResponse.ok) {
    throw new Error(`User request failed (${userResponse.status})`);
  }

  return userResponse.json();
}
