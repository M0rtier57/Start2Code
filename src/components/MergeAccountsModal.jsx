import { useEffect, useState } from 'react'

import { Avatar, Modal, useToast } from './ui'
import { mergeAccounts, mergePreview } from '../lib/api'
import { useI18n } from '../i18n'

/**
 * Joining two accounts belonging to the same child.
 *
 * Deliberately slow to fire: nothing happens until both accounts are chosen and
 * the counts of what will move have been fetched and shown. A merge deletes an
 * account and cannot be undone, so the last screen states plainly which one
 * disappears.
 */
export default function MergeAccountsModal({ people, onClose, onMerged }) {
  const { t } = useI18n()
  const toast = useToast()

  const [duplicateId, setDuplicateId] = useState('')
  const [keepId, setKeepId] = useState('')
  const [preview, setPreview] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const duplicate = people.find((p) => p.id === duplicateId) ?? null
  const keep = people.find((p) => p.id === keepId) ?? null
  const ready = Boolean(duplicate && keep && duplicateId !== keepId)

  // Fetch what would move as soon as both are chosen, so the admin decides with
  // the numbers in front of them.
  useEffect(() => {
    if (!ready) { setPreview(null); return undefined }

    let active = true
    mergePreview(duplicateId, keepId)
      .then((data) => {
        if (!active) return
        setPreview(data)
        // Default to what the surviving account already has.
        setName((current) => current || keep.full_name || '')
        setEmail((current) => current || keep.email || '')
      })
      .catch((error) => toast.error(error.message))

    return () => { active = false }
  }, [ready, duplicateId, keepId, keep, toast])

  const swap = () => {
    setDuplicateId(keepId)
    setKeepId(duplicateId)
  }

  const submit = async () => {
    if (!ready) return toast.error(t('merge.needBoth'))

    setBusy(true)
    try {
      const moved = await mergeAccounts({ duplicateId, keepId, name, email })
      toast.success(t('merge.done', { count: moved?.projects ?? 0 }))
      onMerged?.()
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const rows = preview
    ? [
        ['projects', preview.projects],
        ['progress', preview.progress],
        ['classes', preview.classes],
        ['activity', preview.activity],
        ['taught', preview.taught],
        ['lessons', preview.lessons],
        ['reviews', preview.reviews]
      ].filter(([, count]) => Number(count) > 0)
    : []

  return (
    <Modal title={t('merge.title')} onClose={onClose} wide>
      <p className="small muted">{t('merge.sub')}</p>

      <div className="mt-4">
        <PersonPicker
          label={t('merge.pickDuplicate')}
          people={people}
          value={duplicateId}
          exclude={keepId}
          onChange={setDuplicateId}
          tone="danger"
        />

        <div className="row mt-2" style={{ justifyContent: 'center' }}>
          <button className="btn btn-quiet btn-sm" onClick={swap} disabled={!duplicateId && !keepId}>
            {t('merge.swap')}
          </button>
        </div>

        <PersonPicker
          label={t('merge.pickKeep')}
          people={people}
          value={keepId}
          exclude={duplicateId}
          onChange={setKeepId}
          tone="ok"
        />

        <p className="tiny muted mt-2">{t('merge.pickHint')}</p>
      </div>

      {preview && (
        <>
          <h3 className="mt-6">{t('merge.whatMoves')}</h3>

          {rows.length === 0 ? (
            <p className="small muted mt-2">—</p>
          ) : (
            <div className="row wrap mt-2" style={{ gap: 8 }}>
              {rows.map(([key, count]) => (
                <span key={key} className="badge badge-brand">
                  {count} {t(`merge.${key}`)}
                </span>
              ))}
            </div>
          )}

          <p className="tiny muted mt-2">{t('merge.progressNote')}</p>

          <div className="row wrap mt-4" style={{ gap: 14, alignItems: 'flex-start' }}>
            <label className="field grow">
              {t('merge.chooseName')}
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>

            <label className="field grow">
              {t('merge.chooseEmail')}
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>
          <p className="tiny muted mt-2">{t('merge.emailHint')}</p>

          <div
            className="card card-flat mt-4"
            style={{ background: 'var(--koraal-wash)', borderColor: '#f9c3bf' }}
          >
            <p className="small" style={{ fontWeight: 700, color: 'var(--koraal-ink)' }}>
              {t('merge.warning')}
            </p>
            <p className="small mt-2">
              <strong>{duplicate.full_name || duplicate.email}</strong>
              {' → '}
              <strong>{keep.full_name || keep.email}</strong>
            </p>
          </div>

          <div className="row mt-4" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>{t('common.cancel')}</button>
            <button className="btn btn-danger" onClick={submit} disabled={busy}>
              {busy ? t('common.saving') : t('merge.confirm')}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

/** One account chooser: type to filter, click to pick. */
function PersonPicker({ label, people, value, exclude, onChange, tone }) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')

  const chosen = people.find((p) => p.id === value) ?? null
  const needle = query.trim().toLowerCase()

  const matches = needle.length < 1
    ? []
    : people
        .filter((p) => p.id !== exclude)
        .filter((p) => `${p.full_name ?? ''} ${p.email ?? ''}`.toLowerCase().includes(needle))
        .slice(0, 6)

  const border = tone === 'danger' ? 'var(--koraal)' : 'var(--accent)'

  if (chosen) {
    return (
      <div
        className="row mt-2"
        style={{
          gap: 12, padding: '12px 14px',
          border: `2px solid ${border}`, borderRadius: 'var(--radius-sm)'
        }}
      >
        <Avatar name={chosen.full_name || chosen.email} />
        <div className="grow">
          <div className="tiny muted">{label}</div>
          <div style={{ fontWeight: 700 }}>{chosen.full_name || '—'}</div>
          <div className="tiny muted">{chosen.email}</div>
        </div>
        <button className="btn btn-quiet btn-sm" onClick={() => { onChange(''); setQuery('') }}>
          {t('common.edit')}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <label className="field">
        {label}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('common.search')}
        />
      </label>

      <div className="col mt-2" style={{ gap: 6 }}>
        {matches.map((person) => (
          <button
            key={person.id}
            className="btn btn-ghost"
            style={{ justifyContent: 'flex-start', borderRadius: 'var(--radius-sm)' }}
            onClick={() => { onChange(person.id); setQuery('') }}
          >
            <Avatar name={person.full_name || person.email} />
            <span style={{ textAlign: 'left' }}>
              <span style={{ fontWeight: 700 }}>{person.full_name || '—'}</span>
              <br />
              <span className="tiny muted">{person.email}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
