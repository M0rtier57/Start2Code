/**
 * The sprites that ship with the site, for a child who wants to start playing
 * rather than start drawing.
 *
 * They were drawn for Start2Code, so there is no outside licence to carry, and
 * they live in public/sprites as plain PNGs: the editor fetches them from the
 * site itself and nothing about a child is involved.
 *
 * `id` doubles as the file a program loads: pygame.image.load("ster.png").
 */
export const librarySprites = [
  { id: 'ruimteschip', nl: 'Ruimteschip', en: 'Spaceship' },
  { id: 'buitenaards', nl: 'Buitenaards wezen', en: 'Alien' },
  { id: 'robot', nl: 'Robot', en: 'Robot' },
  { id: 'ster', nl: 'Ster', en: 'Star' },
  { id: 'hart', nl: 'Hart', en: 'Heart' },
  { id: 'munt', nl: 'Munt', en: 'Coin' },
  { id: 'bal', nl: 'Bal', en: 'Ball' },
  { id: 'appel', nl: 'Appel', en: 'Apple' },
  { id: 'boom', nl: 'Boom', en: 'Tree' },
  { id: 'wolk', nl: 'Wolk', en: 'Cloud' },
  { id: 'auto', nl: 'Auto', en: 'Car' },
  { id: 'sleutel', nl: 'Sleutel', en: 'Key' }
].map((sprite) => ({ ...sprite, file: `${sprite.id}.png`, url: `/sprites/${sprite.id}.png` }))
