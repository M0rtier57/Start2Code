/**
 * Fetch the two typefaces into public/fonts, so the site never asks Google for
 * them while a child is looking at it.
 *
 * Loading a font from fonts.gstatic.com sends every visitor's IP address to a
 * third country before they have clicked anything. For a site used by primary
 * school children that is not a trade worth making, and it is avoidable: both
 * Inter and JetBrains Mono are under the SIL Open Font License, which allows
 * hosting them yourself.
 *
 * Run once, and again only when you want newer versions:
 *
 *     npm run fonts
 *
 * The files it writes are in .gitignore by default — decide for yourself
 * whether to commit them. Committing means a fresh clone builds without the
 * network; not committing means this has to run on the build machine.
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const OUT = path.join(process.cwd(), 'public', 'fonts')

/** What the stylesheet in index.html expects to find. */
const FAMILIES = [
  { css: 'Inter:wght@400;500;600;700;800', file: 'inter' },
  { css: 'JetBrains+Mono:wght@400;500', file: 'jetbrains-mono' }
]

// Google serves woff2 only to browsers that say they can read it.
const MODERN_BROWSER =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'

async function main() {
  await fs.mkdir(OUT, { recursive: true })

  let stylesheet = [
    '/* Written by scripts/fetch-fonts.mjs — do not edit by hand. */',
    '/* Inter and JetBrains Mono, SIL Open Font License 1.1, see OFL.txt. */',
    ''
  ].join('\n')

  for (const family of FAMILIES) {
    const url = `https://fonts.googleapis.com/css2?family=${family.css}&display=swap`
    const css = await (await fetch(url, { headers: { 'User-Agent': MODERN_BROWSER } })).text()

    // Each @font-face block names one file; rewrite it to point at ours.
    let index = 0
    const rewritten = await replaceAsync(css, /url\((https:\/\/[^)]+\.woff2)\)/g, async (_, remote) => {
      const name = `${family.file}-${index++}.woff2`
      const bytes = Buffer.from(await (await fetch(remote)).arrayBuffer())
      await fs.writeFile(path.join(OUT, name), bytes)
      console.log(`  ${name}  ${(bytes.length / 1024).toFixed(0)} kB`)
      return `url(/fonts/${name})`
    })

    stylesheet += rewritten + '\n'
  }

  await fs.writeFile(path.join(OUT, 'fonts.css'), stylesheet)

  // The licence has to travel with the fonts; that is the one condition the OFL
  // makes. Fetched from the source rather than pasted from memory.
  const ofl = await (await fetch(
    'https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt'
  )).text()
  await fs.writeFile(path.join(OUT, 'OFL.txt'), ofl)

  console.log('\nFonts written to public/fonts. Nothing is fetched from Google any more.')
}

/** String.replace, but the replacement may await. */
async function replaceAsync(input, pattern, replacer) {
  const replacements = []
  input.replace(pattern, (...args) => { replacements.push(replacer(...args)); return '' })
  const done = await Promise.all(replacements)
  return input.replace(pattern, () => done.shift())
}

main().catch((error) => {
  console.error('Could not fetch the fonts:', error.message)
  console.error('The site still works — it falls back to the system typeface.')
  process.exit(1)
})
