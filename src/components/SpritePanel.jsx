import { useRef } from 'react'

import { Modal, useToast } from './ui'
import { ACCEPT_ATTRIBUTE } from '../lib/spriteUpload'
import { useI18n } from '../i18n'

/**
 * The sprites of one project: what is in it, what could be added, and the line
 * of code that uses each one.
 *
 * A teacher looking at a child's work sees the list but cannot change it.
 */
export default function SpritePanel({ assets, readOnly, onInsert, onClose }) {
  const { t, lang } = useI18n()
  const toast = useToast()
  const picker = useRef(null)

  const inProject = new Set(assets.list.map((asset) => asset.name))

  const chosen = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''           // the same file can be chosen again later
    if (!file) return

    const name = await assets.upload(file)
    if (name) toast.success(t('spr.uploaded', { name }))
  }

  return (
    <Modal title={t('spr.title')} onClose={onClose} wide>
      <p className="small muted">{t('spr.intro')}</p>
      <p className="tiny muted mt-2">🔒 {t('spr.privacy')}</p>

      {/* ------------------------------------------------ this project's */}
      <h3 className="mt-4" style={{ fontSize: '1rem' }}>{t('spr.mine')} ({assets.list.length})</h3>

      {assets.list.length === 0 ? (
        <p className="small muted mt-2">{t('spr.none')}</p>
      ) : (
        <ul className="sprite-grid mt-2">
          {assets.list.map((asset) => (
            <li key={asset.name} className="sprite-card">
              <div className="sprite-thumb">
                {assets.urls[asset.name]
                  ? <img src={assets.urls[asset.name]} alt="" />
                  : <span className="tiny muted">…</span>}
              </div>
              <code className="tiny">{asset.name}</code>

              {onInsert && (
                <button className="btn btn-ghost btn-sm" onClick={() => { onInsert(asset.name); onClose() }}>
                  {t('spr.insert')}
                </button>
              )}
              {!readOnly && (
                <button
                  className="btn btn-quiet btn-sm"
                  disabled={assets.busy}
                  onClick={() => { if (window.confirm(t('spr.confirmRemove', { name: asset.name }))) assets.remove(asset.name) }}
                  aria-label={t('spr.remove', { name: asset.name })}
                >🗑</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <>
          {/* ---------------------------------------------------- upload */}
          <div className="row wrap mt-4" style={{ gap: 12 }}>
            <input
              ref={picker}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              onChange={chosen}
              style={{ display: 'none' }}
              aria-hidden="true"
              tabIndex={-1}
            />
            <button className="btn" disabled={assets.busy} onClick={() => picker.current?.click()}>
              {assets.busy ? t('common.oneMoment') : `⬆ ${t('spr.upload')}`}
            </button>
            <span className="tiny muted" style={{ flex: 1, minWidth: 220 }}>{t('spr.uploadHint')}</span>
          </div>

          {/* -------------------------------------------------- library */}
          <h3 className="mt-6" style={{ fontSize: '1rem' }}>{t('spr.library')}</h3>
          <ul className="sprite-grid mt-2">
            {assets.library.map((sprite) => {
              const have = inProject.has(sprite.file)
              return (
                <li key={sprite.id} className="sprite-card">
                  <div className="sprite-thumb"><img src={sprite.url} alt="" /></div>
                  <span className="small">{sprite[lang] ?? sprite.nl}</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={have || assets.busy}
                    onClick={() => assets.addLibrary(sprite)}
                  >
                    {have ? `✓ ${t('spr.added')}` : `+ ${t('spr.add')}`}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Modal>
  )
}
