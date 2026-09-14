/**
 * Making a whole class of accounts at once.
 *
 * A child should not need an email address. They log in with their first name
 * and a password, and the app turns that name into an address behind the
 * scenes: "Emma" becomes emma@leerling.start2code.app. Nothing is ever sent
 * there — the domain exists only to give Supabase Auth the shape it insists on,
 * and is deliberately one nobody owns.
 *
 * That mapping is a plain function of the name, so logging in needs no lookup:
 * the child types "emma", the app asks Supabase about emma@… and that is that.
 * The price is that first names have to be unique across the whole site, so a
 * second Emma is created as "emma2" and the teacher is shown the name to hand
 * out.
 *
 * Accounts are made with the ordinary public sign-up — the same call the
 * "Create account" tab makes — so this needs no service_role key and no server.
 * The one thing it does need is **Confirm email switched off** in Supabase:
 * a confirmation mail to a domain that does not exist can never be answered.
 */
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'
import { resilientFetch, supabase } from './supabaseClient'

export const STUDENT_DOMAIN = 'leerling.start2code.app'

/** How many "emma2, emma3…" to try before giving up on a name. */
const MAX_SUFFIX = 30

/** Supabase counts sign-ups per IP; a small gap keeps a class under the limit. */
const PAUSE_MS = 350

/**
 * A first name as it will appear in the login box: accents folded, spaces
 * joined up, everything else dropped. "Sofie De Wit" -> "sofie-de-wit".
 */
export function toUsername(name) {
  return String(name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // é -> e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function usernameToEmail(username) {
  return `${toUsername(username)}@${STUDENT_DOMAIN}`
}

/** Anything without an @ is a child's login name rather than an address. */
export function looksLikeUsername(value) {
  return !String(value).includes('@')
}

/** Turn what was typed in the login box into something Supabase understands. */
export function toLoginEmail(value) {
  const trimmed = String(value).trim()
  return looksLikeUsername(trimmed) ? usernameToEmail(trimmed) : trimmed.toLowerCase()
}

/**
 * One name per line, blank lines and stray commas ignored, duplicates dropped.
 */
export function parseNames(text) {
  const seen = new Set()

  return String(text)
    .split(/[\n,;]+/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter((line) => {
      if (!line) return false
      const key = toUsername(line)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

/**
 * A password a seven-year-old can copy off a slip of paper: two short words and
 * two digits, no letters that look like each other.
 */
const WORDS = [
  'appel', 'ballon', 'boom', 'bloem', 'draak', 'fiets', 'giraf', 'hond', 'kat',
  'konijn', 'maan', 'muis', 'panda', 'pinguin', 'raket', 'robot', 'ster',
  'tijger', 'vlinder', 'wolk', 'zon', 'zebra'
]

export function makePassword() {
  const pick = () => WORDS[Math.floor(Math.random() * WORDS.length)]
  return `${pick()}${Math.floor(10 + Math.random() * 90)}`
}

/**
 * Sign-up replaces whoever is logged in, which would throw the teacher out of
 * their own dashboard halfway through the class. This client keeps nothing and
 * writes nothing to storage, so the teacher's session is never touched.
 */
function throwawayClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    // Same detour round a blocked network as the main client takes.
    global: { fetch: resilientFetch }
  })
}

/**
 * Supabase hides "that address is taken" from anonymous callers to stop people
 * fishing for who has an account: instead of an error it returns a user with no
 * identities attached. Both shapes mean the same thing here.
 */
function alreadyTaken(data, error) {
  if (error) return /already registered|already exists|already been registered/i.test(error.message)
  return Boolean(data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Create an account per name and put each one in the class.
 *
 * Reports per name rather than failing as a batch: a class where two children
 * hit a snag should still leave the teacher with the other twenty-three.
 *
 * @param names      the first names, as typed
 * @param classId    the class they join, or null for none
 * @param password   one password for everybody, or null to generate one each
 * @param onProgress called after every name with the row just finished
 */
export async function createStudentAccounts({ names, classId, password = null, onProgress }) {
  const auth = throwawayClient()
  const results = []

  for (const name of names) {
    const row = await createOne(auth, name, password, classId)
    results.push(row)
    onProgress?.(row, results.length, names.length)
    await pause(PAUSE_MS)
  }

  return results
}

async function createOne(auth, name, sharedPassword, classId) {
  const base = toUsername(name)
  if (!base) return { name, status: 'error', message: 'notAName' }

  const secret = sharedPassword || makePassword()

  for (let attempt = 1; attempt <= MAX_SUFFIX; attempt += 1) {
    const username = attempt === 1 ? base : `${base}${attempt}`

    let data, error
    try {
      ({ data, error } = await auth.auth.signUp({
        email: usernameToEmail(username),
        password: secret,
        options: { data: { full_name: name, role: 'student' } }
      }))
    } catch (err) {
      return { name, status: 'error', message: err.message }
    }

    if (alreadyTaken(data, error)) continue     // this Emma is not that Emma
    if (error) return { name, status: 'error', message: error.message }

    // No session means Supabase wants the address confirmed, and this address
    // can never confirm anything. Worth stopping over rather than quietly
    // producing accounts that nobody can log in to.
    if (!data.session && !data.user?.email_confirmed_at) {
      return { name, username, password: secret, status: 'unconfirmed' }
    }

    const joined = classId ? await addToClass(data.user.id, classId) : null

    return {
      name,
      username,
      password: secret,
      status: 'created',
      message: joined || undefined,
      userId: data.user.id
    }
  }

  return { name, status: 'error', message: 'tooManySameName' }
}

/**
 * The teacher's own session does this, not the child's: the class_members
 * policy lets a teacher add anybody to a class they own.
 */
async function addToClass(studentId, classId) {
  const { error } = await supabase
    .from('class_members')
    .insert({ class_id: classId, student_id: studentId })

  return error ? error.message : null
}

/** The handout: one line per child, ready to paste into a document. */
export function asText(rows) {
  return rows
    .filter((row) => row.status === 'created')
    .map((row) => `${row.name}\t${row.username}\t${row.password}`)
    .join('\n')
}

export function asCsv(rows) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

  return ['naam,login,wachtwoord']
    .concat(rows
      .filter((row) => row.status === 'created')
      .map((row) => [row.name, row.username, row.password].map(escape).join(',')))
    .join('\n')
}
