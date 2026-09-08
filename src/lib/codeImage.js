/**
 * Turns Python source into a PNG that looks like the editor it came from.
 *
 * Drawn straight onto a canvas rather than screenshotting the DOM: Monaco only
 * renders the lines you can see, so anything scrolled out of view would be
 * missing from a picture of the editor.
 */

const FONT_STACK = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace'

/** The app's dark palette, so an exported image matches the site. */
const THEME = {
  background: '#1e222b',
  border: '#2a2f3a',
  header: '#171a21',
  title: '#8b93a7',
  gutter: '#5a6172',
  text: '#e6e9ef'
}

/**
 * Monaco hands back token types like `string.escape.python`; only the first
 * part decides the colour. Anything unlisted is plain text, which is what the
 * editor does with an identifier too.
 */
const TOKEN_COLOURS = {
  comment: '#7d9a68',
  string: '#e0a072',
  number: '#a5d6a7',
  keyword: '#6aa9f4',
  type: '#4ec9b0',
  constant: '#6aa9f4',
  tag: '#6aa9f4'
}

const PADDING = 22
const RADIUS = 12
const HEADER_HEIGHT = 40

/**
 * @param monaco      the monaco namespace, for its tokenizer
 * @param code        the text to draw
 * @param title       shown in the window bar; omit for no bar
 * @param firstLine   the line number the first line had in the real file
 * @param scale       pixel density — 2 keeps it sharp when pasted and zoomed
 * @returns {Promise<Blob>} a PNG
 */
export async function renderCodeImage(monaco, {
  code,
  language = 'python',
  title = '',
  firstLine = 1,
  showLineNumbers = true,
  fontSize = 15,
  scale = 2
}) {
  const text = code.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').replace(/\s+$/, '')
  const lines = text.split('\n')

  // Without this the first export can be drawn in the fallback font, because
  // canvas does not wait for a web font the way the page does.
  await loadFont(fontSize)

  const tokenLines = safeTokenize(monaco, text, language)
  const lineHeight = Math.round(fontSize * 1.6)

  // A throwaway context, only to measure — the real one is sized from these.
  const ruler = document.createElement('canvas').getContext('2d')
  ruler.font = `${fontSize}px ${FONT_STACK}`

  const lastNumber = String(firstLine + lines.length - 1)
  const gutter = showLineNumbers ? ruler.measureText(lastNumber).width + 18 : 0
  const widest = lines.reduce((max, line) => Math.max(max, ruler.measureText(line || ' ').width), 0)

  const headerHeight = title ? HEADER_HEIGHT : 0
  const width = Math.ceil(PADDING * 2 + gutter + widest)
  const height = Math.ceil(headerHeight + PADDING * 2 + lines.length * lineHeight)

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(width * scale)
  canvas.height = Math.ceil(height * scale)

  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  // Sizing a canvas resets its state, so the font is set after, not before.
  ctx.font = `${fontSize}px ${FONT_STACK}`
  ctx.textBaseline = 'middle'

  drawWindow(ctx, { width, height, title, fontSize })

  const top = headerHeight + PADDING
  lines.forEach((line, index) => {
    const y = top + index * lineHeight + lineHeight / 2

    if (showLineNumbers) {
      ctx.fillStyle = THEME.gutter
      ctx.textAlign = 'right'
      ctx.fillText(String(firstLine + index), PADDING + gutter - 18, y)
      ctx.textAlign = 'left'
    }

    drawTokens(ctx, line, tokenLines[index], PADDING + gutter, y)
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be created.'))),
      'image/png'
    )
  })
}

/* ------------------------------------------------------------------ drawing */

function drawWindow(ctx, { width, height, title, fontSize }) {
  roundedRect(ctx, 0.5, 0.5, width - 1, height - 1, RADIUS)
  ctx.fillStyle = THEME.background
  ctx.fill()

  if (title) {
    // The bar is the panel colour clipped to the top corners, so the rounding
    // of the window is not cut square by it.
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

    // The three dots read as "this is a code window" at a glance.
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

function drawTokens(ctx, line, tokens, startX, y) {
  if (!line) return

  if (!tokens?.length) {
    ctx.fillStyle = THEME.text
    ctx.fillText(line, startX, y)
    return
  }

  let x = startX
  tokens.forEach((token, index) => {
    const end = index + 1 < tokens.length ? tokens[index + 1].offset : line.length
    const part = line.slice(token.offset, end)
    if (!part) return

    ctx.fillStyle = colourFor(token.type)
    ctx.fillText(part, x, y)
    x += ctx.measureText(part).width
  })
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

/* ------------------------------------------------------------------ helpers */

function colourFor(type) {
  return TOKEN_COLOURS[String(type ?? '').split('.')[0]] ?? THEME.text
}

function safeTokenize(monaco, text, language) {
  try {
    return monaco.editor.tokenize(text, language)
  } catch {
    // Worst case the image is monochrome, which still beats no image at all.
    return []
  }
}

async function loadFont(fontSize) {
  try {
    await document.fonts?.load(`${fontSize}px "JetBrains Mono"`)
  } catch {
    // No font loading API, or the web font never arrived; the stack falls
    // through to a monospace face that is already there.
  }
}
