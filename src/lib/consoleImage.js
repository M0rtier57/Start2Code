/**
 * Turns what the console printed into a PNG.
 *
 * Same reason as the code export: the console scrolls, so a photo of the screen
 * only ever catches the tail of a run. This draws the whole thing.
 */
import {
  HEADER_HEIGHT, PADDING, THEME,
  createCanvas, drawWindow, loadFont, measuringContext, toPngBlob
} from './imageCanvas'

/** Matches `.console-out` and its two stream classes in index.css. */
const STREAM_COLOURS = {
  out: '#d7dce6',
  err: '#ff8787',
  sys: '#74c0fc'
}

/** Long output is wrapped rather than allowed to run off into a huge image. */
const MAX_COLUMNS = 100

/** And a very long run is cut from the front, where the least interesting part is. */
const MAX_LINES = 500

/**
 * @param entries  the console's own [{ stream, text }] list
 * @param title    shown in the window bar; omit for no bar
 * @returns {Promise<Blob>} a PNG
 */
export async function renderConsoleImage({ entries, title = '', fontSize = 14, scale = 2 }) {
  await loadFont(fontSize)

  let lines = wrap(toLines(entries), MAX_COLUMNS)
  const dropped = Math.max(0, lines.length - MAX_LINES)
  if (dropped) {
    lines = lines.slice(dropped)
    lines.unshift([{ text: `… ${dropped} earlier line(s) not shown`, colour: THEME.gutter }])
  }
  if (!lines.length) lines = [[{ text: '(no output)', colour: THEME.gutter }]]

  const lineHeight = Math.round(fontSize * 1.55)
  const ruler = measuringContext(fontSize)
  const widest = lines.reduce((max, line) => Math.max(max, ruler.measureText(plain(line) || ' ').width), 0)

  const headerHeight = title ? HEADER_HEIGHT : 0
  const width = Math.ceil(PADDING * 2 + widest)
  const height = Math.ceil(headerHeight + PADDING * 2 + lines.length * lineHeight)

  const { canvas, ctx } = createCanvas(width, height, scale, fontSize)
  drawWindow(ctx, { width, height, title, fontSize })

  const top = headerHeight + PADDING
  lines.forEach((line, index) => {
    let x = PADDING
    const y = top + index * lineHeight + lineHeight / 2

    line.forEach((run) => {
      ctx.fillStyle = run.colour
      ctx.fillText(run.text, x, y)
      x += ctx.measureText(run.text).width
    })
  })

  return toPngBlob(canvas)
}

/* ------------------------------------------------------------------ shaping */

/**
 * The console stores many small writes — `print` emits the text and its newline
 * separately — so a line is stitched together from however many coloured runs
 * happen to land on it.
 */
function toLines(entries) {
  const lines = [[]]

  ;(entries ?? []).forEach((entry) => {
    const colour = STREAM_COLOURS[entry.stream] ?? STREAM_COLOURS.out
    const pieces = String(entry.text ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')

    pieces.forEach((piece, index) => {
      if (index) lines.push([])
      if (piece) lines[lines.length - 1].push({ text: piece, colour })
    })
  })

  // A trailing newline leaves an empty line that was never really printed.
  while (lines.length && !lines[lines.length - 1].length) lines.pop()
  return lines
}

/** Hard-wraps at a column count; monospace, so counting characters is enough. */
function wrap(lines, columns) {
  const wrapped = []

  lines.forEach((line) => {
    let current = []
    let used = 0

    line.forEach((run) => {
      let rest = run.text
      while (used + rest.length > columns) {
        const room = columns - used
        if (room > 0) current.push({ text: rest.slice(0, room), colour: run.colour })
        wrapped.push(current)
        current = []
        used = 0
        rest = rest.slice(room)
      }
      if (rest) { current.push({ text: rest, colour: run.colour }); used += rest.length }
    })

    wrapped.push(current)
  })

  return wrapped
}

function plain(line) {
  return line.map((run) => run.text).join('')
}
