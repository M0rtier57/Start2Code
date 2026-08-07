import { useI18n } from '../i18n'

/**
 * Language switcher.
 *
 * A plain <select> on purpose: it is one tap on a tablet, needs no open/close
 * state, and is readable to a child who cannot yet read the interface.
 */
export default function LanguagePicker({ compact = false }) {
  const { lang, setLang, languages, t } = useI18n()

  return (
    <select
      value={lang}
      onChange={(event) => setLang(event.target.value)}
      aria-label={t('common.language')}
      title={t('common.language')}
      style={{
        width: 'auto',
        padding: compact ? '5px 8px' : '8px 10px',
        fontSize: compact ? '0.82rem' : '0.9rem',
        fontWeight: 600,
        cursor: 'pointer'
      }}
    >
      {languages.map((item) => (
        <option key={item.id} value={item.id}>
          {item.flag} {item.label}
        </option>
      ))}
    </select>
  )
}
