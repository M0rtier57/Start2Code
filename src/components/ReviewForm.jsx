import { useState } from 'react'

import { useToast } from './ui'
import { useAuth } from '../lib/AuthContext'
import { deleteReview, saveReview } from '../lib/api'
import { useI18n } from '../i18n'

/**
 * Marking a project: pass or fail, an optional score, and feedback.
 *
 * Feedback is required on a fail. "Needs work" with no explanation gives a
 * child nothing to act on, which is the whole point of the exercise.
 */
export default function ReviewForm({ project, review, onSaved }) {
  const { user } = useAuth()
  const toast = useToast()
  const { t } = useI18n()

  const [verdict, setVerdict] = useState(review?.verdict ?? 'pass')
  const [score, setScore] = useState(review?.score ?? '')
  const [feedback, setFeedback] = useState(review?.feedback ?? '')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()

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
        feedback
      })
      toast.success(t('review.saved'))
      onSaved?.(saved)
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
      onSaved?.(null)
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="card card-flat mt-4"
      style={{ background: '#fafbfd' }}
    >
      <h3>{t('review.title')}</h3>

      {/* Verdict — two big targets rather than a dropdown; this is the
          decision the teacher came here to make. */}
      <div className="row mt-4" style={{ gap: 10 }}>
        <button
          type="button"
          onClick={() => setVerdict('pass')}
          className={`btn ${verdict === 'pass' ? '' : 'btn-ghost'}`}
          style={verdict === 'pass'
            ? { background: 'linear-gradient(135deg, #ffd75e, #e6a817)', color: '#4a3200', flex: 1 }
            : { flex: 1 }}
        >
          🏆 {t('review.pass')}
        </button>

        <button
          type="button"
          onClick={() => setVerdict('fail')}
          className={`btn ${verdict === 'fail' ? 'btn-danger' : 'btn-ghost'}`}
          style={{ flex: 1 }}
        >
          ✎ {t('review.fail')}
        </button>
      </div>

      <div className="row mt-4 wrap" style={{ alignItems: 'flex-start' }}>
        <label className="field" style={{ width: 190 }}>
          {t('review.score')}
          <input
            type="number"
            min="0"
            max="100"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="—"
          />
        </label>
        <p className="tiny muted" style={{ flex: 1, paddingTop: 26 }}>{t('review.scoreHint')}</p>
      </div>

      <label className="field mt-4">
        {t('review.feedback')}
        <textarea
          rows={4}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={verdict === 'pass' ? t('review.feedbackPass') : t('review.feedbackFail')}
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
      </label>

      <div className="row mt-4" style={{ justifyContent: 'flex-end' }}>
        {review && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={clear} disabled={busy}>
            {t('review.remove')}
          </button>
        )}
        <button type="submit" className="btn" disabled={busy}>
          {busy ? t('common.saving') : t('review.save')}
        </button>
      </div>
    </form>
  )
}

/** The verdict badge, shown wherever a reviewed project appears. */
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
