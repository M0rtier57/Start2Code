import { useState } from 'react'
import { supabase, isConfigured } from '../lib/supabaseClient'
import { useToast } from '../components/ui'

export default function Login() {
  const toast = useToast()
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
        const { error } = await supabase.auth.signInWithPassword({ email, password })
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
          setNotice('Almost there! Check your email and click the confirmation link, then log in.')
          setMode('login')
        }
      }
    } catch (error) {
      toast.error(friendlyAuthError(error.message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: 'min(430px, 100%)' }}>
        <div className="center" style={{ marginBottom: 22 }}>
          <div className="logo" style={{ justifyContent: 'center', fontSize: '1.4rem' }}>
            <span className="logo-mark">&lt;/&gt;</span> Start2Code
          </div>
          <p className="muted mt-2">Learn to code with blocks and Python.</p>
        </div>

        <div className="card">
          {!isConfigured && (
            <div className="card card-flat" style={{ background: 'var(--danger-soft)', borderColor: '#ffc9c9', marginBottom: 16 }}>
              <strong className="small">Not connected to Supabase</strong>
              <p className="tiny mt-2">
                Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to
                <code> .env.local</code> and restart the dev server.
              </p>
            </div>
          )}

          <div className="tabs">
            <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>Log in</button>
            <button className={`tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')}>Create account</button>
          </div>

          {notice && <p className="small mt-2" style={{ color: 'var(--ok)' }}>{notice}</p>}

          <form onSubmit={submit} className="col" style={{ gap: 14 }}>
            {mode === 'signup' && (
              <label className="field">
                Your name
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Sam Peeters" required />
              </label>
            )}

            <label className="field">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.be" required autoComplete="email" />
            </label>

            <label className="field">
              Password
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters" required minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </label>

            {mode === 'signup' && (
              <label className="field">
                I am a…
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </label>
            )}

            <button className="btn btn-lg btn-block" type="submit" disabled={busy || !isConfigured}>
              {busy ? 'One moment…' : mode === 'login' ? 'Log in' : 'Create my account'}
            </button>
          </form>
        </div>

        <p className="tiny muted center mt-4">
          Students join their class with a code after logging in.
        </p>
      </div>
    </div>
  )
}

function friendlyAuthError(message) {
  if (/invalid login credentials/i.test(message)) return 'That email and password do not match.'
  if (/already registered/i.test(message)) return 'That email already has an account — try logging in.'
  if (/password should be/i.test(message)) return 'Please use a password of at least 6 characters.'
  return message
}
