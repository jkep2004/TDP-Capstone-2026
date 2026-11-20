import { useState } from 'react'
import {
  useIsAuthenticated,
  useMsal,
} from '@azure/msal-react'

import { loginRequest } from './authConfig'
import SpendingPage from './SpendingPage'
import './App.css'

function App() {
  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const [loginError, setLoginError] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)

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
          Signed in as <strong>{accounts[0]?.username ?? 'Microsoft account'}</strong>
        </span>
        {/* Send post request to /api/v1/auth with token */}
        <button onClick={async () => {
          const token = await instance.acquireTokenSilent({
            ...loginRequest,
            account: accounts[0]
          });
          if (token) {
            await fetch("http://localhost:8000/api/v1/auth", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                token: token.accessToken
              })
            });
            // DEBUG
            console.log("Token sent to backend:", token.accessToken);
          }
        }}>
          DEBUG: Send token to backend
        </button>
        <button type="button" onClick={logout}>Sign out</button>
      </header>
      <SpendingPage />
    </>
  )
}

export default App
