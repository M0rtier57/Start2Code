import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Modal, useToast } from '../components/ui'
import { exportMyData, deleteMyAccount } from '../lib/api'
import { downloadJson } from '../lib/download'
import { useAuth } from '../lib/AuthContext'
import { site } from '../lib/site'
import { useI18n } from '../i18n'

/**
 * Seeing everything we hold, and getting rid of it.
 *
 * Both of these are rights under the GDPR, and both are supposed to be easy.
 * Making someone write an email to exercise a right they are entitled to is a
 * way of hoping they will not bother, so they are buttons.
 */
export default function MyData() {
  const { user, profile, displayName, signOut } = useAuth()
  const { t } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()

  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')

  const download = async () => {
    setBusy(true)
    try {
      const everything = await exportMyData(user.id)
      downloadJson(everything, `start2code-mijn-gegevens-${new Date().toISOString().slice(0, 10)}.json`)
      toast.success(t('mydata.downloaded'))
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  /** Typing the account name is the one brake on a button that cannot be undone. */
  const expected = (profile?.full_name || displayName || '').trim()
  const canDelete = typed.trim().toLowerCase() === expected.toLowerCase() && expected.length > 0

  const remove = async () => {
    setBusy(true)
    try {
      await deleteMyAccount()
      // The account is gone; the session that is left points at nothing.
      await signOut()
      navigate('/', { replace: true })
    } catch (error) {
      toast.error(error.message)
      setBusy(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <h1>{t('mydata.title')}</h1>
      <p className="muted mt-2">{t('mydata.intro')}</p>

      {/* ------------------------------------------------------------ see */}
      <section className="card mt-6">
        <h2 style={{ fontSize: '1.2rem' }}>{t('mydata.whatTitle')}</h2>
        <p className="small mt-2">{t('mydata.whatBody')}</p>
        <ul className="small mt-2" style={{ paddingLeft: 22, lineHeight: 1.7 }}>
          <li>{t('mydata.itemAccount')}</li>
          <li>{t('mydata.itemProjects')}</li>
          <li>{t('mydata.itemProgress')}</li>
          <li>{t('mydata.itemReviews')}</li>
          <li>{t('mydata.itemActivity')}</li>
        </ul>

        <button className="btn mt-4" onClick={download} disabled={busy}>
          {busy ? t('common.oneMoment') : t('mydata.download')}
        </button>
        <p className="tiny muted mt-2">{t('mydata.downloadNote')}</p>
      </section>

      {/* --------------------------------------------------------- delete */}
      <section className="card mt-4" style={{ borderColor: '#f9c3bf' }}>
        <h2 style={{ fontSize: '1.2rem' }}>{t('mydata.deleteTitle')}</h2>
        <p className="small mt-2">{t('mydata.deleteBody')}</p>

        <button
          className="btn btn-danger mt-4"
          onClick={() => { setTyped(''); setConfirming(true) }}
          disabled={busy}
        >
          {t('mydata.deleteButton')}
        </button>
      </section>

      <p className="tiny muted mt-6">
        {t('mydata.help')} <a href={`mailto:${site.email}`}>{site.email}</a>
      </p>

      {confirming && (
        <Modal title={t('mydata.confirmTitle')} onClose={() => setConfirming(false)}>
          <p className="small">{t('mydata.confirmBody')}</p>

          <label className="field mt-4">
            {t('mydata.confirmLabel', { name: expected })}
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoFocus
            />
          </label>

          <div className="row mt-4" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>
              {t('common.cancel')}
            </button>
            <button className="btn btn-danger" onClick={remove} disabled={busy || !canDelete}>
              {busy ? t('common.oneMoment') : t('mydata.confirmButton')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
