import { useEffect, useRef } from 'react'

import { useI18n } from '../i18n'

/**
 * The output pane under the Python editor.
 *
 * Entries arrive as many small writes (print emits the text and the newline
 * separately), so they are rendered as a single flowing text run per stream
 * rather than one line per message.
 */
export default function Console({ entries, running, onClear, height, onResizeStart }) {
  const { t } = useI18n()
  const scroller = useRef(null)
  const pinned = useRef(true)

  // Follow new output, but stop fighting the user if they scrolled up to read.
  useEffect(() => {
    const el = scroller.current
    if (el && pinned.current) el.scrollTop = el.scrollHeight
  }, [entries])

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }

  return (
    <div className="console" style={{ height }}>
      <div
        onMouseDown={onResizeStart}
        style={{ height: 6, cursor: 'row-resize', background: 'transparent', flexShrink: 0, marginTop: -6 }}
        title="Drag to resize"
      />
      <div className="console-head">
        <span>{t('console.title')}</span>
        {running && <span className="badge badge-brand">{t('console.running')}</span>}
        <span className="spacer" style={{ flex: 1 }} />
        <button className="btn btn-quiet btn-sm" onClick={onClear}>{t('console.clear')}</button>
      </div>

      <div className="console-out" ref={scroller} onScroll={onScroll}>
        {entries.length === 0 && (
          <span className="console-empty">{t('console.empty')}</span>
        )}
        {entries.map((entry, index) => (
          <span key={index} className={entry.stream === 'err' ? 'err' : entry.stream === 'sys' ? 'sys' : ''}>
            {entry.text}
          </span>
        ))}
      </div>
    </div>
  )
}
