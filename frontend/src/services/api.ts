import { msalInstance } from "../auth/msal";
import { loginRequest } from "../auth/authConfig";
import type { AccountInfo } from "@azure/msal-browser";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { CustomerError } from "../utils/customerError";

const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const insightsApiUrl = (import.meta.env.VITE_INSIGHTS_API_URL || apiUrl).replace(/\/+$/, "");

export type Category = { id: number; name: string; parent_id: number | null };

export async function getCategories(signal?: AbortSignal): Promise<Category[]> {
  const response = await fetch(`${apiUrl}/api/v1/categories/`, { signal });
  if (!response.ok) {
    throw new Error(`Could not load categories (HTTP ${response.status})`);
  }
  return response.json();
}

type SpendingEntry = {
  customerID: string;
  month: string;
  week: number;
  categoryID: number;
  subcategoryID?: number;
  amount: number;
};

export async function resolveSpendingCategories<T extends string>(names: readonly T[]) {
  const available = await getCategories();
  return names.map((category) => {
    const match = available.find((item) => item.parent_id === null && item.name.toLowerCase() === category);
    if (!match) throw new Error(`The API does not offer the ${category} category.`);
    return { category, categoryID: match.id };
  });
}

export async function calculateSpending(spending: SpendingEntry[]) {
  const response = await fetch(`${apiUrl}/api/v1/calculate/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spending })
  });
  if (!response.ok) {
    if (response.status === 422) {
      throw new CustomerError("Calculation failed (HTTP 422)", "Check the weeks and amounts in your file, then try again.");
    }
    throw new Error(`Calculation failed (HTTP ${response.status})`);
  }
  return response.json() as Promise<{
    totalCarbonKg: number;
    breakdown: { category: number; amount: number; carbonKg: number }[];
  }>;
}

async function exchangeToken(
  account: AccountInfo,
  baseUrl = apiUrl,
  signal?: AbortSignal
) {
  const entraToken = await msalInstance.acquireTokenSilent({
    ...loginRequest,
    account
  }).catch((error: unknown) => {
    if (error instanceof InteractionRequiredAuthError) {
      throw new CustomerError(error.message, "Please sign out and sign in again.");
    }
    throw error;
  });

  const authResponse = await fetch(`${baseUrl}/api/v1/auth/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: entraToken.accessToken }),
    signal,
  });

  if (!authResponse.ok) {
    if (authResponse.status === 401 || authResponse.status === 403) {
      throw new CustomerError(`Token exchange failed (${authResponse.status})`, "Please sign out and sign in again.");
    }
    throw new Error(`Token exchange failed (${authResponse.status})`);
  }

  return authResponse.json() as Promise<{ access_token: string; user: { id: string } }>;
}

export async function getInsights(account: AccountInfo, signal: AbortSignal) {
  const { access_token } = await exchangeToken(account, insightsApiUrl, signal);
  const headers = { Authorization: `Bearer ${access_token}` };

  async function get<T>(path: string, requestSignal: AbortSignal): Promise<T> {
    const response = await fetch(`${insightsApiUrl}/api/v1/${path}`, { headers, signal: requestSignal });
    if (!response.ok) throw new Error(`Could not load ${path.split("/")[0]} (HTTP ${response.status}).`);
    return response.json();
  }

  const trends = await get<{ months: { month: string; total_carbon_kg: number }[] }>("trends/", signal);
  return {
    months: trends.months.map((point) => ({ month: point.month.slice(0, 7), totalCarbonKg: point.total_carbon_kg })),
    async loadMonth(month: string, monthSignal: AbortSignal) {
      const query = `?month=${month}-01`;
      const [summary, recommendations, savings] = await Promise.all([
        get<{
          total_spend_gbp: number;
          total_carbon_kg: number;
          categories: { category: string; carbon_kg: number | null; monthly_spend_gbp: number }[];
        }>(`summary/${query}`, monthSignal),
        get<{ recommendations: {
          category: string;
          advice: string;
          projected_savings_gbp: number;
          projected_carbon_reduction_kg: number;
        }[] }>(`recommendations/${query}`, monthSignal),
        get<{ total_savings_gbp: number; total_carbon_reduction_kg: number }>(`savings/${query}`, monthSignal),
      ]);
      return {
        month,
        totalSpendGbp: summary.total_spend_gbp,
        totalCarbonKg: summary.total_carbon_kg,
        categories: summary.categories.map((item) => ({ name: item.category, carbonKg: item.carbon_kg, spendGbp: item.monthly_spend_gbp })),
        recommendations: recommendations.recommendations.map((item) => ({
          category: item.category,
          advice: item.advice,
          savingsGbp: item.projected_savings_gbp,
          savingsKg: item.projected_carbon_reduction_kg,
        })),
        savings: { gbp: savings.total_savings_gbp, kg: savings.total_carbon_reduction_kg },
      };
    },
  };
}

export async function saveSpending(
  entries: (Omit<SpendingEntry, "customerID" | "week"> & { week: number | null })[],
  account: AccountInfo
) {
  const session = await exchangeToken(account);
  const response = await fetch(`${apiUrl}/api/v1/spend/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify(entries.map((entry) => ({ ...entry, customerID: session.user.id })))
  });
  if (!response.ok) {
    if (response.status === 409) {
      throw new CustomerError(
        "Save failed (HTTP 409)",
        "Some of this spending has already been saved for the selected month. Choose another month or review your entries and try again."
      );
    }
    if (response.status === 422) {
      throw new CustomerError("Save failed (HTTP 422)", "Check the month and spending amounts, then try again.");
    }
    throw new Error(`Save failed (HTTP ${response.status})`);
  }
}
