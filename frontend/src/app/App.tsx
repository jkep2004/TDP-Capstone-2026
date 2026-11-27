import { useState } from 'react'
import {
  useIsAuthenticated,
  useMsal,
} from '@azure/msal-react'
import type { AccountInfo } from '@azure/msal-browser'
import { ArrowRight, ChartNoAxesCombined, Leaf, LogOut, Medal, Wallet } from 'lucide-react'

import { loginRequest } from '../auth/authConfig'
import woodland from '../assets/woodland-river.webp'
import woodlandSmall from '../assets/woodland-river-small.webp'
import ChallengesPage from '../features/challenges/ChallengesPage'
import SpendingPage from '../features/spending/SpendingPage'
import InsightsPage from '../features/insights/InsightsPage'
import './App.css'

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><Leaf size={21} strokeWidth={1.8} aria-hidden="true" /></span>
      <span>Carbon &amp; Savings <span className="brand-qualifier">Advisor</span></span>
    </div>
  )
}

function CustomerArea({ account, signOut }: { account: AccountInfo; signOut: () => Promise<void> }) {
  const [section, setSection] = useState<'spending' | 'insights' | 'challenges'>('insights')
  const [hasOpenedSpending, setHasOpenedSpending] = useState(false)
  const [introDismissed, setIntroDismissed] = useState(false)
  const [savedMonth, setSavedMonth] = useState<string>()
  const [signOutError, setSignOutError] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const openSpending = () => {
    setSavedMonth(undefined)
    setHasOpenedSpending(true)
    setSection('spending')
    requestAnimationFrame(() => document.getElementById('spending-content')?.focus())
  }

  return (
    <>
      <a className="skip-link" href={`#${section}-content`}>Skip to content</a>
      <header className="account-header">
        <div className="account-bar">
          <Brand />
          <nav className="account-nav" aria-label="Account sections">
            <button type="button" aria-pressed={section === 'insights'} onClick={() => setSection('insights')}>
              <ChartNoAxesCombined size={17} aria-hidden="true" /> Overview
            </button>
            <button type="button" aria-pressed={section === 'spending'} onClick={openSpending}>
              <Wallet size={17} aria-hidden="true" /> Add spending
            </button>
            <button type="button" aria-pressed={section === 'challenges'} onClick={() => {
              setSection('challenges')
              requestAnimationFrame(() => document.getElementById('challenges-content')?.focus())
            }}>
              <Medal size={17} aria-hidden="true" /> Challenges
            </button>
          </nav>
          <button className="sign-out-button" type="button" disabled={isSigningOut} onClick={async () => {
          setSignOutError(false)
          setIsSigningOut(true)
          try {
            await signOut()
          } catch {
            setSignOutError(true)
          } finally {
            setIsSigningOut(false)
          }
          }}><LogOut size={17} aria-hidden="true" /> {isSigningOut ? 'Signing out…' : 'Sign out'}</button>
        </div>
      </header>
      {signOutError && <p className="account-error" role="alert">We couldn’t sign you out. Please try again.</p>}
      {hasOpenedSpending && <div className="page-spending" hidden={section !== 'spending'}>
        <SpendingPage account={account} onSaved={(month) => {
          setSavedMonth(month)
          setSection('insights')
        }} />
      </div>}
      {section === 'insights' && (
        <div className="page-insights">
          <InsightsPage key={savedMonth ?? 'insights'} account={account} savedMonth={savedMonth} onAddSpending={openSpending}
            introDismissed={introDismissed} onDismissIntro={() => setIntroDismissed(true)} />
        </div>
      )}
      {section === 'challenges' && <ChallengesPage account={account} onAddSpending={openSpending} />}
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
        <section className="auth-editorial" aria-labelledby="auth-heading">
          <picture className="auth-photo">
            <source media="(max-width: 720px)" srcSet={woodlandSmall} />
            <img src={woodland} width="1024" height="1536" alt="" fetchPriority="high" />
          </picture>
          <Brand />
          <div className="auth-intro">
            <h1 id="auth-heading">Understand your spending</h1>
            <p>
              See the estimated carbon impact of your monthly spending and find ways to save.
            </p>
          </div>
        </section>
        <section className="auth-action" aria-labelledby="sign-in-heading">
          <div>
            <h2 id="sign-in-heading">Sign in to your account</h2>
            <p>Sign in with your Microsoft account to continue.</p>
            <button
              className="sign-in-button"
              type="button"
              onClick={login}
              disabled={isSigningIn}
            >
              {isSigningIn ? 'Connecting to Microsoft…' : 'Sign in with Microsoft'}
              {!isSigningIn && <ArrowRight size={19} aria-hidden="true" />}
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
