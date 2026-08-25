/**
 * What state is a piece of work in?
 *
 * Derived from two timestamps rather than a status column, so the states cannot
 * contradict each other:
 *
 *   draft    — never handed in; the child's own business
 *   waiting  — handed in, and not marked since
 *   passed   — marked as good, and unchanged since
 *   failed   — marked as needing work, waiting for the child to correct it
 *
 * Handing corrected work in again simply moves submitted_at past the review's
 * timestamp, which puts it back in the teacher's queue. Nothing has to be reset.
 */
export function submissionState(project, review) {
  if (!project?.submitted_at) return review ? 'draft-reviewed' : 'draft'

  // ISO timestamps compare correctly as plain strings.
  const markedAfterSubmission = review && review.updated_at >= project.submitted_at
  if (!markedAfterSubmission) return 'waiting'

  return review.verdict === 'pass' ? 'passed' : 'failed'
}

/** True when the child still has something to do about it. */
export function needsAttention(state) {
  return state === 'failed'
}

/** Can this be handed in right now? */
export function canSubmit(state) {
  return state === 'draft' || state === 'draft-reviewed' || state === 'failed'
}

/** Badge styling for each state. */
export const STATE_STYLE = {
  draft: 'badge',
  'draft-reviewed': 'badge',
  waiting: 'badge badge-brand',
  passed: 'badge badge-gold',
  failed: 'badge badge-danger'
}

/** Translation key for each state. */
export const STATE_KEY = {
  draft: 'submit.draft',
  'draft-reviewed': 'submit.draft',
  waiting: 'submit.waiting',
  passed: 'review.passed',
  failed: 'review.failed'
}
