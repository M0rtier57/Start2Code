import { useState } from 'react'
import { supabase, isConfigured } from '../lib/supabaseClient'
import { toLoginEmail } from '../lib/studentAccounts'
import { diagnose, isNetworkError, supabaseHost } from '../lib/connectivity'
import { canReceiveMail, resetRedirectUrl } from '../lib/passwordReset'
import Logo from '../components/Logo'
import LanguagePicker from '../components/LanguagePicker'
import { useToast } from '../components/ui'
import { useI18n } from '../i18n'

export default function Login() {
  const toast = useToast()
  const { t } = useI18n()
  const [mode, setMode] = useState('login')      // login | signup | reset
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('student')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [unconfirmed, setUnconfirmed] = useState(false)
  const [blocked, setBlocked] = useState('')   // '' | 'offline' | 'blocked'
  const [studentReset, setStudentReset] = useState(false)

  /** Moving between the three forms clears whatever the last attempt said. */
  const go = (next) => {
    setMode(next)
    setNotice('')
    setBlocked('')
    setUnconfirmed(false)
    setStudentReset(false)
  }

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    setBlocked('')
    setStudentReset(false)

    try {
      if (mode === 'reset') {
        // A child's login name is not an address, and the address the app makes
        // out of it belongs to nobody. Mailing it would look like it worked.
        if (!canReceiveMail(email)) {
          setStudentReset(true)
          return
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: resetRedirectUrl()
        })
        if (error) throw error

        // The same answer whether or not that address has an account: this form
        // must not tell a stranger who is registered here.
        setNotice(t('reset.sent'))
      } else if (mode === 'login') {
        // A child types their first name; a teacher types an address. Both
        // arrive here, and only Supabase needs to know the difference.
        const { error } = await supabase.auth.signInWithPassword({
          email: toLoginEmail(email),
          password
        })
        if (error) throw error
        // The auth listener in AuthProvider takes it from here.
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // The database trigger reads these when it creates the profile row.
            data: { full_name: fullName, role },
            // Where the confirmation link lands. Without this Supabase uses the
            // Site URL, which is easy to leave pointing at localhost.
            emailRedirectTo: window.location.origin
          }
        })
        if (error) throw error

        if (!data.session) {
          setNotice(t('login.checkEmail'))
          setMode('login')
        }
      }
    } catch (error) {
      // A request that never left the building is not a login problem, and
      // saying "wrong password" to a child on a school network sends them
      // hunting for a mistake they did not make.
      if (isNetworkError(error)) {
        // The diagnosis has to be believed, including when it clears the
        // network. supabase-js raises AuthRetryableFetchError for any 5xx as
        // well as for a real network failure, so blaming the network on sight
        // sends a teacher hunting through firewall settings for what is
        // actually a server-side problem — a failing confirmation mail, most
        // often.
        const why = await diagnose()

        if (why === 'offline' || why === 'blocked') {
          setBlocked(why)
        } else {
          toast.error(friendlyAuthError(error.message, t))
        }
      } else {
        setUnconfirmed(/email not confirmed|email_not_confirmed/i.test(error.message))
        toast.error(friendlyAuthError(error.message, t))
      }
    } finally {
      setBusy(false)
    }
  }

  /** Send the confirmation mail again, for a link that never arrived. */
  const resend = async () => {
    setBusy(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: window.location.origin }
      })
      if (error) throw error
      setNotice(t('login.confirmationResent'))
      setUnconfirmed(false)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: 'min(460px, 100%)' }}>
        <div className="center" style={{ marginBottom: 22 }}>
          <div className="logo" style={{ justifyContent: 'center', fontSize: '1.9rem' }}>
            <Logo size={56} /> Start2Code
          </div>
          <p className="muted mt-2" style={{ fontSize: '1.05rem' }}>{t('app.tagline')}</p>
        </div>

        <div className="card">
          {!isConfigured && (
            <div className="card card-flat" style={{ background: 'var(--danger-soft)', borderColor: '#ffc9c9', marginBottom: 16 }}>
              <strong className="small">{t('login.notConnected')}</strong>
              <p className="tiny mt-2">
                Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to
                <code> .env.local</code> and restart the dev server.
              </p>
            </div>
          )}

          {mode === 'reset' ? (
            <>
              <h2 style={{ margin: '0 0 6px' }}>{t('reset.title')}</h2>
              <p className="small muted">{t('reset.intro')}</p>
            </>
          ) : (
            <div className="tabs">
              <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => go('login')}>{t('login.title')}</button>
              <button className={`tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => go('signup')}>{t('login.signup')}</button>
            </div>
          )}

          {notice && <p className="small mt-2" style={{ color: 'var(--ok)' }}>{notice}</p>}

          {studentReset && (
            <div
              className="card card-flat mt-2"
              style={{ background: 'var(--zon-wash)', borderColor: '#f7d6a2' }}
              role="alert"
            >
              <strong className="small">{t('reset.studentTitle')}</strong>
              <p className="tiny mt-2">{t('reset.studentBody')}</p>
            </div>
          )}

          {blocked && (
            <div
              className="card card-flat mt-2"
              style={{ background: 'var(--danger-soft)', borderColor: '#ffc9c9' }}
              role="alert"
            >
              <strong className="small">
                {blocked === 'offline' ? t('login.offlineTitle') : t('login.blockedTitle')}
              </strong>
              <p className="tiny mt-2">
                {blocked === 'offline' ? t('login.offlineBody') : t('login.blockedBody')}
              </p>
              {blocked === 'blocked' && (
                <p className="tiny mt-2">
                  {t('login.blockedHost')} <code>{supabaseHost()}</code>
                </p>
              )}
            </div>
          )}

          <form onSubmit={submit} className="col" style={{ gap: 14 }}>
            {mode === 'signup' && (
              <label className="field">
                {t('login.yourName')}
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('login.namePlaceholder')} required />
              </label>
            )}

            <label className="field">
              {mode === 'signup' ? t('login.email') : t('login.emailOrName')}
              <input
                /* Text, not email, outside sign-up: a child types a first name,
                   and browser validation would reject it before the form has a
                   chance to explain who can help them. */
                type={mode === 'signup' ? 'email' : 'text'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'signup' ? t('login.emailPlaceholder') : t('login.emailOrNamePlaceholder')}
                required
                autoComplete={mode === 'signup' ? 'email' : 'username'}
                autoCapitalize="none"
                spellCheck={false}
              />
            </label>

            {mode !== 'reset' && (
              <label className="field">
                {t('login.password')}
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')} required minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </label>
            )}

            {mode === 'signup' && (
              <label className="field">
                {t('login.iAm')}
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="student">{t('login.student')}</option>
                  <option value="teacher">{t('login.teacher')}</option>
                </select>
              </label>
            )}

            <button className="btn btn-lg btn-block" type="submit" disabled={busy || !isConfigured}>
              {busy
                ? t('common.oneMoment')
                : mode === 'login' ? t('login.submitLogin')
                  : mode === 'reset' ? t('reset.send')
                    : t('login.submitSignup')}
            </button>
          </form>

          {/* Right under the password that just did not work. */}
          {mode === 'login' && (
            <button className="btn btn-quiet btn-block mt-4" onClick={() => go('reset')}>
              {t('reset.link')}
            </button>
          )}

          {mode === 'reset' && (
            <button className="btn btn-quiet btn-block mt-4" onClick={() => go('login')}>
              {t('reset.back')}
            </button>
          )}
        </div>

        {unconfirmed && (
          <div className="card card-flat mt-4" style={{ background: 'var(--zon-wash)', borderColor: '#f7d6a2' }}>
            <p className="small">{t('login.unconfirmedHelp')}</p>
            <button className="btn btn-block mt-4" onClick={resend} disabled={busy || !email}>
              {t('login.resend')}
            </button>
          </div>
        )}

        <p className="tiny muted center mt-4">
          {t('login.joinHint')}
        </p>

        {/* Reachable before logging in — a child who cannot read the interface
            has to be able to change it from here. */}
        <div className="row mt-4" style={{ justifyContent: 'center' }}>
          <LanguagePicker compact />
        </div>
      </div>
    </div>
  )
}

function friendlyAuthError(message, t) {
  // Supabase answers 500 "Error sending confirmation email" when its SMTP
  // settings are wrong. The account is usually created anyway, so the useful
  // thing to say is that the mail failed, not that the sign-up did.
  if (/sending (confirmation|recovery)?\s*email|smtp/i.test(message)) {
    return t('login.errorMailFailed')
  }
  // Supabase says "Email not confirmed" for an account that never clicked the
  // link. Reporting that as a wrong password sends people hunting for a
  // password that is perfectly correct.
  if (/email not confirmed|email_not_confirmed/i.test(message)) return t('login.errorUnconfirmed')
  if (/only request this (once )?(after|every)|rate limit|too many requests/i.test(message)) {
    return t('login.errorTooSoon')
  }
  if (/invalid login credentials/i.test(message)) return t('login.errorCredentials')
  if (/already registered/i.test(message)) return t('login.errorExists')
  if (/password should be/i.test(message)) return t('login.errorPassword')
  return message
}
