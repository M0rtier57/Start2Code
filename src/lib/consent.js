/**
 * What the site is allowed to store, and whether the visitor has been told.
 *
 * Right now this site stores nothing that needs permission. Everything in the
 * browser is strictly necessary — the login session, the chosen language, the
 * ticked lesson steps — and ePrivacy does not require consent for that. It does
 * require that people are told, which is what the notice does.
 *
 * So this is deliberately a notice and not a consent wall. Putting an
 * "Accept all / Reject all" choice in front of children for storage that cannot
 * be refused without breaking the login would be theatre, and theatre that
 * teaches children their choices are fake is worse than none.
 *
 * The category machinery below exists for the day something optional is added —
 * analytics, an embedded video. On that day: add the category, default it to
 * false, and gate the loading on `allows('analytics')`. Nothing else changes.
 */

const KEY = 's2c:cookie-notice'

/** Bump when the storage list changes materially — the notice shows again. */
const VERSION = 1

/**
 * Optional categories, by name. Empty on purpose: this site has none.
 * A category must default to false, or asking is meaningless.
 */
export const OPTIONAL_CATEGORIES = []

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    // Private mode, or storage switched off. Then we cannot remember that the
    // notice was shown either, which is a nuisance and not a breakage.
    return null
  }
}

/** Has this person seen the current version of the storage notice? */
export function noticeSeen() {
  return read()?.version === VERSION
}

export function acknowledge(choices = {}) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      version: VERSION,
      at: new Date().toISOString(),
      choices
    }))
  } catch { /* nothing to do, and nothing worth breaking the page over */ }
}

/**
 * May we use storage for this purpose?
 *
 * 'necessary' is always true — refusing it would mean refusing to log in.
 * Anything else is false until it is both offered and chosen.
 */
export function allows(category) {
  if (category === 'necessary') return true
  if (!OPTIONAL_CATEGORIES.includes(category)) return false
  return read()?.choices?.[category] === true
}

/** For the "withdraw my choice" link on the cookie page. */
export function forget() {
  try { localStorage.removeItem(KEY) } catch { /* fine */ }
}
