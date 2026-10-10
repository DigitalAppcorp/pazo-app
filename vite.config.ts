import { execFileSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The splash label identifies the actual source revision used to start Vite.
// CI supplies VITE_APP_RELEASE; local Antigravity uses the Git checkout.
// An uncommitted tracked change is marked "modificado" to avoid a false PASS.
const git = (args: string[]): string | null => {
  try {
    return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

const fromCI = process.env.VITE_APP_RELEASE?.trim()
const commit = fromCI && /^[a-f\d]{7,40}$/i.test(fromCI)
  ? fromCI.slice(0, 8)
  : git(['rev-parse', '--short=8', 'HEAD']) ?? 'desconocida'
const modified = Boolean(git(['status', '--porcelain', '--untracked-files=no']))
const version = modified ? `${commit} · modificado` : commit

export default defineConfig({
  plugins: [react()],
  define: {
    __PAZO_BUILD_VERSION__: JSON.stringify(version),
  },
})
