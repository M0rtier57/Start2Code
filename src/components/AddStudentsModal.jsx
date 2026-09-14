import { useMemo, useState } from 'react'

import { useI18n } from '../i18n'
import { downloadText } from '../lib/download'
import {
  asCsv, asText, createStudentAccounts, makePassword, parseNames, toUsername
} from '../lib/studentAccounts'
import { Modal, useToast } from './ui'

/**
 * Making a class's worth of accounts in one go.
 *
 * Two steps, deliberately: type the names and see exactly what will be made,
 * then the list of logins to hand out. The passwords are shown once and are not
 * recoverable afterwards — Supabase stores them hashed — so the second step
 * pushes hard towards saving or printing them.
 */
export default function AddStudentsModal({ klass, onClose, onCreated }) {
  const { t } = useI18n()
  const toast = useToast()

  const [text, setText] = useState('')
  const [shared, setShared] = useState(true)
  const [password, setPassword] = useState(makePassword())
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(null)   // { done, total }
  const [results, setResults] = useState(null)

  const names = useMemo(() => parseNames(text), [text])
  const tooShort = shared && password.trim().length < 6

  const create = async () => {
    setBusy(true)
    setProgress({ done: 0, total: names.length })

    try {
      const rows = await createStudentAccounts({
        names,
        classId: klass?.id ?? null,
        password: shared ? password.trim() : null,
        onProgress: (_row, done, total) => setProgress({ done, total })
      })

      setResults(rows)
      if (rows.some((row) => row.status === 'created')) onCreated?.()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  /* ------------------------------------------------------------- the result */
  if (results) {
    const made = results.filter((row) => row.status === 'created')
    const unconfirmed = results.filter((row) => row.status === 'unconfirmed')
    const failed = results.filter((row) => row.status === 'error')

    return (
      <Modal title={t('bulk.doneTitle', { count: made.length })} onClose={onClose} wide>
        {made.length > 0 && (
          <>
            <p className="small" style={{ color: 'var(--ok)' }}>{t('bulk.keepThem')}</p>

            <div className="card card-pad-0 table-scroll mt-4" style={{ maxHeight: 320 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('bulk.colName')}</th>
                    <th>{t('bulk.colLogin')}</th>
                    <th>{t('bulk.colPassword')}</th>
                  </tr>
                </thead>
                <tbody>
                  {made.map((row) => (
                    <tr key={row.username}>
                      <td>{row.name}</td>
                      <td><code>{row.username}</code></td>
                      <td><code>{row.password}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="row mt-4 wrap">
              <button
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  await navigator.clipboard?.writeText(asText(made))
                  toast.success(t('bulk.copied'))
                }}
              >
                {t('bulk.copyList')}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => downloadText(asCsv(made), `${klass?.name || 'klas'}-logins.csv`)}
              >
                {t('bulk.downloadCsv')}
              </button>
            </div>
          </>
        )}

        {unconfirmed.length > 0 && (
          <div className="card card-flat mt-4" style={{ background: 'var(--danger-soft)', borderColor: '#ffc9c9' }}>
            <strong className="small">{t('bulk.confirmOnTitle')}</strong>
            <p className="tiny mt-2">{t('bulk.confirmOnBody')}</p>
          </div>
        )}

        {failed.length > 0 && (
          <div className="mt-4">
            <p className="small muted">{t('bulk.failedTitle')}</p>
            <ul className="tiny muted">
              {failed.map((row, index) => (
                <li key={index}>{row.name} — {describe(row.message, t)}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="row mt-4" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>{t('common.close')}</button>
        </div>
      </Modal>
    )
  }

  /* --------------------------------------------------------------- the form */
  return (
    <Modal
      title={t('bulk.title', { name: klass?.name ?? '' })}
      onClose={busy ? undefined : onClose}
      wide
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>{t('common.cancel')}</button>
          <button className="btn" onClick={create} disabled={busy || !names.length || tooShort}>
            {busy
              ? t('bulk.making', { done: progress?.done ?? 0, total: progress?.total ?? names.length })
              : t('bulk.make', { count: names.length })}
          </button>
        </>
      }
    >
      <p className="small muted">{t('bulk.intro')}</p>

      <label className="field mt-4">
        <span>{t('bulk.names')}</span>
        <textarea
          className="input"
          rows={8}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={'Emma\nNoah\nSofie'}
          disabled={busy}
        />
      </label>

      <label className="row small mt-2" style={{ gap: 8 }}>
        <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} disabled={busy} />
        {t('bulk.onePassword')}
      </label>

      {shared ? (
        <label className="field mt-2">
          <span>{t('bulk.password')}</span>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
            />
            <button className="btn btn-ghost btn-sm" onClick={() => setPassword(makePassword())} disabled={busy}>
              {t('bulk.another')}
            </button>
          </div>
          {tooShort && <span className="tiny" style={{ color: 'var(--danger)' }}>{t('bulk.tooShort')}</span>}
        </label>
      ) : (
        <p className="tiny muted mt-2">{t('bulk.eachOwn')}</p>
      )}

      {names.length > 0 && (
        <div className="card card-flat mt-4">
          <p className="tiny muted">{t('bulk.preview')}</p>
          <p className="small mt-2">
            {names.slice(0, 8).map((name) => <code key={name} style={{ marginRight: 8 }}>{toUsername(name)}</code>)}
            {names.length > 8 && <span className="muted">+{names.length - 8}</span>}
          </p>
        </div>
      )}
    </Modal>
  )
}

/** Two failures are ours to explain; the rest come back from Supabase as they are. */
function describe(message, t) {
  if (message === 'notAName') return t('bulk.notAName')
  if (message === 'tooManySameName') return t('bulk.tooManySameName')
  return message
}
