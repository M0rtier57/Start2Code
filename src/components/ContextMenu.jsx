import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * A small right-click menu for the parts of the app that have no menu of their
 * own — the console and the stage. Monaco and Scratch bring their own, so this
 * is deliberately plain: it only has to look like it belongs.
 *
 * @param x,y     where the click happened, in viewport coordinates
 * @param items   [{ label, onSelect }]
 * @param onClose called for every way out — a pick, Escape, a click elsewhere
 */
export default function ContextMenu({ x, y, items, onClose }) {
  const menu = useRef(null)
  const [position, setPosition] = useState({ left: x, top: y })

  // Measured after mounting rather than guessed, so a menu opened near the
  // bottom or right edge flips instead of hanging off the screen.
  useLayoutEffect(() => {
    const box = menu.current?.getBoundingClientRect()
    if (!box) return

    setPosition({
      left: Math.max(8, Math.min(x, window.innerWidth - box.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - box.height - 8))
    })
  }, [x, y])

  useEffect(() => {
    const close = () => onClose()
    const onKey = (event) => { if (event.key === 'Escape') onClose() }

    // A press inside the menu is a pick in progress. Closing on it would
    // unmount the button before its click ever lands, and the menu would look
    // like it did nothing at all. React cannot stop this from the element
    // itself — a capture listener on the window runs long before React sees
    // the event — so the test belongs here.
    const onDown = (event) => {
      if (!menu.current?.contains(event.target)) onClose()
    }

    // Capture, so the menu closes even when something below stops the event.
    window.addEventListener('mousedown', onDown, true)
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('mousedown', onDown, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('blur', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      ref={menu}
      className="context-menu"
      style={{ left: position.left, top: position.top }}
      role="menu"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          className="context-menu-item"
          onClick={() => { onClose(); item.onSelect() }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
