import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { AccountInfo } from '@azure/msal-browser'
import { Check, ChevronDown, CircleCheck, Medal, Plus, Trophy } from 'lucide-react'
import CategoryIcon from '../../app/CategoryIcon'
import { getChallenges } from '../../services/api'
import type { Challenge, ChallengeMedal, ChallengeStatus } from '../../services/api'
import { customerErrorMessage } from '../../utils/customerError'
import { formatMonth } from '../../utils/formatMonth'
import './ChallengesPage.css'

const medals = [
  { name: 'Bronze', target: 1 },
  { name: 'Silver', target: 2 },
  { name: 'Gold', target: 3 },
] as const

const statusLabels: Record<ChallengeStatus, string> = {
  NOT_STARTED: 'Available',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
}

const confetti = [
  [-135, -45, -180], [-110, -92, 260], [-85, -66, -250], [-64, -110, 115],
  [-42, -94, -170], [-24, -117, 280], [-7, -84, -220], [12, -113, 145],
  [30, -96, -285], [49, -113, 220], [69, -73, -125], [92, -100, 310],
  [119, -70, -240], [139, -43, 170],
] as const

type ChallengesConnection = Awaited<ReturnType<typeof getChallenges>>

export default function ChallengesPage({ account, onAddSpending }: { account: AccountInfo; onAddSpending: () => void }) {
  const [connection, setConnection] = useState<ChallengesConnection>()
  const [medal, setMedal] = useState<ChallengeMedal>()
  const [month, setMonth] = useState('')
  const [monthly, setMonthly] = useState<{ month: string; challenges: Challenge[] }>()
  const [openCategory, setOpenCategory] = useState<number>()
  const [loadError, setLoadError] = useState('')
  const [monthError, setMonthError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [medalError, setMedalError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [monthAttempt, setMonthAttempt] = useState(0)
  const [saving, setSaving] = useState(false)
  const [refreshingMedal, setRefreshingMedal] = useState(false)
  const [celebrating, setCelebrating] = useState<number>()
  const pending = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    getChallenges(account, controller.signal).then((result) => {
      if (controller.signal.aborted) return
      setConnection(result)
      setMedal(result.medal)
      setMonth(result.months.at(-1) ?? '')
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setLoadError(customerErrorMessage(error, 'We couldn’t load your challenges. Please try again.'))
    })
    return () => controller.abort()
  }, [account, loadAttempt])

  useEffect(() => {
    if (!connection || !month) return
    const controller = new AbortController()
    connection.loadMonth(month, controller.signal).then((challenges) => {
      if (controller.signal.aborted) return
      setMonthly({ month, challenges })
      setOpenCategory((challenges.find(({ status }) => status === 'IN_PROGRESS')
        ?? challenges.find(({ status }) => status === 'NOT_STARTED')
        ?? challenges[0])?.category_id)
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setMonthError(customerErrorMessage(error, 'We couldn’t load challenges for this month. Please try again.'))
    })
    return () => controller.abort()
  }, [connection, month, monthAttempt])

  async function refreshMedal(completedCategory?: number) {
    if (!connection) return
    setRefreshingMedal(true)
    setMedalError('')
    try {
      const updated = await connection.getMedal()
      setMedal(updated)
      if (completedCategory !== undefined && updated.medal === 'Gold' && medal?.medal !== 'Gold'
        && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        setCelebrating(completedCategory)
      }
    } catch (error) {
      setMedalError(customerErrorMessage(error, 'We couldn’t refresh your medals. Please try again.'))
    } finally {
      setRefreshingMedal(false)
    }
  }

  async function updateChallenge(challenge: Challenge) {
    if (!connection || pending.current || refreshingMedal || challenge.status === 'COMPLETED') return
    const status = challenge.status === 'NOT_STARTED' ? 'IN_PROGRESS' : 'COMPLETED'
    pending.current = true
    setSaving(true)
    setSaveError('')
    try {
      const updated = await connection.updateStatus(month, challenge.category_id, status)
      setMonthly((current) => current?.month === month ? {
        month,
        challenges: current.challenges.map((item) => item.category_id === updated.category_id ? updated : item),
      } : current)
      if (updated.status === 'COMPLETED') await refreshMedal(updated.category_id)
    } catch (error) {
      setSaveError(customerErrorMessage(error, 'We couldn’t update this challenge. Refresh the challenges and try again.'))
    } finally {
      pending.current = false
      setSaving(false)
    }
  }

  function retryMonth() {
    if (saveError) void refreshMedal()
    setMonthly(undefined)
    setMonthError('')
    setSaveError('')
    setMonthAttempt((attempt) => attempt + 1)
  }

  const challenges = monthly?.month === month ? monthly.challenges : undefined
  const nextMedal = medal && medals.find(({ target }) => medal.completed_challenges < target)
  const remaining = nextMedal && medal ? nextMedal.target - medal.completed_challenges : 0

  return (
    <main id="challenges-content" className="spending-page challenges-page" tabIndex={-1}>
      <header className="challenges-intro">
        <div>
          <h1>Sustainability challenges</h1>
          <p>Try a change based on your spending and earn medals as you complete challenges.</p>
        </div>
        {medal && <div className="challenges-completed">
          <span className="challenges-trophy"><Trophy size={23} aria-hidden="true" /></span>
          <div><strong>{medal.completed_challenges}</strong> <span>{medal.completed_challenges === 1 ? 'challenge completed' : 'challenges completed'}</span></div>
        </div>}
      </header>

      {medal && <section className="challenge-rewards" aria-labelledby="challenge-rewards-title">
        <h2 id="challenge-rewards-title">Medal roadmap</h2>
        <p className="challenge-progress" role="status">
          {nextMedal ? `${remaining} more ${remaining === 1 ? 'challenge' : 'challenges'} to earn ${nextMedal.name}.` : 'Gold earned!'}
        </p>
        <ol className="challenge-roadmap" aria-label="Medal milestones">
          {medals.map(({ name, target }) => {
            const earned = medal.completed_challenges >= target
            return <li key={name} data-medal={name.toLowerCase()} data-earned={earned}
              aria-current={target === nextMedal?.target ? 'step' : undefined}>
              <span className="challenge-medal-icon" aria-hidden="true">
                <Medal size={22} />
                {earned && <span className="challenge-medal-check"><Check size={10} strokeWidth={3} /></span>}
              </span>
              <span>{name}</span>
              <span className="challenge-medal-target">{target} {target === 1 ? 'challenge' : 'challenges'}</span>
              {earned && <span className="visually-hidden">Earned{medal.medal === name ? ' · Current medal' : ''}</span>}
            </li>
          })}
        </ol>
        {medalError && <div className="challenge-recovery">
          <p className="feedback-error" role="alert">{medalError}</p>
          <button type="button" className="button-secondary" disabled={saving || refreshingMedal} onClick={() => void refreshMedal()}>Refresh medals</button>
        </div>}
      </section>}

      {loadError ? <div className="challenge-recovery">
        <p className="feedback-error" role="alert">{loadError}</p>
        <button type="button" className="button-secondary" onClick={() => {
          setLoadError('')
          setLoadAttempt((attempt) => attempt + 1)
        }}>Try again</button>
      </div> : !connection ? <p className="challenge-message" role="status">Loading your challenges…</p>
        : !month ? <div className="challenge-recovery">
          <p>Add a month of spending to get challenges based on your spending.</p>
          <button type="button" onClick={onAddSpending}>Add spending</button>
        </div> : <>
          <div className="challenge-period field">
            <label htmlFor="challenge-month">Challenge month</label>
            <select id="challenge-month" value={month} disabled={saving} onChange={(event) => {
              setMonth(event.target.value)
              setMonthly(undefined)
              setMonthError('')
              setSaveError('')
              setCelebrating(undefined)
            }}>
              {connection.months.map((option) => <option key={option} value={option}>{formatMonth(option)}</option>)}
            </select>
          </div>

          {(monthError || saveError) && <div className="challenge-recovery">
            <p className="feedback-error" role="alert">{monthError || saveError}</p>
            <button type="button" className="button-secondary" disabled={saving || refreshingMedal} onClick={retryMonth}>Refresh challenges</button>
          </div>}
          {!challenges && !monthError && <p className="challenge-message" role="status">Loading challenges for {formatMonth(month)}…</p>}
          {challenges?.length === 0 && <p className="challenge-message">No challenges for {formatMonth(month)}. Challenges appear when spending in a category goes over its recommendation threshold.</p>}
          {challenges && challenges.length > 0 && <div className="challenge-list">
            {challenges.map((challenge) => {
              const { category_id: id, category, recommendation, action, lower_carbon_alternative: alternative, status } = challenge
              const open = openCategory === id
              const complete = status === 'COMPLETED'
              const titleId = `challenge-${id}`
              const detailsId = `${titleId}-details`
              return (
                <section className="challenge-card" key={id} aria-labelledby={titleId} data-open={open} data-complete={complete}>
                  <h2 aria-labelledby={titleId}>
                    <button type="button" className="challenge-toggle" aria-expanded={open} aria-controls={detailsId}
                      onClick={() => setOpenCategory(open ? undefined : id)}>
                      <CategoryIcon name={category} />
                      <span id={titleId} className="challenge-title">{category}</span>{' '}
                      <span className="challenge-state">{statusLabels[status]}</span>
                      <ChevronDown size={18} className="challenge-chevron" aria-hidden="true" />
                    </button>
                  </h2>
                  <div id={detailsId} className="challenge-details" hidden={!open}>
                    {alternative && <p className="challenge-alternative">{alternative}</p>}
                    <p className="challenge-description">{action || recommendation}</p>
                    <button type="button" className={complete ? 'challenge-complete' : 'challenge-action'}
                      aria-disabled={complete || saving || refreshingMedal || undefined} tabIndex={complete ? -1 : undefined}
                      onClick={() => void updateChallenge(challenge)}>
                      {status === 'NOT_STARTED' ? <><Plus size={18} aria-hidden="true" /> Start challenge</>
                        : <><CircleCheck size={19} aria-hidden="true" /> {complete ? 'Challenge complete' : 'Mark complete'}</>}
                    </button>
                  </div>
                  {celebrating === id && <div className="challenge-confetti" aria-hidden="true" onAnimationEnd={(event) => {
                    if (event.target === event.currentTarget) setCelebrating(undefined)
                  }}>
                    {confetti.map(([x, lift, spin]) => <span key={x} style={{
                      '--confetti-x': `${x}px`, '--confetti-lift': `${lift}px`, '--confetti-spin': `${spin}deg`,
                    } as CSSProperties} />)}
                  </div>}
                </section>
              )
            })}
          </div>}
        </>}
    </main>
  )
}
