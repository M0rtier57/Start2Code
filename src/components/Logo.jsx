import { useState } from 'react'

/**
 * The Start2Code logo.
 *
 * The image lives in public/ rather than src/assets/ so it is referenced by URL
 * instead of a bundler import — a missing file then degrades to the fallback
 * mark below instead of breaking the build.
 *
 * Drop your file in as `public/logo.svg` (preferred — it stays sharp at every
 * size) or `public/logo.png`. Both are tried, in that order.
 */
const SOURCES = ['/logo.svg', '/logo.png']

export default function Logo({ size = 30 }) {
  const [attempt, setAttempt] = useState(0)

  // Every candidate failed: fall back to the wordmark so the header is never
  // left with a broken image.
  if (attempt >= SOURCES.length) {
    return <span className="logo-mark" style={{ width: size, height: size }}>&lt;/&gt;</span>
  }

  return (
    <img
      src={SOURCES[attempt]}
      onError={() => setAttempt((n) => n + 1)}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ display: 'block', objectFit: 'contain', flexShrink: 0 }}
    />
  )
}
