/**
 * Telling "the network will not let us through" apart from "wrong password".
 *
 * The app itself is served from its own domain, so it loads perfectly well on a
 * school or guest network that blocks the Supabase domain. Everything then
 * fails at the first request with the browser's own "Failed to fetch", which
 * tells a nine-year-old nothing and a teacher not much more.
 *
 * These two functions exist so the app can say which of the three it is:
 * nothing is connected, the network is blocking us, or the password is wrong.
 */
import { SUPABASE_URL } from './config'

/**
 * A request that never reached a server. Browsers word this differently —
 * Chrome "Failed to fetch", Firefox "NetworkError when attempting to fetch
 * resource", Safari "Load failed" — and Supabase wraps some of them in an
 * AuthRetryableFetchError, so the test has to be broad.
 */
export function isNetworkError(error) {
  if (!error) return false
  if (error.name === 'AuthRetryableFetchError' || error.name === 'TypeError') return true

  return /failed to fetch|networkerror|load failed|network request failed|fetch failed/i
    .test(String(error.message || error))
}

/**
 * Why the last request failed, as far as the browser will say.
 *
 *   'offline' — the device knows it has no connection
 *   'blocked' — there is a connection, but Supabase cannot be reached
 *
 * `navigator.onLine` only ever proves a negative (false really does mean no
 * network; true means little), which is exactly how it is used here: as the
 * first, cheap explanation before the more awkward one.
 */
export async function diagnose() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline'

  try {
    // no-cors: the answer cannot be read, but a blocked domain still throws,
    // and that is the whole question. Cache-busted so a stale entry cannot
    // answer for the network.
    await fetch(`${SUPABASE_URL}/auth/v1/health?ping=${Date.now()}`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store'
    })
    return 'reachable'
  } catch {
    return 'blocked'
  }
}

/** The host a network administrator would have to allow. */
export function supabaseHost() {
  try {
    return new URL(SUPABASE_URL).host
  } catch {
    return SUPABASE_URL
  }
}
