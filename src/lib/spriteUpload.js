/**
 * Preparing a picture a child chose, before it goes anywhere.
 *
 * Every upload is decoded and drawn again, never stored as it came. That does
 * three things at once:
 *   - it proves the file is really a picture, instead of trusting its name;
 *   - it throws away everything that is not pixels. A photo from a phone carries
 *     the GPS position it was taken at, and a child should not be able to
 *     publish their street to their teacher by dragging in a snapshot;
 *   - it keeps the size sensible, so a project cannot turn into a 12 MB photo.
 *
 * Errors are thrown as i18n keys, which the caller translates.
 */

const ACCEPTED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

/** What may be dragged in. Re-encoding shrinks it, so this can be generous. */
export const MAX_SOURCE_BYTES = 8 * 1024 * 1024

/** The longest side a sprite keeps. A full-screen background fits; a poster does not. */
const MAX_SIDE = 1280

/** What is stored, after re-encoding. */
export const MAX_STORED_BYTES = 1024 * 1024

export const ACCEPT_ATTRIBUTE = ACCEPTED.join(',')

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

async function isPng(blob) {
  const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer())
  return PNG_SIGNATURE.every((byte, index) => head[index] === byte)
}

/**
 * Whatever came back, as a real PNG.
 *
 * pygame reads PNG and not WebP, and a sprite is saved to the program as
 * "something.png". The bytes have to match the name — and on a host that
 * "optimises" images they do not always: Hostinger's CDN answers a request that
 * says it can read WebP with a WebP copy of the PNG, under the same address and
 * without telling a cache the answer varies. A page that has shown the picture
 * has therefore already cached the WebP, and a later fetch of the same address
 * gets it back, still called .png.
 *
 * So the bytes are looked at rather than trusted. A PNG goes through untouched;
 * anything else the browser can draw is drawn and saved again as a PNG; and
 * anything it cannot read at all is an error, said plainly.
 */
export async function ensurePng(blob) {
  if (await isPng(blob)) return blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' })

  let bitmap
  try {
    bitmap = await createImageBitmap(blob)
  } catch {
    throw new Error('sprite.notImage')
  }

  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d').drawImage(bitmap, 0, 0)
    const png = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!png) throw new Error('sprite.notImage')
    return png
  } finally {
    bitmap.close?.()
  }
}

/**
 * @returns {Promise<{ blob: Blob, width: number, height: number }>} a PNG
 */
export async function prepareSprite(file) {
  if (!file || !ACCEPTED.includes(file.type)) throw new Error('sprite.notImage')
  if (file.size > MAX_SOURCE_BYTES) throw new Error('sprite.tooBig')

  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('sprite.notImage')
  }

  try {
    let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))

    // Shrink until it fits. A photo of a busy scene can still be over the limit
    // at full size once it is PNG; a few passes get it under.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (blob && blob.size <= MAX_STORED_BYTES) return { blob, width, height }

      scale *= 0.75
    }
    throw new Error('sprite.tooBig')
  } finally {
    bitmap.close?.()
  }
}
