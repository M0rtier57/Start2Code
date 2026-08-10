import { useCallback, useEffect, useMemo, useState } from 'react'
import { saveProgress } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { useCurriculum } from '../lib/CurriculumContext'
import { evaluateCheck, normaliseStep } from '../curriculum/checks'
import { ProgressBar } from './ui'
import { useI18n } from '../i18n'

/**
 * The step-by-step guide shown beside both editors.
 *
 * Steps come in two kinds:
 *   - checkable — the workspace reports what the child actually built and the
 *     box ticks itself;
 *   - judgement — things no program can assess ("change the colour and see what
 *     happens"), which the child ticks by hand.
 *
 * Hand-ticked steps live in localStorage (per-device detail); the total count
 * goes to the database so teachers can see it.
 */
export default function LessonPanel({ track, lesson, facts, onCheck, checking, onPickLesson, onClose }) {
  const { user } = useAuth()
  const { nextLesson } = useCurriculum()
  const { t, pick } = useI18n()

  const storageKey = user && lesson ? `s2c:steps:${user.id}:${lesson.id}` : null

  // Ticked steps are read straight from storage rather than loaded in an
  // effect, so switching lesson never renders the previous lesson's ticks.
  const stored = useMemo(() => readSteps(storageKey), [storageKey])
  const [edited, setEdited] = useState(null)
  const manual = edited && edited.key === storageKey ? edited.steps : stored

  // Built-in lessons carry { nl: [...], en: [...] }; custom ones a plain array.
  const rawSteps = lesson ? (pick(lesson.steps) || []) : []
  const steps = rawSteps.map(normaliseStep)

  // A checkable step is ticked by the evidence, not by the child. Everything
  // else falls back to whatever they ticked themselves.
  const auto = useMemo(() => {
    const set = new Set()
    steps.forEach((step, index) => {
      if (evaluateCheck(step.check, facts) === true) set.add(index)
    })
    return set
  }, [steps, facts])

  const done = useMemo(() => new Set([...manual, ...auto]), [manual, auto])
  const checkable = steps.some((step) => step.check)

  /*
   * Only hand-ticked steps are written to localStorage. Automatic ones are
   * recomputed from the work every time, so deleting the while loop unticks its
   * step again — a box that stayed ticked after the code was removed would be
   * lying to both the child and their teacher.
   */
  const rememberManual = useCallback((nextManual) => {
    if (!storageKey) return
    localStorage.setItem(storageKey, JSON.stringify([...nextManual]))
  }, [storageKey])

  // The database only stores the totals, so it is kept in step with whatever
  // the child can currently see ticked, however it got there.
  const total = steps.length
  const completed = done.size

  useEffect(() => {
    if (!user || !lesson || total === 0) return

    // A short delay keeps a burst of changes (a run that ticks four steps at
    // once) down to a single write.
    const timer = setTimeout(() => {
      saveProgress({
        userId: user.id,
        track,
        lessonId: lesson.id,
        completedSteps: completed,
        totalSteps: total
      }).catch((error) => console.warn('Could not save progress:', error.message))
    }, 600)

    return () => clearTimeout(timer)
  }, [completed, total, user, lesson, track])

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
    // An automatic step is not the child's to tick; the code decides.
    if (steps[index]?.check) return

    const next = new Set(manual)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setEdited({ key: storageKey, steps: next })
    rememberManual(next)
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
        {/* Scratch cannot report changes as they happen, so the child asks.
            Python reports itself every time the program runs. */}
        {checkable && onCheck && (
          <button className="btn btn-ok btn-block" style={{ marginBottom: 12 }} onClick={onCheck} disabled={checking}>
            {checking ? t('common.loading') : t('lesson.checkWork')}
          </button>
        )}

        {steps.map((step, index) => {
          const isAuto = Boolean(step.check)
          const isDone = done.has(index)
          return (
            <button
              key={index}
              className={`step ${isDone ? 'done' : ''} ${isAuto ? 'step-auto' : ''}`}
              onClick={() => toggle(index)}
              aria-pressed={isDone}
              title={isAuto ? t('lesson.autoStep') : undefined}
            >
              <span className="step-check">{isDone ? '✓' : ''}</span>
              <span>
                <span dangerouslySetInnerHTML={{ __html: renderStep(step.text) }} />
                {isAuto && (
                  <span className="step-auto-tag" title={t('lesson.autoStep')}>
                    {isDone ? t('lesson.autoDone') : t('lesson.autoPending')}
                  </span>
                )}
              </span>
            </button>
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
