import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const textExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.mjs', '.webmanifest'])
const symbols = /[\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u20E3]/u
const defects = []

function inspect(path) {
  for (const entry of readdirSync(path)) {
    const full = join(path, entry)
    if (statSync(full).isDirectory()) {
      inspect(full)
    } else if (textExt.has(extname(full))) {
      const source = readFileSync(full, 'utf8')
      const lines = source.split(/\r?\n/)
      for (let i = 0; i < lines.length; i++) {
        if (symbols.test(lines[i])) defects.push(`${relative(root, full)}:${i + 1}`)
      }
    }
  }
}

inspect(join(root, 'src'))
inspect(join(root, 'public'))
const html = readFileSync(join(root, 'index.html'), 'utf8')
if (symbols.test(html)) defects.push('index.html')

if (defects.length) {
  console.error('PAZO authored UI contains emoji/pictographs:', defects.join(', '))
  process.exitCode = 1
} else {
  console.log('PAZO authored UI emoji invariant PASS (src, public, index.html).')
}
// This check protects app-authored text, not user-generated content.
