/**
 * The smallest possible zip writer, for "download my whole project".
 *
 * Entries are stored, not compressed: a project is a few text files and a few
 * small PNGs (which are compressed already), so deflate would save almost
 * nothing and cost a dependency. Names are marked UTF-8.
 */

const TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) crc = TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * @param {{ name: string, data: Uint8Array }[]} entries
 * @returns {Blob}
 */
export function makeZip(entries) {
  const encoder = new TextEncoder()
  const parts = []
  const central = []
  let offset = 0

  // 1 January 2026 00:00 in DOS time. The date is not worth the bytes of caring.
  const dosTime = 0
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1

  for (const entry of entries) {
    const name = encoder.encode(entry.name)
    const crc = crc32(entry.data)
    const size = entry.data.length

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true)          // UTF-8 names
    local.setUint16(8, 0, true)               // stored
    local.setUint16(10, dosTime, true)
    local.setUint16(12, dosDate, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, size, true)
    local.setUint32(22, size, true)
    local.setUint16(26, name.length, true)
    local.setUint16(28, 0, true)

    parts.push(local.buffer, name, entry.data)

    const header = new DataView(new ArrayBuffer(46))
    header.setUint32(0, 0x02014b50, true)
    header.setUint16(4, 20, true)
    header.setUint16(6, 20, true)
    header.setUint16(8, 0x0800, true)
    header.setUint16(10, 0, true)
    header.setUint16(12, dosTime, true)
    header.setUint16(14, dosDate, true)
    header.setUint32(16, crc, true)
    header.setUint32(20, size, true)
    header.setUint32(24, size, true)
    header.setUint16(28, name.length, true)
    header.setUint32(42, offset, true)

    central.push(header.buffer, name)
    offset += 30 + name.length + size
  }

  const centralSize = central.reduce((total, part) => total + (part.byteLength ?? part.length), 0)

  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, entries.length, true)
  end.setUint16(10, entries.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' })
}
