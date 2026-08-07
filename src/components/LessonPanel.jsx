import { useCallback, useMemo, useState } from 'react'
import { saveProgress } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { useCurriculum } from '../lib/CurriculumContext'
import { ProgressBar } from './ui'
import { useI18n } from '../i18n'

/**
 * The step-by-step guide shown beside both editors.
 *
 * Which individual steps are ticked is kept in localStorage (it is per-device
 * detail), while the count is written to the database so teachers can see it.
 */
export default function LessonPanel({ track, lesson, onPickLesson, onClose }) {
  const { user } = useAuth()
  const { nextLesson } = useCurriculum()
  const { t, pick } = useI18n()

  const storageKey = user && lesson ? `s2c:steps:${user.id}:${lesson.id}` : null

  // Ticked steps are read straight from storage rather than loaded in an
  // effect, so switching lesson never renders the previous lesson's ticks.
  const stored = useMemo(() => readSteps(storageKey), [storageKey])
  const [edited, setEdited] = useState(null)
  const done = edited && edited.key === storageKey ? edited.steps : stored

  // Built-in lessons carry { nl: [...], en: [...] }; custom ones a plain array.
  const steps = lesson ? (pick(lesson.steps) || []) : []

  const persist = useCallback(async (nextDone) => {
    if (!storageKey || !user || !lesson) return
    localStorage.setItem(storageKey, JSON.stringify([...nextDone]))
    try {
      await saveProgress({
        userId: user.id,
        track,
        lessonId: lesson.id,
        completedSteps: nextDone.size,
        totalSteps: (pick(lesson.steps) || []).length
      })
    } catch (error) {
      console.warn('Could not save progress:', error.message)
    }
  }, [storageKey, user, lesson, track, pick])

  if (!lesson) {
    return (
      <aside className="lesson-panel">
        <div className="head row-between">
          <strong>{t('lesson.freePlay')}</strong>
          {onClose && <button className="btn btn-quiet btn-sm" onClick={onClose}>✕</button>}
        </div>
        <div className="body">
          <p className="small muted">
            {t('lesson.freePlaySub')}
          </p>
          {onPickLesson && (
            <button className="btn btn-dark btn-block mt-4" onClick={onPickLesson}>
              {t('lesson.chooseLesson')}
            </button>
          )}
        </div>
      </aside>
    )
  }

  const toggle = (index) => {
    const next = new Set(done)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setEdited({ key: storageKey, steps: next })
    persist(next)
  }

  const finished = done.size >= steps.length
  const upcoming = nextLesson(track, lesson.id)

  return (
    <aside className="lesson-panel">
      <div className="head">
        <div className="row-between">
          <strong>{pick(lesson.title)}</strong>
          {onClose && <button className="btn btn-quiet btn-sm" onClick={onClose} aria-label={t('lesson.hide')}>✕</button>}
        </div>
        <p className="small muted mt-2">{pick(lesson.blurb)}</p>
        <div className="mt-4">
          <ProgressBar value={done.size} total={steps.length} tone={finished ? 'ok' : ''} />
          <p className="tiny muted mt-2">
            {t('lesson.stepsDone', { done: done.size, total: steps.length })} · {t('common.minutes', { minutes: lesson.minutes })}
          </p>
        </div>
      </div>

      <div className="body">
        {steps.map((step, index) => (
          <button
            key={index}
            className={`step ${done.has(index) ? 'done' : ''}`}
            onClick={() => toggle(index)}
            aria-pressed={done.has(index)}
          >
            <span className="step-check">{done.has(index) ? '✓' : ''}</span>
            <span dangerouslySetInnerHTML={{ __html: renderStep(step) }} />
          </button>
        ))}

        {finished && (
          <div className="card card-flat mt-4" style={{ background: '#1b2a20', borderColor: '#2f5c3a', color: '#c3f0cd' }}>
            <strong>{t('lesson.complete')}</strong>
            <p className="small mt-2">{t('lesson.completeSub')}</p>
            {upcoming && onPickLesson && (
              <button className="btn btn-ok btn-block mt-4" onClick={() => onPickLesson(upcoming)}>
                {t('lesson.next', { title: pick(upcoming.title) })}
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

function readSteps(storageKey) {
  if (!storageKey) return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey) ?? '[]'))
  } catch {
    return new Set()
  }
}

/**
 * Steps may contain `code spans`. The text comes from our own curriculum
 * files, never from users, so this is safe to inject — but escape first so a
 * stray < in a future lesson cannot break the markup.
 */
function renderStep(step) {
  const escaped = step
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped.replace(/`([^`]+)`/g, '<code>$1</code>')
}
