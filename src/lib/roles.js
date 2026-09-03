/**
 * Every role Start2Code knows about, in one place.
 *
 * Adding a role is meant to be a two-line job: add an entry here, add its two
 * labels to `src/i18n/nl.js` and `src/i18n/en.js`, and run
 * `supabase/roles.sql` so the database accepts the new value. The admin panel,
 * the sign-up form and the permission checks all read this list, so nothing
 * else has to change.
 *
 *   teaches     sees the Classes tab and other people's work
 *   admins      sees the Admin tab and may change anyone's role
 *   selfSignup  may be picked on the sign-up form; the rest are granted by an
 *               admin, so nobody can hand themselves a role that sees more
 */
export const ROLES = [
  { id: 'student', teaches: false, admins: false, selfSignup: true },
  { id: 'parent',  teaches: false, admins: false, selfSignup: true },
  { id: 'tester',  teaches: false, admins: false, selfSignup: false },
  { id: 'teacher', teaches: true,  admins: false, selfSignup: true },
  { id: 'admin',   teaches: true,  admins: true,  selfSignup: false }
]

/** What a profile without a usable role counts as. Matches the database default. */
export const DEFAULT_ROLE = 'student'

export const ROLE_IDS = ROLES.map((role) => role.id)

export const SIGNUP_ROLES = ROLES.filter((role) => role.selfSignup)

export function isKnownRole(id) {
  return ROLE_IDS.includes(id)
}

/** Always returns a role, so an unknown value from the database cannot crash a page. */
export function roleOf(id) {
  return ROLES.find((role) => role.id === id) ?? ROLES.find((role) => role.id === DEFAULT_ROLE)
}

export function canTeach(id) {
  return roleOf(id).teaches
}

export function canAdminister(id) {
  return roleOf(id).admins
}

/**
 * Role names are stored lowercase because they mostly appear mid-sentence
 * ("je bent leerling"). Lists and dropdowns want them capitalised.
 */
export function roleLabel(t, id, { plural = false, capital = false } = {}) {
  const label = t(plural ? `role.${id}.plural` : `role.${id}`)
  return capital ? label.charAt(0).toUpperCase() + label.slice(1) : label
}
