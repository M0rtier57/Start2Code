import { useState } from 'react'

import { Modal, useToast } from './ui'
import { createLabel, deleteLabel, setLabelOnProjects, updateLabel } from '../lib/api'
import { useI18n } from '../i18n'

/**
 * The teacher's private labels.
 *
 * Nothing in this file ever reaches a child: the rows live in tables that row
 * level security locks to the teacher who made them (supabase/teacher-labels.sql).
 * The screens that use these say so out loud, because a teacher deciding whether
 * to write "rommel" on a seven-year-old's project is entitled to know who reads it.
 */

/** Names are the data; the look is in index.css (.label-chip-<name>). */
export const LABEL_COLORS = ['grey', 'teal', 'sun', 'coral', 'sky', 'grape']

export function LabelChip({ label, onRemove }) {
  const { t } = useI18n()

  return (
    <span className={`label-chip label-chip-${label.color}`}>
      {label.name}
      {onRemove && (
        <button
          type="button"
          className="label-chip-x"
          onClick={onRemove}
          aria-label={t('lbl.removeFrom', { name: label.name })}
        >×</button>
      )}
    </span>
  )
}

/** A row of colour dots. Picking is by colour name, and the name is announced. */
function ColorPicker({ value, onChange }) {
  const { t } = useI18n()

  return (
    <div className="row" role="radiogroup" aria-label={t('lbl.color')} style={{ gap: 6 }}>
      {LABEL_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={t(`lbl.color.${color}`)}
          className={`color-dot color-dot-${color} ${value === color ? 'selected' : ''}`}
          onClick={() => onChange(color)}
        />
      ))}
    </div>
  )
}

/** Make a new label. Used by both modals, so there is one place that does it. */
function NewLabelForm({ onCreated }) {
  const { t } = useI18n()
  const toast = useToast()
  const [name, setName] = useState('')
  const [color, setColor] = useState('teal')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!name.trim()) return

    setBusy(true)
    try {
      onCreated(await createLabel({ name, color }))
      setName('')
    } catch (error) {
      // The unique index on (teacher, lower(name)) is what says no here.
      toast.error(/duplicate|unique/i.test(error.message) ? t('lbl.exists') : error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="col" style={{ gap: 10 }}>
      <label className="field">
        {t('lbl.newName')}
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('lbl.newPlaceholder')}
          maxLength={40}
        />
      </label>

      <div className="row-between wrap">
        <ColorPicker value={color} onChange={setColor} />
        <button className="btn btn-sm" type="submit" disabled={busy || !name.trim()}>
          {t('lbl.create')}
        </button>
      </div>
    </form>
  )
}

/**
 * Tick labels on or off for one project. Every tick is saved as it happens —
 * a dialog that asks you to press "Save" after sorting forty projects is a
 * dialog that loses your sorting when you press Escape.
 */
export function LabelPickerModal({ project, labels, active, onToggle, onLabelCreated, onClose }) {
  const { t } = useI18n()
  const toast = useToast()
  const [busyId, setBusyId] = useState(null)

  const toggle = async (label) => {
    const on = !active.has(label.id)
    setBusyId(label.id)
    try {
      await setLabelOnProjects([project.id], label.id, on)
      onToggle(project.id, label.id, on)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusyId(null)
    }
  }

  // A label made here is for this project, or why would you be here?
  const created = async (label) => {
    onLabelCreated(label)
    try {
      await setLabelOnProjects([project.id], label.id, true)
      onToggle(project.id, label.id, true)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Modal title={t('lbl.pickTitle', { title: project.title })} onClose={onClose}>
      <p className="tiny muted">🔒 {t('lbl.private')}</p>

      {labels.length === 0 ? (
        <p className="small muted mt-4">{t('lbl.none')}</p>
      ) : (
        <ul className="label-list mt-4">
          {labels.map((label) => (
            <li key={label.id}>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={active.has(label.id)}
                  disabled={busyId === label.id}
                  onChange={() => toggle(label)}
                />
                <LabelChip label={label} />
              </label>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6" style={{ fontSize: '0.98rem' }}>{t('lbl.newTitle')}</h3>
      <div className="mt-2"><NewLabelForm onCreated={created} /></div>
    </Modal>
  )
}

/** Rename, recolour, delete. Deleting a label takes it off every project. */
export function ManageLabelsModal({ labels, usage, onChanged, onCreated, onDeleted, onClose }) {
  const { t } = useI18n()
  const toast = useToast()

  const save = async (label, patch) => {
    try {
      onChanged(await updateLabel(label.id, patch))
    } catch (error) {
      toast.error(/duplicate|unique/i.test(error.message) ? t('lbl.exists') : error.message)
    }
  }

  const remove = async (label) => {
    const n = usage.get(label.id) ?? 0
    if (!window.confirm(t('lbl.confirmDelete', { name: label.name, count: n }))) return
    try {
      await deleteLabel(label.id)
      onDeleted(label.id)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Modal title={t('lbl.manageTitle')} onClose={onClose} wide>
      <p className="tiny muted">🔒 {t('lbl.private')}</p>

      {labels.length === 0 && <p className="small muted mt-4">{t('lbl.none')}</p>}

      <div className="col mt-4" style={{ gap: 12 }}>
        {labels.map((label) => (
          <div key={label.id} className="row wrap" style={{ gap: 12 }}>
            <input
              defaultValue={label.name}
              maxLength={40}
              aria-label={t('lbl.rename', { name: label.name })}
              style={{ maxWidth: 220 }}
              onBlur={(event) => {
                const next = event.target.value.trim()
                if (!next) { event.target.value = label.name; return }
                if (next !== label.name) save(label, { name: next })
              }}
            />
            <ColorPicker value={label.color} onChange={(color) => save(label, { color })} />
            <span className="tiny muted grow">{t('lbl.usedOn', { count: usage.get(label.id) ?? 0 })}</span>
            <button className="btn btn-quiet btn-sm" onClick={() => remove(label)}>
              {t('common.delete')}
            </button>
          </div>
        ))}
      </div>

      <h3 className="mt-6" style={{ fontSize: '0.98rem' }}>{t('lbl.newTitle')}</h3>
      <div className="mt-2"><NewLabelForm onCreated={onCreated} /></div>
    </Modal>
  )
}
