import { useState } from 'react'
import { supabase, isConfigured } from '../lib/supabaseClient'
import { toLoginEmail } from '../lib/studentAccounts'
import Logo from '../components/Logo'
import LanguagePicker from '../components/LanguagePicker'
import { useToast } from '../components/ui'
import { useI18n } from '../i18n'

export default function Login() {
  const toast = useToast()
  const { t } = useI18n()
  const [mode, setMode] = useState('login')      // login | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('student')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setNotice('')

    try {
      if (mode === 'login') {
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
          // The database trigger reads these when it creates the profile row.
          options: { data: { full_name: fullName, role } }
        })
        if (error) throw error

        if (!data.session) {
          setNotice(t('login.checkEmail'))
          setMode('login')
        }
      }
    } catch (error) {
      toast.error(friendlyAuthError(error.message, t))
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

          <div className="tabs">
            <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>{t('login.title')}</button>
            <button className={`tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')}>{t('login.signup')}</button>
          </div>

          {notice && <p className="small mt-2" style={{ color: 'var(--ok)' }}>{notice}</p>}

          <form onSubmit={submit} className="col" style={{ gap: 14 }}>
            {mode === 'signup' && (
              <label className="field">
                {t('login.yourName')}
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('login.namePlaceholder')} required />
              </label>
            )}

            <label className="field">
              {mode === 'login' ? t('login.emailOrName') : t('login.email')}
              <input
                type={mode === 'login' ? 'text' : 'email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === 'login' ? t('login.emailOrNamePlaceholder') : t('login.emailPlaceholder')}
                required
                autoComplete={mode === 'login' ? 'username' : 'email'}
                autoCapitalize="none"
                spellCheck={false}
              />
            </label>

            <label className="field">
              {t('login.password')}
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')} required minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>

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
              {busy ? t('common.oneMoment') : mode === 'login' ? t('login.submitLogin') : t('login.submitSignup')}
            </button>
          </form>
        </div>

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
  if (/invalid login credentials/i.test(message)) return t('login.errorCredentials')
  if (/already registered/i.test(message)) return t('login.errorExists')
  if (/password should be/i.test(message)) return t('login.errorPassword')
  return message
}
