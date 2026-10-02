/**
 * The legal documents, in the reader's language, with the business details
 * filled in.
 *
 * The texts are written with {placeholders} rather than hard-coded addresses,
 * so a change of address is one edit in src/lib/site.js and never a hunt
 * through six documents in two languages.
 */
import { dpa, site } from '../../lib/site'
import { legalNl } from './nl'
import { legalEn } from './en'

const BY_LANG = { nl: legalNl, en: legalEn }

/** Which URL shows which document. The paths are Dutch; the site is Dutch. */
export const LEGAL_ROUTES = {
  '/privacy': 'privacy',
  '/voorwaarden': 'terms',
  '/cookies': 'cookies',
  '/terugbetaling': 'refund',
  '/toegankelijkheid': 'accessibility',
  '/licenties': 'licenses',
  '/gegevens-verwijderen': 'deletion'
}

export const LEGAL_PATHS = Object.keys(LEGAL_ROUTES)

const VALUES = {
  name: site.name,
  legalName: site.legalName,
  email: site.email,
  appUrl: site.appUrl,
  parentUrl: site.parentUrl,
  // An empty detail would read as a gap in a sentence, so it says so instead.
  // The page also carries a warning banner while any of these is missing.
  address: site.address || '[adres nog in te vullen]',
  companyNumber: site.companyNumber || '[ondernemingsnummer nog in te vullen]',
  dataRegion: site.dataRegion || '[regio nog na te kijken]',
  dpaName: dpa.name,
  dpaAddress: dpa.address,
  dpaUrl: dpa.url
}

function fill(text) {
  return String(text).replace(/\{(\w+)\}/g, (whole, key) =>
    key in VALUES ? VALUES[key] : whole
  )
}

/** One document, translated and filled in. Falls back to Dutch, the original. */
export function legalDoc(key, lang) {
  const doc = BY_LANG[lang]?.[key] ?? BY_LANG.nl[key]
  if (!doc) return null

  return {
    title: fill(doc.title),
    intro: fill(doc.intro),
    sections: doc.sections.map((section) => ({
      h: fill(section.h),
      p: (section.p ?? []).map(fill),
      list: (section.list ?? []).map(fill)
    }))
  }
}

/** The titles, for a list of links. */
export function legalTitles(lang) {
  return Object.entries(LEGAL_ROUTES).map(([path, key]) => ({
    path,
    key,
    title: legalDoc(key, lang).title
  }))
}
