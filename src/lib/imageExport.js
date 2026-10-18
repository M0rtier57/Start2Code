/**
 * Getting a rendered image out of the app and into a document.
 *
 * Copying is the useful one — paste straight into a report or a chat — but
 * browsers guard the clipboard, so this tries two ways before giving up and the
 * caller offers a download.
 *
 * Both depend on being started while the click that asked for it is still
 * fresh. That is why the picture is passed in as a *promise*: the write begins
 * at once, inside the click, and the picture arrives while it is under way.
 * Drawing the picture first and writing afterwards looks the same but is not —
 * Safari refuses it outright, and other browsers can too once the click is a
 * few awaits in the past.
 */
import { downloadBlob } from './download'

/**
 * @param {Blob | Promise<Blob>} picture a PNG, or a promise for one
 * @returns {Promise<boolean>} true when it is on the clipboard
 */
export async function copyImageToClipboard(picture) {
  const ClipboardItem = window.ClipboardItem

  // 1. The async clipboard, with the picture still to come.
  if (navigator.clipboard?.write && typeof ClipboardItem === 'function') {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': Promise.resolve(picture) })])
      return true
    } catch (error) {
      // Denied, not focused, or an unsupported type. Worth knowing which when
      // someone says "it downloads instead of copying".
      console.warn('The clipboard refused the image:', error?.name, error?.message)
    }
  }

  // 2. The old way: put the picture on the page, select it, and ask the browser
  //    to copy the selection. Works where the async clipboard is missing or
  //    blocked, as long as it still counts as the result of a click.
  try {
    return legacyCopy(await blobToDataUrl(await picture))
  } catch {
    return false
  }
}

export function saveImage(blob, filename) {
  downloadBlob(blob, filename)
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function legacyCopy(dataUrl) {
  const box = document.createElement('div')
  box.contentEditable = 'true'
  box.setAttribute('aria-hidden', 'true')
  box.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none'

  const image = document.createElement('img')
  image.src = dataUrl
  box.appendChild(image)
  document.body.appendChild(box)

  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNode(image)
  selection.removeAllRanges()
  selection.addRange(range)

  let copied
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }

  selection.removeAllRanges()
  box.remove()
  return copied
}
