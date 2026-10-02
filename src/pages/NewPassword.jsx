import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Logo from '../components/Logo'
import LanguagePicker from '../components/LanguagePicker'
import { LoadingScreen, useToast } from '../components/ui'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { useI18n } from '../i18n'

/**
 * Where the mailed reset link lands.
 *
 * The link signs the account in on arrival, which is what makes changing the
 * password possible without knowing the old one — and also why this screen sits
 * in front of the dashboard instead of behind it.
 */
export default function NewPassword() {
  const { session, loading } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)

  // Supabase reports a link it would not accept in the fragment, and clears it
  // again once it has looked. Reading it during the first render — before the
  // provider's asynchronous start-up has finished — is what catches it.
  const [linkError] = useState(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const query = new URLSearchParams(window.location.search)
    return hash.get('error_description') || query.get('error_description') ||
      hash.get('error') || query.get('error') || ''
  })

  const submit = async (event) => {
    event.preventDefault()

    if (password !== repeat) {
      toast.error(t('reset.mismatch'))
      return
    }

    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      toast.success(t('reset.done'))
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingScreen label={t('common.loading')} />

  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: 'min(460px, 100%)' }}>
        <div className="center" style={{ marginBottom: 22 }}>
          <div className="logo" style={{ justifyContent: 'center', fontSize: '1.9rem' }}>
            <Logo size={56} /> Start2Code
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t('reset.newTitle')}</h2>

          {!session ? (
            // No session means the link was used already, or it expired, or it
            // was opened in a browser that mangled it on the way.
            <>
              <div
                className="card card-flat"
                style={{ background: 'var(--danger-soft)', borderColor: '#ffc9c9' }}
                role="alert"
              >
                <strong className="small">{t('reset.expiredTitle')}</strong>
                <p className="tiny mt-2">{t('reset.expiredBody')}</p>
                {linkError && <p className="tiny mt-2 muted"><code>{linkError}</code></p>}
              </div>

              <button className="btn btn-block mt-4" onClick={() => navigate('/', { replace: true })}>
                {t('reset.backToLogin')}
              </button>
            </>
          ) : (
            <>
              <p className="small muted">
                {t('reset.forAccount', { email: session.user.email })}
              </p>

              <form onSubmit={submit} className="col mt-4" style={{ gap: 14 }}>
                <label className="field">
                  {t('reset.newPassword')}
                  <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('login.passwordPlaceholder')} required minLength={6}
                    autoComplete="new-password" autoFocus
                  />
                </label>

                <label className="field">
                  {t('reset.repeatPassword')}
                  <input
                    type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)}
                    placeholder={t('login.passwordPlaceholder')} required minLength={6}
                    autoComplete="new-password"
                  />
                </label>

                <button className="btn btn-lg btn-block" type="submit" disabled={busy}>
                  {busy ? t('common.oneMoment') : t('reset.save')}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="row mt-4" style={{ justifyContent: 'center' }}>
          <LanguagePicker compact />
        </div>
      </div>
    </div>
  )
}
