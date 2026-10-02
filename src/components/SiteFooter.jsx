import { Link } from 'react-router-dom'

import { legalTitles } from '../content/legal'
import { site } from '../lib/site'
import { useI18n } from '../i18n'

/**
 * The footer that carries the business details and the legal links.
 *
 * Belgian law wants a trader's identity reachable from every page rather than
 * buried, and a privacy policy nobody can find protects nobody. So this sits on
 * the login screen, on the legal pages and under the app itself.
 */
export default function SiteFooter() {
  const { lang } = useI18n()

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <nav aria-label={legalTitles(lang).length ? 'Legal' : undefined}>
          <ul className="site-footer-links">
            {legalTitles(lang).map(({ path, title }) => (
              <li key={path}><Link to={path}>{title}</Link></li>
            ))}
          </ul>
        </nav>

        <p className="tiny muted mt-4">
          {[site.legalName, site.address, site.companyNumber].filter(Boolean).join(' · ')}
          {' · '}
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
      </div>
    </footer>
  )
}
