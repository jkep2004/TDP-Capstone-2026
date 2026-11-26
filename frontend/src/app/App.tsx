import { useState } from 'react'
import {
  useIsAuthenticated,
  useMsal,
} from '@azure/msal-react'

import { loginRequest } from '../auth/authConfig'
import SpendingPage from '../features/spending/SpendingPage'
import InsightsPage from '../features/insights/InsightsPage'
import './App.css'

function App() {
  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const [loginError, setLoginError] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const account = accounts[0]
  const [section, setSection] = useState<'spending' | 'insights'>('spending')

  const login = async () => {
    setLoginError('')
    setIsSigningIn(true)

    try {
      await instance.loginRedirect(loginRequest)
    } catch {
      setIsSigningIn(false)
      setLoginError('We couldn’t start sign-in. Please try again.')
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
        <button type="button" onClick={logout}>Sign out</button>
      </header>
      <nav className="insights-nav" aria-label="Account sections">
        <button className="mode-button" type="button" aria-pressed={section === 'spending'} onClick={() => setSection('spending')}>
          Spending
        </button>
        <button className="mode-button" type="button" aria-pressed={section === 'insights'} onClick={() => setSection('insights')}>
          Insights
        </button>
      </nav>
      <div hidden={section !== 'spending'}><SpendingPage account={account} /></div>
      {section === 'insights' && account && <InsightsPage key={account.homeAccountId} account={account} />}
    </>
  )
}

export default App
