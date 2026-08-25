import { useCallback, useEffect, useMemo, useState } from 'react'
import { getProgressFor, saveProgress } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { useCurriculum } from '../lib/CurriculumContext'
import { ProgressBar } from './ui'
import { useI18n } from '../i18n'

/**
 * The step-by-step guide shown beside both editors.
 *
 * Ticked steps are written to the database, not just localStorage: a teacher
 * needs to see which steps a child has done, and the ticks should survive the
 * child moving to another computer. localStorage stays as an instant local
 * cache so the panel never renders empty while the row loads.
 *
 * When the work has been marked, the teacher's note for a step is shown right
 * underneath it — which is where a child is actually looking.
 */
export default function LessonPanel({ track, lesson, review, onPickLesson, onClose }) {
  const { user } = useAuth()
  const { nextLesson } = useCurriculum()
  const { t, pick } = useI18n()

  const storageKey = user && lesson ? `s2c:steps:${user.id}:${lesson.id}` : null

  // Ticked steps are read straight from storage rather than loaded in an
  // effect, so switching lesson never renders the previous lesson's ticks.
  const stored = useMemo(() => readSteps(storageKey), [storageKey])
  const [edited, setEdited] = useState(null)
  const [fromServer, setFromServer] = useState(null)

  // The saved row wins once it arrives, so ticks follow the child between
  // devices; until then the local cache keeps the panel filled in.
  const base = fromServer && fromServer.key === storageKey ? fromServer.steps : stored
  const done = edited && edited.key === storageKey ? edited.steps : base

  useEffect(() => {
    let active = true
    if (!user || !lesson) return undefined

    getProgressFor(user.id, track, lesson.id)
      .then((row) => {
        if (!active || !row) return
        const saved = Array.isArray(row.steps_done) ? row.steps_done : []
        setFromServer({ key: `s2c:steps:${user.id}:${lesson.id}`, steps: new Set(saved) })
      })
      .catch(() => {})

    return () => { active = false }
  }, [user, lesson, track])

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
        totalSteps: (pick(lesson.steps) || []).length,
        stepsDone: [...nextDone]
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
        {steps.map((step, index) => {
          const note = review?.step_feedback?.[String(index)]
          return (
            <div key={index}>
              <button
                className={`step ${done.has(index) ? 'done' : ''}`}
                onClick={() => toggle(index)}
                aria-pressed={done.has(index)}
                style={note ? { marginBottom: 0 } : undefined}
              >
                <span className="step-check">{done.has(index) ? '✓' : ''}</span>
                <span dangerouslySetInnerHTML={{ __html: renderStep(step) }} />
              </button>

              {note && (
                <div className="step-note">
                  <strong>{t('review.teacherSays')}</strong>
                  <div>{note}</div>
                </div>
              )}
            </div>
          )
        })}

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
