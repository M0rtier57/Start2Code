/**
 * The shared look of everything Start2Code exports as a picture.
 *
 * Code, console output and the stage all come out as the same dark window with
 * a title bar, so a child can paste three of them into one report and have it
 * look like one thing rather than three screenshots from three moods.
 */

export const FONT_STACK = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace'

/** The app's dark palette, so an exported image matches the site. */
export const THEME = {
  background: '#1e222b',
  border: '#2a2f3a',
  header: '#171a21',
  title: '#8b93a7',
  gutter: '#5a6172',
  text: '#e6e9ef'
}

export const PADDING = 22
export const RADIUS = 12
export const HEADER_HEIGHT = 40

/**
 * A canvas sized in CSS pixels but backed at `scale` times that, so the image
 * still looks sharp when it is pasted into a document and zoomed.
 */
export function createCanvas(width, height, scale, fontSize) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * scale)
  canvas.height = Math.ceil(height * scale)

  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  // Sizing a canvas resets its state, so the font is set after, not before.
  ctx.font = `${fontSize}px ${FONT_STACK}`
  ctx.textBaseline = 'middle'

  return { canvas, ctx }
}

/** The window itself: rounded panel, title bar with the three dots, border. */
export function drawWindow(ctx, { width, height, title, fontSize }) {
  roundedRect(ctx, 0.5, 0.5, width - 1, height - 1, RADIUS)
  ctx.fillStyle = THEME.background
  ctx.fill()

  if (title) {
    // The bar is clipped to the rounded panel, so the window's corners are not
    // cut square by it.
    ctx.save()
    roundedRect(ctx, 0.5, 0.5, width - 1, height - 1, RADIUS)
    ctx.clip()
    ctx.fillStyle = THEME.header
    ctx.fillRect(0, 0, width, HEADER_HEIGHT)
    ctx.restore()

    ctx.strokeStyle = THEME.border
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, HEADER_HEIGHT + 0.5)
    ctx.lineTo(width, HEADER_HEIGHT + 0.5)
    ctx.stroke()

    // The three dots read as "this is a window" at a glance.
    ;['#ff5f57', '#febc2e', '#28c840'].forEach((colour, index) => {
      ctx.beginPath()
      ctx.arc(PADDING + index * 16, HEADER_HEIGHT / 2, 5, 0, Math.PI * 2)
      ctx.fillStyle = colour
      ctx.fill()
    })

    ctx.fillStyle = THEME.title
    ctx.font = `${fontSize - 2}px ${FONT_STACK}`
    ctx.fillText(title, PADDING + 60, HEADER_HEIGHT / 2)
    ctx.font = `${fontSize}px ${FONT_STACK}`
  }

  roundedRect(ctx, 0.5, 0.5, width - 1, height - 1, RADIUS)
  ctx.strokeStyle = THEME.border
  ctx.lineWidth = 1
  ctx.stroke()
}

export function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

/** A context only used for measuring, so nothing half-drawn is ever sized from. */
export function measuringContext(fontSize) {
  const ctx = document.createElement('canvas').getContext('2d')
  ctx.font = `${fontSize}px ${FONT_STACK}`
  return ctx
}

export function toPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be created.'))),
      'image/png'
    )
  })
}

/**
 * Canvas does not wait for a web font the way the page does, so without this
 * the first export can come out in the fallback face.
 */
export async function loadFont(fontSize) {
  try {
    await document.fonts?.load(`${fontSize}px "JetBrains Mono"`)
  } catch {
    // No font loading API, or the web font never arrived; the stack falls
    // through to a monospace face that is already there.
  }
}

/** A data: URL — what a canvas in another frame hands back — as a real blob. */
export function dataUrlToBlob(dataUrl) {
  const [header, encoded] = String(dataUrl).split(',')
  const type = /:(.*?);/.exec(header)?.[1] ?? 'image/png'
  const binary = atob(encoded)

  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)

  return new Blob([bytes], { type })
}
