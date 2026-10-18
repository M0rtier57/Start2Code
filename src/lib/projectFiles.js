/**
 * The shape of a Python project's files.
 *
 * A project has one main file, which is what Run starts and which is stored in
 * projects.code as it always has been, and up to MAX_FILES extra .py files that
 * the main one can import:
 *
 *     # functies.py                      # main.py
 *     def teken_speler(...): ...         from functies import *
 *                                        teken_speler(...)
 */

export const MAIN_FILE = 'main.py'
export const MAX_FILES = 20
export const MAX_ASSETS = 40

/**
 * Names a file must not take. Python looks in the project's own folder before
 * it looks anywhere else, so a file called random.py would quietly replace the
 * random module for the whole program, and the error would be about random, not
 * about the file that caused it.
 */
const RESERVED = new Set([
  'pygame', 'random', 'math', 'time', 'os', 'sys', 'json', 'asyncio', 're', 'string',
  'turtle', 'collections', 'itertools', 'datetime', 'builtins', 'traceback', 'ast',
  'io', 'copy', 'typing', 'pyodide', 'pyscript', 'main', 'test', 'types', 'enum'
])

/** What a child typed, as a file name: "Functies" -> "functies.py". */
export function normalizeFileName(raw) {
  const trimmed = String(raw ?? '').trim()
  return /\.py$/i.test(trimmed) ? trimmed : `${trimmed}.py`
}

/**
 * @returns {null | string} null when fine, otherwise the i18n key that says why
 */
export function fileNameProblem(name, existing) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*\.py$/.test(name)) return 'file.badName'
  if (RESERVED.has(name.replace(/\.py$/i, '').toLowerCase())) return 'file.reserved'
  if (existing.some((file) => file.name.toLowerCase() === name.toLowerCase())) return 'file.exists'
  if (existing.length >= MAX_FILES) return 'file.tooMany'
  return null
}

/** Everything that can be imported, for deciding whether pygame is involved. */
export function allSource(main, extras) {
  return [main, ...extras.map((file) => file.content)].join('\n')
}

/** A file name for an uploaded picture: safe, lowercase, always .png. */
export function spriteFileName(original, taken) {
  const base = String(original ?? 'sprite')
    .replace(/\.[^.]+$/, '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'sprite'

  const used = new Set(taken.map((name) => name.toLowerCase()))
  let name = `${base}.png`
  for (let n = 2; used.has(name); n += 1) name = `${base}${n}.png`
  return name
}
