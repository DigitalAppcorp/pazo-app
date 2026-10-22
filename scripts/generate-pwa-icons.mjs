// Generate PAZO beta install icons from the existing IconPaw silhouette, using
// only Node standard libraries. No external image runtime and no paid assets.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const crcTable = Array.from({ length: 256 }, (_, i) => {
  let c = i
  for (let j = 0; j < 8; j++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
  return c >>> 0
})
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data])
  let crc = 0xffffffff
  for (const b of body) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const tail = Buffer.alloc(4)
  tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0)
  return Buffer.concat([length, body, tail])
}
function ellipse(x, y, cx, cy, rx, ry) {
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
}
function containsPaw(x, y) {
  return ellipse(x,y,0.38,0.32,0.048,0.07)
    || ellipse(x,y,0.49,0.27,0.049,0.075)
    || ellipse(x,y,0.61,0.31,0.048,0.07)
    || ellipse(x,y,0.71,0.41,0.044,0.062)
    || ellipse(x,y,0.52,0.59,0.19,0.139)
}
function icon(size, maskable = false) {
  const raw = Buffer.alloc(size * (1 + size * 4))
  const pad = maskable ? 0.19 : 0.10
  const scale = 1 - 2 * pad
  for (let py = 0; py < size; py++) {
    const row = py * (1 + size * 4)
    for (let px = 0; px < size; px++) {
      let coverage = 0
      for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) {
        const x = (((px + (xx + .5) / 2) / size) - pad) / scale
        const y = (((py + (yy + .5) / 2) / size) - pad) / scale
        if (containsPaw(x,y)) coverage++
      }
      const t = coverage / 4
      const pos = row + 1 + px * 4
      raw[pos] = Math.round(32 * (1-t) + 225 * t)
      raw[pos+1] = Math.round(78 * (1-t) + 229 * t)
      raw[pos+2] = Math.round(74 * (1-t) + 63 * t)
      raw[pos+3] = 255
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // RGBA
  header[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
for (const [file, size, maskable] of [
  ['public/pwa-icon-192.png', 192, false],
  ['public/pwa-icon-512.png', 512, false],
  ['public/pwa-icon-maskable-512.png', 512, true],
  ['public/apple-touch-icon.png', 180, false],
]) {
  writeFileSync(file, icon(size, maskable))
}
console.log('PAZO PWA icons: generated 192, 512, maskable and Apple touch icons')
