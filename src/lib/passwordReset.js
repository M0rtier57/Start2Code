/**
 * The "I forgot my password" road.
 *
 * Supabase mails a link, and that link arrives with a working session attached.
 * It therefore has to land somewhere that asks for a new password rather than
 * dropping into the dashboard with the forgotten password still in place. That
 * somewhere is this path, and both the screen that sends the mail and the
 * screen that answers it agree on it here.
 */
import { STUDENT_DOMAIN, looksLikeUsername } from './studentAccounts'

export const RESET_PATH = '/nieuw-wachtwoord'

export function resetRedirectUrl() {
  return window.location.origin + RESET_PATH
}

/**
 * Children log in with a first name, which the app turns into an address on a
 * domain nobody owns. A reset mail sent there goes nowhere at all, so it is
 * better not to send one and to say who can help instead.
 */
export function canReceiveMail(value) {
  const typed = String(value).trim().toLowerCase()
  if (!typed || looksLikeUsername(typed)) return false
  return !typed.endsWith(`@${STUDENT_DOMAIN}`)
}
