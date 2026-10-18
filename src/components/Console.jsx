import { useEffect, useRef, useState } from 'react'

import { useI18n } from '../i18n'

/**
 * The output pane under the Python editor.
 *
 * Entries arrive as many small writes (print emits the text and the newline
 * separately), so they are rendered as a single flowing text run per stream
 * rather than one line per message.
 */
function AskLine({ prompt, onAnswer }) {
  const { t } = useI18n()
  const [value, setValue] = useState('')

  return (
    <form
      className="console-ask"
      onSubmit={(event) => { event.preventDefault(); onAnswer(value) }}
    >
      <span>{prompt}</span>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label={prompt || t('console.inputLabel')}
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />
      <button type="submit" className="btn btn-sm">{t('console.send')}</button>
    </form>
  )
}

export default function Console({ entries, running, ask, onAnswer, onClear, height, onResizeStart, onContextMenu }) {
  const { t } = useI18n()
  const scroller = useRef(null)
  const pinned = useRef(true)

  // Follow new output, but stop fighting the user if they scrolled up to read.
  useEffect(() => {
    const el = scroller.current
    if (el && pinned.current) el.scrollTop = el.scrollHeight
  }, [entries, ask])

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }

  return (
    <div className="console" style={{ height }} onContextMenu={onContextMenu}>
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

        {/* input() from the program: the question and a text box, right where
            the output stopped, like a terminal. A new key per question so each
            one starts empty and takes focus. */}
        {ask && <AskLine key={ask.id} prompt={ask.prompt} onAnswer={onAnswer} />}
      </div>
    </div>
  )
}
