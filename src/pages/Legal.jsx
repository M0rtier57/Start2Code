import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

import Logo from '../components/Logo'
import SiteFooter from '../components/SiteFooter'
import { LEGAL_ROUTES, legalDoc } from '../content/legal'
import { site, siteDetailsComplete } from '../lib/site'
import { useI18n } from '../i18n'

/**
 * One renderer for all the legal documents.
 *
 * These pages are reachable without logging in, on purpose: somebody deciding
 * whether to trust this site with their child's data should not have to make an
 * account first to read what happens to it.
 */
export default function Legal() {
  const { pathname } = useLocation()
  const { lang, t } = useI18n()

  const doc = legalDoc(LEGAL_ROUTES[pathname], lang)

  // A screen reader announces the new page from its title, and the browser tab
  // is how people find a policy back among twenty open tabs.
  useEffect(() => {
    if (!doc) return
    const previous = document.title
    document.title = `${doc.title} — ${site.name}`
    return () => { document.title = previous }
  }, [doc])

  if (!doc) return null

  return (
    <div style={{ minHeight: '100%', background: 'var(--page)' }}>
      <a className="skip-link" href="#main">{t('nav.skipToContent')}</a>

      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Logo /> {site.name}
          </Link>
        </div>
      </header>

      <main id="main" className="page" style={{ maxWidth: 760 }}>
        <h1>{doc.title}</h1>

        <p className="muted mt-2">
          {t('legal.updated', { date: site.legalUpdated })}
          {lang !== 'nl' && ` · ${t('legal.dutchGoverns')}`}
        </p>

        {/* Better a visible gap than a document that quietly pretends to be
            finished: an unnamed controller is not a lawful privacy notice. */}
        {!siteDetailsComplete && (
          <div
            className="card card-flat mt-4"
            style={{ background: 'var(--warn-soft)', borderColor: '#f5d78e' }}
            role="alert"
          >
            <strong className="small">{t('legal.draftTitle')}</strong>
            <p className="tiny mt-2">{t('legal.draftBody')}</p>
          </div>
        )}

        <p className="mt-4" style={{ fontSize: '1.05rem' }}>{doc.intro}</p>

        {doc.sections.map((section) => (
          <section key={section.h} className="mt-6">
            <h2 style={{ fontSize: '1.2rem' }}>{section.h}</h2>
            {section.p.map((paragraph) => (
              <p key={paragraph} className="mt-2">{paragraph}</p>
            ))}
            {section.list.length > 0 && (
              <ul className="mt-2" style={{ paddingLeft: 22, lineHeight: 1.6 }}>
                {section.list.map((item) => <li key={item} className="mt-2">{item}</li>)}
              </ul>
            )}
          </section>
        ))}

        <p className="muted small mt-6">
          {t('legal.questions')} <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
      </main>

      <SiteFooter />
    </div>
  )
}
