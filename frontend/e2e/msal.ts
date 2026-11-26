import { InteractionStatus } from '@azure/msal-browser'
import type { AccountInfo } from '@azure/msal-browser'
import type { ReactNode } from 'react'

const sessionKey = 'playwright-signed-in'
const customerId = import.meta.env.VITE_E2E_CUSTOMER_ID
const tenantId = import.meta.env.VITE_E2E_TENANT_ID
const account: AccountInfo = {
  homeAccountId: `${customerId}.${tenantId}`,
  localAccountId: customerId,
  tenantId,
  environment: 'login.microsoftonline.com',
  username: 'playwright@example.test',
}

export const msalInstance = {
  async loginRedirect() {
    const token = import.meta.env.VITE_E2E_ENTRA_TOKEN
    if (!token) throw new Error('Playwright identity fixture is missing its token.')
    sessionStorage.setItem(sessionKey, 'true')
    window.location.reload()
  },
  async logoutRedirect() {
    sessionStorage.removeItem(sessionKey)
    window.location.reload()
  },
  async acquireTokenSilent() {
    return { accessToken: import.meta.env.VITE_E2E_ENTRA_TOKEN }
  },
}

export function MsalProvider({ children }: { children: ReactNode }) {
  return children
}

export function useIsAuthenticated() {
  return sessionStorage.getItem(sessionKey) === 'true'
}

export function useMsal() {
  return {
    instance: msalInstance,
    accounts: useIsAuthenticated() ? [account] : [],
    inProgress: InteractionStatus.None,
  }
}
