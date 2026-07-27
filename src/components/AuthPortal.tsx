import { useState, type FormEvent } from 'react'
import {
  AuthError,
  login,
  requestPasswordRecovery,
  signup,
  type User,
} from '@netlify/identity'
import {
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Landmark,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react'

type AuthPortalProps = {
  onAuthenticated: (user: User) => void
}

type AuthMode = 'login' | 'signup' | 'recovery'

export function AuthPortal({ onAuthenticated }: AuthPortalProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPending(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'login') {
        const user = await login(email, password)
        onAuthenticated(user)
      } else if (mode === 'signup') {
        const user = await signup(email, password, { full_name: name })
        if (user.confirmedAt) onAuthenticated(user)
        else setMessage(`Verification instructions were sent to ${email}.`)
      } else {
        await requestPasswordRecovery(email)
        setMessage(`A secure recovery link was sent to ${email}.`)
      }
    } catch (caughtError) {
      if (caughtError instanceof AuthError && caughtError.status === 401) {
        setError('The supplied desk credentials were not accepted.')
      } else {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Secure access could not be completed.',
        )
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="wordmark wordmark-light">
            <span className="wordmark-mark"><Landmark size={19} /></span>
            <span>DIABITRAGE</span>
          </div>

          <div className="auth-hero-copy">
            <p className="eyebrow eyebrow-light">Internal Center for Asset Recovery</p>
            <h1>Controlled recovery.<br />Defensible decisions.</h1>
            <p className="auth-summary">
              A secure administration environment for complex asset recovery,
              synchronized ledgers, and governed liquidity release.
            </p>
          </div>

          <div className="security-rail">
            <div><ShieldCheck size={18} /><span>Role-gated access</span></div>
            <div><Fingerprint size={18} /><span>Identity verified</span></div>
            <div><LockKeyhole size={18} /><span>Encrypted session</span></div>
          </div>
        </div>
        <div className="auth-watermark">LDN</div>
        <div className="auth-grid" />
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="access-classification">
            <span>Restricted</span>
            <span>London Desk · LDN-04</span>
          </div>

          <div className="form-heading">
            <div className="form-icon"><KeyRound size={21} /></div>
            <p className="eyebrow">Secure case portal</p>
            <h2>
              {mode === 'login' && 'Desk authentication'}
              {mode === 'signup' && 'Request controlled access'}
              {mode === 'recovery' && 'Recover desk access'}
            </h2>
            <p>
              {mode === 'login' && 'Enter your authorized credentials to open the recovery workspace.'}
              {mode === 'signup' && 'Create an identity record for this protected case environment.'}
              {mode === 'recovery' && 'Receive a time-limited link to restore your secure session.'}
            </p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === 'signup' && (
              <label>
                <span>Full name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Authorized operator"
                  autoComplete="name"
                  required
                />
              </label>
            )}
            <label>
              <span>Corporate email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="operator@organization.com"
                autoComplete="email"
                required
              />
            </label>
            {mode !== 'recovery' && (
              <label>
                <span>Access credential</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={8}
                  required
                />
              </label>
            )}

            {error && <div className="form-notice form-error">{error}</div>}
            {message && (
              <div className="form-notice form-success">
                <CheckCircle2 size={17} />{message}
              </div>
            )}

            <button className="primary-button auth-submit" disabled={pending} type="submit">
              <span>
                {pending && 'Establishing secure session…'}
                {!pending && mode === 'login' && 'Enter recovery center'}
                {!pending && mode === 'signup' && 'Create secure identity'}
                {!pending && mode === 'recovery' && 'Send recovery link'}
              </span>
              {!pending && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-options">
            {mode === 'login' ? (
              <>
                <button type="button" onClick={() => setMode('recovery')}>Forgot credentials?</button>
                <button type="button" onClick={() => setMode('signup')}>Request access</button>
              </>
            ) : (
              <button type="button" onClick={() => setMode('login')}>Return to authentication</button>
            )}
          </div>

          <p className="legal-copy">
            Access is monitored. This interface is a controlled financial workflow
            simulation and does not initiate external transfers.
          </p>
        </div>
      </section>
    </main>
  )
}
