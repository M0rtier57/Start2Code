import { useEffect, useRef, useState } from 'react'

import { MAIN_FILE, fileNameProblem, normalizeFileName } from '../lib/projectFiles'
import { useI18n } from '../i18n'

/**
 * The tabs above the code: main.py, then any extra files the program imports.
 *
 * main.py is the one Run starts and it cannot be renamed or removed. The others
 * are ordinary modules, so a file called functies.py is used from main.py with
 * "from functies import *".
 */
export default function FileTabs({ extras, active, onSelect, onAdd, onRemove, readOnly }) {
  const { t } = useI18n()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [problem, setProblem] = useState(null)
  const input = useRef(null)

  useEffect(() => { if (adding) input.current?.focus() }, [adding])

  const submit = (event) => {
    event.preventDefault()
    const full = normalizeFileName(name)
    const why = fileNameProblem(full, extras)
    if (why) { setProblem(why); return }

    onAdd(full)
    setAdding(false)
    setName('')
    setProblem(null)
  }

  const cancel = () => { setAdding(false); setName(''); setProblem(null) }

  return (
    <div className="file-tabs" role="tablist" aria-label={t('file.tabs')}>
      {[MAIN_FILE, ...extras.map((file) => file.name)].map((file) => (
        <span key={file} className={`file-tab ${file === active ? 'active' : ''}`}>
          <button
            role="tab"
            aria-selected={file === active}
            className="file-tab-name"
            onClick={() => onSelect(file)}
            title={file === MAIN_FILE ? t('file.main') : undefined}
          >
            {file === MAIN_FILE ? '▶ ' : ''}{file}
          </button>

          {file !== MAIN_FILE && !readOnly && (
            <button
              className="file-tab-x"
              onClick={() => onRemove(file)}
              aria-label={t('file.remove', { name: file })}
            >×</button>
          )}
        </span>
      ))}

      {!readOnly && !adding && (
        <button className="file-tab-add" onClick={() => setAdding(true)} title={t('file.hint')}>
          + {t('file.add')}
        </button>
      )}

      {adding && (
        <form className="file-tab-form" onSubmit={submit}>
          <input
            ref={input}
            value={name}
            onChange={(event) => { setName(event.target.value); setProblem(null) }}
            onKeyDown={(event) => { if (event.key === 'Escape') cancel() }}
            placeholder={t('file.placeholder')}
            aria-label={t('file.name')}
            aria-invalid={Boolean(problem)}
            maxLength={30}
            spellCheck={false}
            autoComplete="off"
          />
          <button type="submit" className="btn btn-sm">{t('file.create')}</button>
          <button type="button" className="btn btn-dark btn-sm" onClick={cancel}>{t('common.cancel')}</button>
          {problem && <span className="file-tab-problem" role="alert">{t(problem)}</span>}
        </form>
      )}
    </div>
  )
}
