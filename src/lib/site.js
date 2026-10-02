/**
 * Who runs this site, and what it does with data.
 *
 * ──────────────────────────────────────────────────────────────────────────
 *  EVERYTHING MARKED "TODO" MUST BE FILLED IN BEFORE THE SITE IS PUBLIC.
 *
 *  A privacy policy that does not name a real, reachable controller is not a
 *  privacy policy. Until these are filled in, the legal pages show a visible
 *  warning instead of pretending to be complete.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Every legal page, every footer and every email template reads from here, so
 * an address only ever has to change in one place.
 */

export const site = {
  /** The name people see. */
  name: 'Start2Code',

  /** The legal entity behind it. */
  legalName: 'CodeLab',

  /** TODO — street, number, postcode, town. Required on every legal page. */
  address: '',

  /** TODO — Belgian ondernemingsnummer, e.g. "BE 0123.456.789". */
  companyNumber: '',

  /** Where people reach a human. This mailbox must actually be read. */
  email: 'contact@codelab.be',

  /**
   * TODO — only if you want one on the legal pages. A phone number is not
   * required when email is answered within a reasonable time.
   */
  phone: '',

  /** The sites involved. */
  appUrl: 'https://code.codelab.be',
  parentUrl: 'https://codelab.be',

  /**
   * TODO — verify in Supabase (Project Settings → General → Region) and write
   * the real region here. Naming the wrong country in a privacy policy is
   * worse than naming none.
   */
  dataRegion: '',

  /**
   * When the legal texts were last changed. Bump by hand when you edit them —
   * people are entitled to see whether what they agreed to has moved.
   */
  legalUpdated: '2026-10-02'
}

/** True when the legal pages can honestly claim to be complete. */
export const siteDetailsComplete = Boolean(
  site.address && site.companyNumber && site.dataRegion
)

/**
 * Children here are under 13, so they cannot lawfully consent on their own
 * behalf (GDPR art. 8 — Belgium sets the digital age of consent at 13). Their
 * accounts are made by the teacher, who acts with the school's authority, and
 * the public sign-up form is for adults only.
 *
 * Flip this to true only if that changes, and read the note in COMPLIANCE.md
 * before you do.
 */
export const ALLOW_STUDENT_SELF_SIGNUP = false

/** Belgium's supervisory authority, named on the privacy page as required. */
export const dpa = {
  name: 'Gegevensbeschermingsautoriteit',
  address: 'Drukpersstraat 35, 1000 Brussel',
  url: 'https://www.gegevensbeschermingsautoriteit.be',
  email: 'contact@apd-gba.be'
}
