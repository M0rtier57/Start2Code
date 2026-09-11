/**
 * Turns Python source into a PNG that looks like the editor it came from.
 *
 * Drawn straight onto a canvas rather than screenshotting the DOM: Monaco only
 * renders the lines you can see, so anything scrolled out of view would be
 * missing from a picture of the editor.
 */
import {
  HEADER_HEIGHT, PADDING, THEME,
  createCanvas, drawWindow, loadFont, measuringContext, toPngBlob
} from './imageCanvas'

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

  await loadFont(fontSize)

  const tokenLines = safeTokenize(monaco, text, language)
  const lineHeight = Math.round(fontSize * 1.6)

  const ruler = measuringContext(fontSize)
  const lastNumber = String(firstLine + lines.length - 1)
  const gutter = showLineNumbers ? ruler.measureText(lastNumber).width + 18 : 0
  const widest = lines.reduce((max, line) => Math.max(max, ruler.measureText(line || ' ').width), 0)

  const headerHeight = title ? HEADER_HEIGHT : 0
  const width = Math.ceil(PADDING * 2 + gutter + widest)
  const height = Math.ceil(headerHeight + PADDING * 2 + lines.length * lineHeight)

  const { canvas, ctx } = createCanvas(width, height, scale, fontSize)
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

  return toPngBlob(canvas)
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
