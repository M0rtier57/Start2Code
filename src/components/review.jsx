import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { timeAgo, useToast } from './ui'
import { useAuth } from '../lib/AuthContext'
import { deleteReview, getProgressFor, saveReview } from '../lib/api'
import { useCurriculum } from '../lib/CurriculumContext'
import { useI18n } from '../i18n'

/**
 * Steps may contain `code spans`. The text comes from our own curriculum files
 * or from a teacher's own lesson, never from a child — but escape first anyway.
 */
function renderStep(step) {
  const text = typeof step === 'string' ? step : (step?.text ?? '')
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped.replace(/`([^`]+)`/g, '<code>$1</code>')
}

/**
 * The verdict, score and general comment, shown to the child inside the editor.
 *
 * The per-step notes appear under their own steps, but the overall result has
 * nowhere else to live in here — without this, a child opening their marked work
 * would see the step notes and never learn whether they passed or what score
 * they got.
 */
export function ReviewSummary({ review }) {
  const { t } = useI18n()
  if (!review) return null

  const passed = review.verdict === 'pass'

  return (
    <div className={`review-summary ${passed ? 'pass' : 'fail'}`}>
      <div className="row wrap" style={{ gap: 8 }}>
        <strong>{passed ? t('review.passed') : t('review.failed')}</strong>
        {review.score != null && <span className="review-summary-score">{review.score}</span>}
      </div>

      <p className="small mt-2">{passed ? t('review.wellDone') : t('review.needsWork')}</p>

      {review.feedback && (
        <div className="review-summary-note">
          <strong>{t('review.teacherSays')}</strong>
          <div>{review.feedback}</div>
        </div>
      )}

      <p className="tiny mt-2" style={{ opacity: 0.7 }}>
        {t('review.reviewedWhen', { when: timeAgo(review.updated_at) })}
      </p>
    </div>
  )
}

/** The verdict badge, shown wherever a marked project appears. */
export function VerdictBadge({ review }) {
  const { t } = useI18n()
  if (!review) return <span className="badge">{t('review.notReviewed')}</span>

  return review.verdict === 'pass'
    ? <span className="badge badge-gold">{t('review.passed')}</span>
    : <span className="badge badge-danger">{t('review.failed')}</span>
}

/** Maps a review onto the card classes that draw the gold or red edge. */
export function reviewCardClass(review) {
  if (!review) return ''
  return review.verdict === 'pass' ? 'card-pass' : 'card-fail'
}

/**
 * Marking panel, shown inside the editor in place of the lesson steps.
 *
 * Grading happens here rather than in a dialog on the class list, because a
 * teacher has to actually look at the work — run the game, read the blocks —
 * before judging it. The panel sits beside the real project, open in the real
 * editor.
 */
export default function ReviewPanel({ project, owner, review, onReviewed }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { t, pick } = useI18n()
  const { getLesson } = useCurriculum()

  const [verdict, setVerdict] = useState(review?.verdict ?? 'pass')
  const [score, setScore] = useState(review?.score ?? '')
  const [feedback, setFeedback] = useState(review?.feedback ?? '')
  const [stepNotes, setStepNotes] = useState(review?.step_feedback ?? {})
  const [progress, setProgress] = useState(null)
  const [busy, setBusy] = useState(false)

  // The lesson this project was started from, if any — its steps are what the
  // child was asked to do, so they are what a teacher marks against.
  const lesson = getLesson(project.kind, project.lesson_id)
  const steps = lesson ? (pick(lesson.steps) || []) : []

  // Which of those steps the child ticked off.
  useEffect(() => {
    let active = true
    if (!project.lesson_id || !project.owner_id) return undefined

    getProgressFor(project.owner_id, project.kind, project.lesson_id)
      .then((row) => { if (active) setProgress(row) })
      .catch(() => {})

    return () => { active = false }
  }, [project.owner_id, project.kind, project.lesson_id])

  const ticked = new Set(Array.isArray(progress?.steps_done) ? progress.steps_done : [])
  const setNote = (index, value) =>
    setStepNotes((current) => ({ ...current, [String(index)]: value }))

  const submit = async (event) => {
    event.preventDefault()

    // "Needs work" with no explanation leaves a child with nothing to act on.
    if (verdict === 'fail' && !feedback.trim()) {
      return toast.error(t('review.feedbackRequired'))
    }

    setBusy(true)
    try {
      const saved = await saveReview({
        projectId: project.id,
        reviewerId: user.id,
        verdict,
        score,
        feedback,
        stepFeedback: stepNotes
      })
      toast.success(t('review.saved'))
      onReviewed?.(saved)
      navigate('/classes')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    setBusy(true)
    try {
      await deleteReview(project.id)
      toast.success(t('review.removed'))
      onReviewed?.(null)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  const label = { color: '#9aa3b2', fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: 6 }

  return (
    <aside className="lesson-panel review-panel">
      <div className="head">
        <div className="row-between">
          <strong>{t('review.title')}</strong>
          <button className="btn btn-quiet btn-sm" onClick={() => navigate('/classes')}>✕</button>
        </div>

        <p className="small mt-2" style={{ color: '#c9d1e0' }}>
          {owner?.full_name || owner?.email || t('review.aStudent')}
        </p>
        {project.submitted_at && (
          <p className="tiny muted mt-2">
            {t('submit.handedIn', { when: timeAgo(project.submitted_at) })}
          </p>
        )}
      </div>

      <form className="body" onSubmit={submit}>
        <p className="tiny muted" style={{ marginBottom: 14 }}>{t('review.lookFirst')}</p>

        {/* What the child was asked to do, and what they ticked. A note can
            be attached to any single step. */}
        {steps.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <span style={label}>
              {t('review.theSteps')}{' '}
              <span style={{ fontWeight: 500 }}>
                ({ticked.size}/{steps.length})
              </span>
            </span>

            {steps.map((step, index) => {
              const isDone = ticked.has(index)
              return (
                <div key={index} className={`review-step ${isDone ? 'done' : ''}`}>
                  <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                    <span className="review-step-mark">{isDone ? '✓' : '·'}</span>
                    <span
                      className="small"
                      style={{ flex: 1, opacity: isDone ? 1 : 0.65 }}
                      dangerouslySetInnerHTML={{ __html: renderStep(step) }}
                    />
                  </div>

                  <input
                    className="review-step-note"
                    value={stepNotes[String(index)] ?? ''}
                    onChange={(e) => setNote(index, e.target.value)}
                    placeholder={t('review.stepNotePlaceholder')}
                  />
                </div>
              )
            })}
          </div>
        )}

        {!lesson && (
          <p className="tiny muted" style={{ marginBottom: 18 }}>{t('review.noLesson')}</p>
        )}

        <span style={label}>{t('review.verdict')}</span>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={() => setVerdict('pass')}
            className={`btn ${verdict === 'pass' ? '' : 'btn-dark'}`}
            style={verdict === 'pass'
              ? { background: 'linear-gradient(135deg, #ffd75e, #e6a817)', color: '#4a3200', flex: 1 }
              : { flex: 1 }}
          >
            🏆 {t('review.pass')}
          </button>
          <button
            type="button"
            onClick={() => setVerdict('fail')}
            className={`btn ${verdict === 'fail' ? 'btn-danger' : 'btn-dark'}`}
            style={{ flex: 1 }}
          >
            ✎ {t('review.fail')}
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <span style={label}>{t('review.score')}</span>
          <input
            type="number"
            min="0"
            max="100"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="—"
            style={{ background: 'var(--dark-2)', borderColor: 'var(--dark-3)', color: 'var(--dark-ink)' }}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <span style={label}>{t('review.generalFeedback')}</span>
          <textarea
            rows={6}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={verdict === 'pass' ? t('review.feedbackPass') : t('review.feedbackFail')}
            style={{
              resize: 'vertical', fontFamily: 'inherit',
              background: 'var(--dark-2)', borderColor: 'var(--dark-3)', color: 'var(--dark-ink)'
            }}
          />
        </div>

        <button type="submit" className="btn btn-block mt-4" disabled={busy}>
          {busy ? t('common.saving') : t('review.saveAndBack')}
        </button>

        {review && (
          <button type="button" className="btn btn-quiet btn-block mt-2" onClick={clear} disabled={busy}>
            {t('review.remove')}
          </button>
        )}
      </form>
    </aside>
  )
}
