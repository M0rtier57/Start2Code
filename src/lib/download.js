/** Browser download helpers — kids need to be able to take work home. */

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function downloadText(text, filename, type = 'text/plain') {
  downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), filename)
}

export function downloadJson(value, filename) {
  downloadText(JSON.stringify(value, null, 2), filename, 'application/json')
}

/** Turns a project title into something safe to use as a file name. */
export function toFilename(title, extension) {
  const base = (title || 'project')
    .trim()
    .replace(/[^a-z0-9\- _]/gi, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'project'
  return `${base}.${extension}`
}

export function pickFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.click()
  })
}
