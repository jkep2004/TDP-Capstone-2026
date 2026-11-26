import { useState } from 'react'
import {
  useIsAuthenticated,
  useMsal,
} from '@azure/msal-react'
import type { AccountInfo } from '@azure/msal-browser'

import { loginRequest } from '../auth/authConfig'
import SpendingPage from '../features/spending/SpendingPage'
import InsightsPage from '../features/insights/InsightsPage'
import './App.css'

function CustomerArea({ account, signOut }: { account: AccountInfo; signOut: () => Promise<void> }) {
  const [section, setSection] = useState<'spending' | 'insights'>('spending')
  const [savedMonth, setSavedMonth] = useState<string>()
  const [signOutError, setSignOutError] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const openSpending = () => {
    setSavedMonth(undefined)
    setSection('spending')
  }

  return (
    <>
      <header className="account-bar">
        <span className="product-name">Carbon &amp; Savings Advisor</span>
        <button type="button" disabled={isSigningOut} onClick={async () => {
          setSignOutError(false)
          setIsSigningOut(true)
          try {
            await signOut()
          } catch {
            setSignOutError(true)
          } finally {
            setIsSigningOut(false)
          }
        }}>{isSigningOut ? 'Signing out…' : 'Sign out'}</button>
      </header>
      {signOutError && <p className="account-error" role="alert">We couldn’t sign you out. Please try again.</p>}
      <nav className="insights-nav" aria-label="Account sections">
        <button className="mode-button" type="button" aria-pressed={section === 'spending'} onClick={openSpending}>Spending</button>
        <button className="mode-button" type="button" aria-pressed={section === 'insights'} onClick={() => setSection('insights')}>Insights</button>
      </nav>
      <div hidden={section !== 'spending'}>
        <SpendingPage account={account} onSaved={(month) => {
          setSavedMonth(month)
          setSection('insights')
        }} />
      </div>
      {section === 'insights' && <InsightsPage key={savedMonth ?? 'insights'} account={account} savedMonth={savedMonth} onAddSpending={openSpending} />}
    </>
  )
}

function App() {
  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const [loginError, setLoginError] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const account = accounts[0]

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

  if (!isAuthenticated || !account) {
    return (
      <main className="auth-page">
        <p className="auth-eyebrow">Carbon &amp; Savings Advisor</p>

        <section className="auth-card" aria-labelledby="auth-heading">
          <div className="auth-intro">
            <span className="auth-mark" aria-hidden="true">£</span>
            <h1 id="auth-heading">Understand your spending</h1>
            <p>
              See the estimated carbon impact of your monthly spending and find ways to save.
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
            {loginError && (
              <p className="auth-error" role="alert">{loginError}</p>
            )}
          </div>
        </section>

      </main>
    )
  }

  return <CustomerArea key={account.homeAccountId} account={account} signOut={() => instance.logoutRedirect()} />
}

export default App
