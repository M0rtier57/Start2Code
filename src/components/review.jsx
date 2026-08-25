import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useToast } from './ui'
import { useAuth } from '../lib/AuthContext'
import { deleteReview, saveReview } from '../lib/api'
import { timeAgo } from './ui'
import { useI18n } from '../i18n'

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
  const { t } = useI18n()

  const [verdict, setVerdict] = useState(review?.verdict ?? 'pass')
  const [score, setScore] = useState(review?.score ?? '')
  const [feedback, setFeedback] = useState(review?.feedback ?? '')
  const [busy, setBusy] = useState(false)

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
        feedback
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
    <aside className="lesson-panel">
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
          <span style={label}>{t('review.feedback')}</span>
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
