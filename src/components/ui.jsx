import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/* ------------------------------------------------------------------ toasts */

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, tone = 'default') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((current) => [...current, { id, message, tone }])
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 3600)
  }, [])

  const value = useMemo(() => ({
    toast: push,
    success: (message) => push(message, 'ok'),
    error: (message) => push(message, 'error')
  }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone === 'ok' ? 'toast-ok' : ''} ${t.tone === 'error' ? 'toast-error' : ''}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext) ?? { toast: () => {}, success: () => {}, error: () => {} }
}

/* ------------------------------------------------------------------- modal */

export function Modal({ title, children, onClose, wide = false, footer = null }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="row-between mt-0">
          <h2>{title}</h2>
          <button className="btn btn-quiet btn-sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="mt-4">{children}</div>
        {footer && <div className="row mt-4" style={{ justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ pieces */

export function Spinner({ large = false }) {
  return <div className={`spinner ${large ? 'spinner-lg' : ''}`} />
}

export function LoadingScreen({ label = 'Loading…' }) {
  return (
    <div className="loading-screen">
      <Spinner large />
      <p className="muted">{label}</p>
    </div>
  )
}

export function Empty({ emoji = '📭', title, children, action = null }) {
  return (
    <div className="empty">
      <span className="emoji">{emoji}</span>
      <h3>{title}</h3>
      {children && <p className="small mt-2">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ProgressBar({ value, total, tone = '' }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className={`bar ${tone === 'ok' ? 'bar-ok' : ''}`} title={`${value} of ${total}`}>
      <i style={{ width: `${percent}%` }} />
    </div>
  )
}

export function Avatar({ name }) {
  const initials = (name || '?')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
  return <div className="avatar" aria-hidden="true">{initials || '?'}</div>
}

export function KindBadge({ kind }) {
  return kind === 'scratch'
    ? <span className="badge badge-scratch">🧩 Scratch</span>
    : <span className="badge badge-python">🐍 Python</span>
}

/** "3 minutes ago" — teachers scan these, exact timestamps are noise. */
export function timeAgo(value) {
  if (!value) return 'never'
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(value).toLocaleDateString()
}
