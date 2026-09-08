/**
 * Getting a rendered image out of the app and into a document.
 *
 * Copying is the useful one — paste straight into a report or a chat — but it
 * needs a secure context and a browser with the async clipboard, so every
 * caller has to be able to fall back to a download.
 */
import { downloadBlob } from './download'

export async function copyImageToClipboard(blob) {
  const ClipboardItem = window.ClipboardItem
  if (!navigator.clipboard?.write || typeof ClipboardItem !== 'function') return false

  try {
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
    return true
  } catch {
    // Denied permission, no focus, or an unsupported type. The caller offers
    // the download instead rather than leaving the child with nothing.
    return false
  }
}

export function saveImage(blob, filename) {
  downloadBlob(blob, filename)
}
