import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { acknowledge, noticeSeen } from '../lib/consent'
import { useI18n } from '../i18n'

/**
 * Tells people what this site keeps in their browser.
 *
 * Deliberately not a wall: it sits at the bottom, the page stays usable behind
 * it, and the one button does exactly what it says. There is no "Accept all"
 * shouting next to a grey "Manage preferences", because there is nothing to
 * manage — see src/lib/consent.js for why.
 */
export default function CookieNotice() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const button = useRef(null)

  // Reading storage during render would make the first paint differ between a
  // normal window and a private one, so it happens after mounting.
  useEffect(() => { setOpen(!noticeSeen()) }, [])

  useEffect(() => { if (open) button.current?.focus() }, [open])

  if (!open) return null

  const dismiss = () => {
    acknowledge()
    setOpen(false)
  }

  return (
    <div className="cookie-notice" role="region" aria-label={t('cookies.noticeTitle')}>
      <div className="cookie-notice-inner">
        <div>
          <strong className="small">{t('cookies.noticeTitle')}</strong>
          <p className="tiny mt-2">
            {t('cookies.noticeBody')}{' '}
            <Link to="/cookies">{t('cookies.noticeLink')}</Link>
          </p>
        </div>

        <button ref={button} className="btn" onClick={dismiss}>
          {t('cookies.noticeOk')}
        </button>
      </div>
    </div>
  )
}
