import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'

const url = SUPABASE_URL
const anonKey = SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

if (!isConfigured) {
  console.error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    '(in .env.local locally, or in your host\'s environment variables for a deployed build).'
  )
}

/* -------------------------------------------------------------------------- */
/* Getting through a network that blocks Supabase                             */
/*                                                                            */
/* School and guest networks often filter *.supabase.co. The site itself is on
 * its own domain and loads fine, so the app appears to work right up to the
 * moment it needs the database, and then nothing does.
 *
 * public/sb/proxy.php hands those requests on from our own domain. It is not
 * used unless it is needed: every request goes straight to Supabase first, and
 * only a failure at the network level — the request never reached a server, as
 * opposed to a server saying no — makes the app look for the proxy. Once it has
 * found it, the rest of the tab's requests take that road directly.
 *
 * The proxy has to prove itself before being trusted with anything: a host
 * where it was never installed answers /sb/ping with the app's own index.html,
 * and quietly feeding HTML to the client instead of JSON would be a far more
 * confusing failure than the blocked network it was meant to fix.
 */
const PROXY_BASE = '/sb'
const REMEMBER_KEY = 's2c-use-proxy'

let useProxy = false
let checking = null

try {
  useProxy = window.sessionStorage?.getItem(REMEMBER_KEY) === '1'
} catch {
  useProxy = false   // private mode, or storage switched off
}

function remember() {
  useProxy = true
  try { window.sessionStorage?.setItem(REMEMBER_KEY, '1') } catch { /* not important */ }
}

function viaProxy(target) {
  if (!target.startsWith(url)) return null
  return window.location.origin + PROXY_BASE + target.slice(url.length)
}

/** A request that never reached a server, as opposed to one that was refused. */
function isNetworkFailure(error) {
  return error instanceof TypeError ||
    /failed to fetch|networkerror|load failed|network request failed/i.test(String(error?.message || error))
}

/** Is the proxy actually there? Asked once, and never again in this tab. */
async function proxyIsInstalled() {
  if (checking) return checking

  checking = (async () => {
    try {
      const response = await fetch(`${PROXY_BASE}/ping?at=${Date.now()}`, { cache: 'no-store' })
      if (!response.ok) return false

      // An uninstalled proxy is answered by the single-page-app rewrite, which
      // returns index.html with a perfectly healthy 200.
      const body = await response.json().catch(() => null)
      return body?.proxy === 'ok'
    } catch {
      return false
    }
  })()

  return checking
}

/** Exported so any other client made from this app takes the same detour. */
export async function resilientFetch(input, init) {
  const target = typeof input === 'string' ? input : input.url

  if (useProxy) {
    const detour = viaProxy(target)
    if (detour) return fetch(detour, init)
  }

  try {
    return await fetch(input, init)
  } catch (error) {
    const detour = isNetworkFailure(error) ? viaProxy(target) : null
    if (!detour || !(await proxyIsInstalled())) throw error

    const response = await fetch(detour, init)
    remember()
    return response
  }
}

/*
 * createClient throws if the url is empty, and it runs while this module is
 * being imported — before React has rendered anything. A missing variable would
 * therefore produce a blank white page with no clue as to why. Falling back to a
 * syntactically valid placeholder keeps the app booting far enough to render the
 * setup screen that explains what to do; `isConfigured` is what the UI checks.
 */
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: { persistSession: true, autoRefreshToken: true },
    global: { fetch: resilientFetch }
  }
)

/** For the login screen, which explains a blocked network differently. */
export function isUsingProxy() {
  return useProxy
}
