import { useEffect, useState } from 'react'
import {
  useIsAuthenticated,
  useMsal,
} from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'

import { loginRequest } from './authConfig'
import { callApi } from './api'
import SpendingPage from './SpendingPage'
import ApiHealth from './ApiHealth'
import './App.css'

function App() {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const [loginError, setLoginError] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [apiResult, setApiResult] = useState<{ accountId: string; error?: string }>()
  const account = accounts[0]
  const currentApiResult = apiResult?.accountId === account?.homeAccountId ? apiResult : undefined

  useEffect(() => {
    if (!account || inProgress !== InteractionStatus.None) return

    let active = true
    callApi(account).then(() => {
      if (active) setApiResult({ accountId: account.homeAccountId })
    }).catch((error: unknown) => {
      if (!active) return
      setApiResult({
        accountId: account.homeAccountId,
        error: error instanceof Error ? error.message : 'API session verification failed.',
      })
    })

    return () => {
      active = false
    }
  }, [account, inProgress])

  const login = async () => {
    setLoginError('')
    setIsSigningIn(true)

    try {
      await instance.loginRedirect(loginRequest)
    } catch (error) {
      setIsSigningIn(false)
      setLoginError(
        error instanceof Error
          ? error.message
          : 'Sign-in could not be started. Please try again.'
      )
    }
  }

  const logout = () => {
    void instance.logoutRedirect()
  }

  if (!isAuthenticated) {
    return (
      <main className="auth-page">
        <p className="auth-eyebrow">Carbon &amp; Savings Advisor</p>

        <section className="auth-card" aria-labelledby="auth-heading">
          <div className="auth-intro">
            <span className="auth-mark" aria-hidden="true">£</span>
            <h1 id="auth-heading">Make your spending go further.</h1>
            <p>
              Understand the carbon impact of your monthly spending and find
              practical ways to save.
            </p>
          </div>

          <div className="auth-action">
            <h2>Welcome</h2>
            <p>Sign in with your Microsoft account to continue.</p>
            <button
              className="sign-in-button"
              type="button"
              onClick={login}
              disabled={isSigningIn}
            >
              {isSigningIn ? 'Connecting to Microsoft…' : 'Sign in with Microsoft'}
            </button>
            <p className="auth-note">
              Your account is used to securely access the advisor.
            </p>
            {loginError && (
              <p className="auth-error" role="alert">{loginError}</p>
            )}
          </div>
        </section>

        <p className="auth-footer">
          A simple view of your money and its environmental impact.
        </p>
      </main>
    )
  }

  return (
    <>
      <header className="account-bar">
        <span>
          Signed in as <strong>{account?.username ?? 'Microsoft account'}</strong>
        </span>
        {currentApiResult?.error
          ? <span role="alert">{currentApiResult.error}</span>
          : <span role="status">{currentApiResult ? 'API session verified' : 'Verifying API session…'}</span>}
        <button type="button" onClick={logout}>Sign out</button>
      </header>
      <ApiHealth />
      <SpendingPage account={account} />
    </>
  )
}

export default App
